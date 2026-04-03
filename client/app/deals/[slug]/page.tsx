import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeal, getDealFinancialPeriod } from "../../../api/deals";
import { getDealAssessment } from "../../../api/assessment";
import { captureDealSnapshot } from "../actions";
import RevenueRiskTooltip from "../../../components/revenue-risk-tooltip";
import DealCharts from "./deal-charts";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatNumber(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(value);
}

function toneForStatus(status: string) {
  if (
    status.includes("trigger") ||
    status === "overdue" ||
    status === "high" ||
    status === "oppose"
  ) {
    return "critical";
  }
  if (
    status.includes("lock") ||
    status.includes("watch") ||
    status.includes("concern") ||
    status.includes("enhanced") ||
    status === "medium" ||
    status === "under_review" ||
    status === "open" ||
    status === "support_with_conditions"
  ) {
    return "warning";
  }
  return "good";
}

function distributionTone(status: string) {
  if (status === "blocked") return "critical";
  if (status === "restricted" || status === "review_required") return "warning";
  return "good";
}

function metricValue(value?: number, suffix = "") {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return "—";
  }

  return `${formatNumber(value)}${suffix}`;
}

function firstSentence(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/^.*?[.!?](?:\s|$)/);
  return match ? match[0].trim() : trimmed;
}

export default async function DealPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    // Fetch deal (required), assessment and period (optional — may not exist for new deals)
    const deal = await getDeal(slug);
    const assessment = await getDealAssessment(slug).catch(() => null);
    const latestPeriod = await getDealFinancialPeriod(slug, "latest").catch(() => null);

    // Safe defaults for optional data
    const safeAssessment = assessment ?? {
      assessment: { summary: "No assessment available.", overallScore: "\u2014", escalationLevel: "\u2014", watchlistRecommendation: "not_assessed" },
      activeTrends: [],
    };
    const safeLatestPeriod = latestPeriod ?? {
      periodLabel: "No period data",
      reportedMetrics: {} as Record<string, any>,
      expectedMetrics: {} as Record<string, any>,
    };

    const overdueCount = (deal.obligations ?? []).filter((item: any) => item.status === "overdue").length;
    const latestDocument = (deal.documents ?? [])[0];
    const dscrHistoryPoint = (deal.history ?? [])[(deal.history ?? []).length - 1];
    const distribution = deal.distributionAssessment;
    const latestAmendment = (deal.amendmentHistory ?? [])[0] ?? null;
    const activeAmendmentCount = (deal.amendmentHistory ?? []).filter(
      (item: any) => item.amendmentStatus === "active"
    ).length;
    // Determine collateral ratio — pick whichever is available
    const collateralRatio = (() => {
      if (!latestPeriod) return null;
      const rm = safeLatestPeriod.reportedMetrics ?? {};
      const em = safeLatestPeriod.expectedMetrics ?? {};
      if (rm.ltv_npv != null) return { label: "LTV (NPV)", actualVal: rm.ltv_npv, baseVal: em.ltv_npv, suffix: "x" };
      if (rm.senior_net_debt_ebitda != null) return { label: "Net Debt / EBITDA", actualVal: rm.senior_net_debt_ebitda, baseVal: em.senior_net_debt_ebitda, suffix: "x" };
      if (rm.total_net_debt_ebitda != null) return { label: "Net Debt / EBITDA", actualVal: rm.total_net_debt_ebitda, baseVal: em.total_net_debt_ebitda, suffix: "x" };
      return null;
    })();

    const currentPeriodRows = [
      {
        label: "Senior DSCR",
        actual: metricValue(deal.covenant.currentValue, "x"),
        baseCase: metricValue(dscrHistoryPoint?.expectedDscr, "x"),
        lockup: metricValue(deal.covenant.thresholdLockup, "x"),
        defaultLevel: metricValue(deal.covenant.thresholdTrigger, "x"),
        tone: toneForStatus(deal.covenant.status)
      },
      {
        label: collateralRatio ? collateralRatio.label : "Collateral Ratio",
        actual: collateralRatio ? metricValue(collateralRatio.actualVal, collateralRatio.suffix) : "Not specified",
        baseCase: collateralRatio ? metricValue(collateralRatio.baseVal, collateralRatio.suffix) : "—",
        lockup: "—",
        defaultLevel: "—",
        tone: "neutral"
      },
      {
        label: "Revenue",
        actual: metricValue(safeLatestPeriod.reportedMetrics.revenue),
        baseCase: metricValue(safeLatestPeriod.expectedMetrics.revenue),
        lockup: "—",
        defaultLevel: "—",
        tone: "neutral"
      },
      {
        label: "EBITDA",
        actual: metricValue(safeLatestPeriod.reportedMetrics.ebitda),
        baseCase: metricValue(safeLatestPeriod.expectedMetrics.ebitda),
        lockup: "—",
        defaultLevel: "—",
        tone: "neutral"
      },
      {
        label: "CFADS",
        actual: metricValue(safeLatestPeriod.reportedMetrics.cfads),
        baseCase: metricValue(safeLatestPeriod.expectedMetrics.cfads),
        lockup: "—",
        defaultLevel: "—",
        tone: "neutral"
      },
      {
        label: "Leased Capacity",
        actual: metricValue(safeLatestPeriod.reportedMetrics.leasedCapacityPct, "%"),
        baseCase: metricValue(safeLatestPeriod.expectedMetrics.leasedCapacityPct, "%"),
        lockup: "—",
        defaultLevel: "—",
        tone: "neutral"
      },
      {
        label: "Construction Completion",
        actual: metricValue(
          safeLatestPeriod.reportedMetrics.constructionCompletionPct,
          "%"
        ),
        baseCase: metricValue(
          safeLatestPeriod.expectedMetrics.constructionCompletionPct,
          "%"
        ),
        lockup: "—",
        defaultLevel: "—",
        tone: "neutral"
      }
    ];

    return (
      <main className="shell">
        <section className="topsheet">
          <div className="topsheet-header">
            <div>
              <p className="eyebrow">Deal Summary</p>
              <h1>{deal.name}</h1>
              <p className="topsheet-subtitle">
                {deal.borrower} · {deal.dealType} · {deal.region}
              </p>
              <p className="meta-note">
                Viewer: {deal.viewer.displayName} · {deal.viewer.teamName}
              </p>
            </div>
            <div className="topsheet-actions">
              <Link className="button secondary" href="/portfolio">
                Back to Portfolio
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/topsheet`} style={{ fontWeight: 700, background: "var(--accent)", color: "white", border: "none" }}>
                View Full TopSheet
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/periods/latest`}>
                Period View
              </Link>
              <Link
                className="button secondary"
                href={`/deals/${deal.slug}/covenants/${deal.covenant.id}`}
              >
                Covenant Detail
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/distribution`}>
                Distribution
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/forecasts`}>
                Forecasts
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/amendments`}>
                Amendments
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/assessment`}>
                Assessment
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/calendar`}>
                Calendar
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/activity`}>
                Activity Timeline
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/reports`}>
                Reports
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/risk`}>
                Risk Register
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/requests`}>
                Borrower Requests
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/packs`}>
                Memo Packs
              </Link>
              <Link className="button secondary" href={`/deals/${deal.slug}/snapshots`}>
                Snapshot History
              </Link>
            </div>
          </div>

          <section className="panel topsheet-panel">
            <div className="topsheet-block">
              <div className="topsheet-block-heading">
                <p className="eyebrow">Deal Overview</p>
                <span className="meta-note">Investment: {deal.slug}</span>
              </div>
              <h2>{deal.name}</h2>
              <p className="detail-copy">{deal.summary}</p>
            </div>

            <div className="topsheet-description">
              <strong>Deal Description</strong>
              <p>{deal.dealOverview}</p>
            </div>

            <div className="topsheet-status-grid">
              <article className="topsheet-note">
                <strong>Deal Summary</strong>
                <dl className="topsheet-key-metrics">
                  <div>
                    <dt>Exposure</dt>
                    <dd>{formatMoney(deal.exposure)}</dd>
                  </div>
                  <div>
                    <dt>Facility amount</dt>
                    <dd>{formatMoney(deal.facilityAmount)}</dd>
                  </div>
                  <div>
                    <dt>Credit rating</dt>
                    <dd>{deal.internalCreditScore ?? deal.moodysRating ?? deal.spRating ?? deal.fitchRating ?? "\u2014"}</dd>
                  </div>
                  <div>
                    <dt>Current grade</dt>
                    <dd>{deal.grade}</dd>
                  </div>
                  <div>
                    <dt>Trend</dt>
                    <dd>{deal.performanceTrend ? deal.performanceTrend.replace(/_/g, " ") : "\u2014"}</dd>
                  </div>
                  <div>
                    <dt>Revenue risk</dt>
                    <dd><RevenueRiskTooltip code={deal.revenueRisk} /></dd>
                  </div>
                </dl>
              </article>

              <article className="topsheet-note topsheet-note-critical">
                <strong>Compliance Update</strong>
                <p>
                  {overdueCount > 0
                    ? `${overdueCount} overdue deliverable${
                        overdueCount > 1 ? "s" : ""
                      } requiring action.`
                    : "All currently scheduled deliverables are up to date."}
                </p>
                <span>
                  Latest package: {deal.latestPeriodLabel} · reported{" "}
                  {deal.latestReportedAt.slice(0, 10)}
                </span>
              </article>

              <article className="topsheet-note topsheet-note-info">
                <strong>Investment Update</strong>
                <p>{firstSentence(safeAssessment.assessment.summary)}</p>
                <span>
                  Active trends: {safeAssessment.activeTrends.length} · next test{" "}
                  {deal.nextTestDate}
                </span>
              </article>
            </div>

            <div className="topsheet-snapshot-grid">
              <article className="topsheet-card">
                <strong>Deal Snapshot</strong>
                <dl className="topsheet-definition-grid">
                  <div><dt>Borrower</dt><dd>{deal.borrower}</dd></div>
                  <div><dt>Sector</dt><dd>{deal.sector}</dd></div>
                  <div><dt>Region</dt><dd>{deal.region}</dd></div>
                  <div><dt>Currency</dt><dd>{deal.currency}</dd></div>
                  <div><dt>Project phase</dt><dd>{deal.phase}</dd></div>
                  <div><dt>Latest period</dt><dd>{deal.latestPeriodLabel}</dd></div>
                  <div><dt>Next test date</dt><dd>{deal.nextTestDate}</dd></div>
                  <div><dt>Primary covenant</dt><dd>{deal.covenant.name}</dd></div>
                  <div><dt>Distribution status</dt><dd>{distribution ? distribution.status.replaceAll("_", " ") : "not assessed"}</dd></div>
                  <div><dt>Active amendments</dt><dd>{activeAmendmentCount}</dd></div>
                  <div><dt>Monitoring case</dt><dd>{deal.forecastSummary?.activeMonitoringCaseName ?? "\u2014"}</dd></div>
                </dl>
              </article>
              <article className="topsheet-card">
                <strong>Risk Snapshot</strong>
                <dl className="topsheet-definition-grid">
                  <div><dt>Deal status</dt><dd>{deal.status}</dd></div>
                  <div><dt>Watchlist</dt><dd>{deal.watchlist ? "Active" : "Standard"}</dd></div>
                  <div><dt>Open risks</dt><dd>{deal.riskSnapshot.openCount}</dd></div>
                  <div><dt>High severity risks</dt><dd>{deal.riskSnapshot.highSeverityCount}</dd></div>
                  <div><dt>Overall score</dt><dd>{safeAssessment.assessment.overallScore}</dd></div>
                  <div><dt>Escalation level</dt><dd>{safeAssessment.assessment.escalationLevel}</dd></div>
                  <div><dt>Recommendation</dt><dd>{safeAssessment.assessment.watchlistRecommendation.replaceAll("_", " ")}</dd></div>
                  <div><dt>Grade override</dt><dd>{deal.activeGradeOverride ? `${deal.activeGradeOverride.overrideGrade} until ${deal.activeGradeOverride.expiresOn}` : "None"}</dd></div>
                  <div><dt>Active trends</dt><dd>{safeAssessment.activeTrends.length}</dd></div>
                  <div><dt>Latest document</dt><dd>{latestDocument ? latestDocument.documentName : "\u2014"}</dd></div>
                </dl>
              </article>
              <article className="topsheet-card">
                <div className="status-row">
                  <strong>Distribution Assessment</strong>
                  {distribution ? (
                    <span className={`badge ${distributionTone(distribution.status)}`}>
                      {distribution.status.replaceAll("_", " ")}
                    </span>
                  ) : null}
                </div>
                {distribution ? (
                  <>
                    <p>{distribution.summary}</p>
                    <dl className="topsheet-definition-grid">
                      <div><dt>Assessment period</dt><dd>{distribution.periodLabel}</dd></div>
                      <div><dt>Lock-up state</dt><dd>{distribution.lockupState.replaceAll("_", " ")}</dd></div>
                      <div><dt>Blockers</dt><dd>{distribution.blockerCount}</dd></div>
                      <div><dt>Permitted capacity</dt><dd>{distribution.distributionCapacity !== null ? formatMoney(distribution.distributionCapacity) : "\u2014"}</dd></div>
                    </dl>
                    {distribution.failedConditions[0] ? (
                      <p className="meta-note">Primary blocker: {distribution.failedConditions[0].label}</p>
                    ) : null}
                  </>
                ) : (
                  <p>No distribution assessment is available for this deal.</p>
                )}
              </article>
            </div>

            <div className="topsheet-two-column">

              <article className="topsheet-card">
                <strong>Key Metrics as at {deal.latestReportedAt ? deal.latestReportedAt.slice(0, 10) : deal.latestPeriodLabel}</strong>

                {/* Credit ratings */}
                {(deal.moodysRating || deal.spRating || deal.fitchRating || deal.internalCreditScore) && (
                  <dl className="topsheet-dl" style={{ marginBottom: 12 }}>
                    {deal.internalCreditScore && (
                      <div className="topsheet-dl-row">
                        <dt>Internal Rating</dt>
                        <dd><span className="badge good badge-sm">{deal.internalCreditScore}</span></dd>
                      </div>
                    )}
                    {deal.moodysRating && (
                      <div className="topsheet-dl-row">
                        <dt>Moody&apos;s</dt>
                        <dd>{deal.moodysRating}{deal.moodysOutlook ? ` (${deal.moodysOutlook})` : ""}</dd>
                      </div>
                    )}
                    {deal.spRating && (
                      <div className="topsheet-dl-row">
                        <dt>S&amp;P</dt>
                        <dd>{deal.spRating}{deal.spOutlook ? ` (${deal.spOutlook})` : ""}</dd>
                      </div>
                    )}
                    {deal.fitchRating && (
                      <div className="topsheet-dl-row">
                        <dt>Fitch</dt>
                        <dd>{deal.fitchRating}{deal.fitchOutlook ? ` (${deal.fitchOutlook})` : ""}</dd>
                      </div>
                    )}
                  </dl>
                )}

                <table className="topsheet-table">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Actual</th>
                      <th>Base Case</th>
                      <th>Lock-Up</th>
                      <th>Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPeriodRows.map((row) => (
                      <tr key={row.label}>
                        <th>
                          <div className="topsheet-table-label">
                            <span>{row.label}</span>
                            {row.label === "Senior DSCR" ? (
                              <span className={`badge ${row.tone}`}>
                                {deal.covenant.status.replaceAll("_", " ")}
                              </span>
                            ) : null}
                          </div>
                        </th>
                        <td>{row.actual}</td>
                        <td>{row.baseCase}</td>
                        <td>{row.lockup}</td>
                        <td>{row.defaultLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="meta-note">
                  Latest period: {safeLatestPeriod.periodLabel}. Values are sourced from
                  the most recent approved period and covenant test.
                </p>
              </article>
            </div>

            {/* ── Liquidity & Reserve Accounts ───────────────────────── */}
            {deal.reserveAccounts && deal.reserveAccounts.length > 0 && (
              <article className="topsheet-card" style={{ marginBottom: 16 }}>
                <strong>Liquidity & Reserve Accounts</strong>
                <p className="topsheet-meta-note" style={{ marginBottom: 10 }}>
                  Reserve account balances and liquidity facility availability as reported in the latest compliance certificate.
                </p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--line)" }}>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>Account</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>Type</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>Required</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>Funded</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>Funding</th>
                        <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>Status</th>
                        <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>Shortfall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deal.reserveAccounts.map((ra: {
                        id: string;
                        account_name: string;
                        account_type: string;
                        required_balance: number | null;
                        current_balance: number | null;
                        funded_status: string;
                        cash_amount: number | null;
                        lc_amount: number | null;
                        pcg_amount: number | null;
                        lc_provider: string | null;
                        pcg_provider: string | null;
                        periods_underfunded: number | null;
                      }) => {
                        const isAccount = !["liquidity_facility", "working_capital_facility", "rcf"].includes(ra.account_type);
                        const required = ra.required_balance ?? 0;
                        const actual = ra.current_balance ?? 0;
                        const shortfall = required > actual ? required - actual : 0;
                        const fundingParts: string[] = [];
                        if (ra.cash_amount && ra.cash_amount > 0) fundingParts.push(`Cash ${formatMoney(ra.cash_amount)}`);
                        if (ra.lc_amount && ra.lc_amount > 0) fundingParts.push(`LC ${formatMoney(ra.lc_amount)}${ra.lc_provider ? ` (${ra.lc_provider})` : ""}`);
                        if (ra.pcg_amount && ra.pcg_amount > 0) fundingParts.push(`PCG ${formatMoney(ra.pcg_amount)}${ra.pcg_provider ? ` (${ra.pcg_provider})` : ""}`);
                        const fundingStr = fundingParts.length > 0 ? fundingParts.join(" + ") : (ra.funded_status === "fully_funded" ? "Cash" : "\u2014");
                        const statusTone = ra.funded_status === "fully_funded" || ra.funded_status === "surplus" ? "good" : ra.funded_status === "partially_funded" ? "warning" : "critical";
                        return (
                          <tr key={ra.id} style={{ borderBottom: "1px solid var(--line)" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 600 }}>{ra.account_name}</td>
                            <td style={{ padding: "6px 8px", color: "var(--ink-soft)", fontSize: "0.78rem" }}>
                              {isAccount ? "Reserve" : "Facility"}
                            </td>
                            <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>
                              {isAccount ? formatMoney(required) : formatMoney(required)}
                            </td>
                            <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                              {formatMoney(actual)}
                            </td>
                            <td style={{ padding: "6px 8px", fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                              {fundingStr}
                            </td>
                            <td style={{ padding: "6px 8px" }}>
                              <span className={`badge ${statusTone} badge-sm`}>
                                {ra.funded_status.replace(/_/g, " ")}
                                {ra.periods_underfunded && ra.periods_underfunded > 0 ? ` (${ra.periods_underfunded})` : ""}
                              </span>
                            </td>
                            <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", color: shortfall > 0 ? "var(--critical)" : "var(--ink-soft)", fontWeight: shortfall > 0 ? 700 : 400 }}>
                              {shortfall > 0 ? formatMoney(shortfall) : "\u2014"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: "2px solid var(--line)", fontWeight: 700 }}>
                        <td style={{ padding: "6px 8px" }} colSpan={2}>Total</td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>
                          {formatMoney(deal.reserveAccounts.reduce((s: number, ra: { required_balance: number | null }) => s + (ra.required_balance ?? 0), 0))}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace" }}>
                          {formatMoney(deal.reserveAccounts.reduce((s: number, ra: { current_balance: number | null }) => s + (ra.current_balance ?? 0), 0))}
                        </td>
                        <td style={{ padding: "6px 8px" }} colSpan={2}></td>
                        <td style={{ padding: "6px 8px", textAlign: "right", fontFamily: "monospace", color: "var(--critical)", fontWeight: 700 }}>
                          {(() => {
                            const total = deal.reserveAccounts.reduce((s: number, ra: { required_balance: number | null; current_balance: number | null }) => {
                              const req = ra.required_balance ?? 0;
                              const act = ra.current_balance ?? 0;
                              return s + (req > act ? req - act : 0);
                            }, 0);
                            return total > 0 ? formatMoney(total) : "\u2014";
                          })()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </article>
            )}

            {/* Financial Performance Charts */}
            <DealCharts
              slug={slug}
              currency={deal.currency}
              lockupLevel={deal.covenant?.thresholdLockup}
              defaultLevel={deal.covenant?.thresholdTrigger}
            />

            <div className="topsheet-two-column">
              <article className="topsheet-card">
                <div className="status-row">
                  <strong>Forecast / Scenario view</strong>
                  <span className="badge neutral">
                    {deal.forecastSummary?.scenarioCount ?? 0} scenarios
                  </span>
                </div>
                {deal.forecastSummary ? (
                  <div className="stack compact-stack">
                    <div className="mini-card">
                      <strong>
                        {deal.forecastSummary.activeMonitoringCaseName} ·{" "}
                        {deal.forecastSummary.activeMonitoringVersionLabel}
                      </strong>
                      <p>
                        Latest refresh{" "}
                        {deal.forecastSummary.latestRefreshAt
                          ? deal.forecastSummary.latestRefreshAt.slice(0, 10)
                          : "not yet refreshed"}
                      </p>
                    </div>
                    {deal.forecastSummary.scenarios.slice(0, 3).map((scenario) => (
                      <div key={`${scenario.caseType}-${scenario.versionLabel}`} className="mini-card">
                        <div className="status-row">
                          <strong>{scenario.caseName}</strong>
                          <span className={`badge ${scenario.isMonitoring ? "good" : "neutral"}`}>
                            {scenario.caseType}
                          </span>
                        </div>
                        <p>{scenario.scenarioSummary}</p>
                        <p className="meta-note">
                          Revenue delta {metricValue(scenario.deltaToMonitoring.revenue)} · DSCR delta{" "}
                          {metricValue(scenario.deltaToMonitoring.seniorDscr, "x")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No forecast cases are linked to this deal yet.</p>
                )}
              </article>

              <article className="topsheet-card">
                <div className="status-row">
                  <strong>Risk Register</strong>
                  <span className="badge neutral">
                    {deal.riskSnapshot.openCount} open
                  </span>
                </div>
                <div className="stack compact-stack">
                  {deal.riskSnapshot.entries.slice(0, 3).map((entry) => (
                    <div key={entry.id} className="mini-card">
                      <div className="status-row">
                        <strong>{entry.title}</strong>
                        <span className={`badge ${toneForStatus(entry.severity)}`}>
                          {entry.severity}
                        </span>
                      </div>
                      <p>{entry.summary}</p>
                      <p className="meta-note">
                        {entry.ownerName} · next review {entry.nextReviewDate}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="topsheet-card">
                <div className="status-row">
                  <strong>Borrower Requests</strong>
                  <span className="badge neutral">
                    {deal.borrowerRequests.length} active
                  </span>
                </div>
                {deal.borrowerRequests.length > 0 ? (
                  <div className="stack compact-stack">
                    {deal.borrowerRequests.map((request) => (
                      <div key={request.id} className="mini-card">
                        <div className="status-row">
                          <strong>{request.title}</strong>
                          <span className={`badge ${toneForStatus(request.priority)}`}>
                            {request.priority}
                          </span>
                        </div>
                        <p>{request.summary}</p>
                        <p className="meta-note">
                          Due {request.dueDate} · votes {request.voteSummary.total} · oppose{" "}
                          {request.voteSummary.oppose}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No borrower requests are currently open for this deal.</p>
                )}
              </article>
            </div>

            <div className="topsheet-two-column">
              <article className="topsheet-card">
                <div className="status-row">
                  <strong>TopSheet snapshot history</strong>
                  <span className="badge neutral">{deal.snapshotHistory.length} stored</span>
                </div>
                <div className="stack compact-stack">
                  {deal.snapshotHistory.slice(0, 3).map((snapshot) => (
                    <div key={snapshot.id} className="mini-card">
                      <div className="status-row">
                        <strong>{snapshot.snapshotLabel}</strong>
                        <span className="badge neutral">
                          {snapshot.snapshotType.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p>{snapshot.summary}</p>
                      <p className="meta-note">
                        {snapshot.capturedBy} · {snapshot.capturedAt.slice(0, 10)}
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="topsheet-card">
                <div className="status-row">
                  <strong>Term change management</strong>
                  <span className="badge neutral">{deal.amendmentHistory.length} recorded</span>
                </div>
                {latestAmendment ? (
                  <div className="stack compact-stack">
                    {deal.amendmentHistory.slice(0, 2).map((amendment) => (
                      <div key={amendment.id} className="mini-card">
                        <div className="status-row">
                          <strong>{amendment.title}</strong>
                          <span className={`badge ${toneForStatus(amendment.amendmentStatus)}`}>
                            {amendment.amendmentStatus.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p>{amendment.summary}</p>
                        <p className="meta-note">
                          Effective {amendment.effectiveFrom}
                          {amendment.effectiveTo ? ` to ${amendment.effectiveTo}` : ""}
                          {" · "}
                          rule versions {amendment.ruleVersions.length}
                        </p>
                      </div>
                    ))}
                    {deal.viewer.permissions.canCaptureSnapshots ? (
                      <form action={captureDealSnapshot} className="stack compact-stack">
                        <input type="hidden" name="dealSlug" value={deal.slug} />
                        <input
                          type="hidden"
                          name="snapshotLabel"
                          value={`${deal.name} manual TopSheet snapshot`}
                        />
                        <input type="hidden" name="snapshotType" value="manual" />
                        <input type="hidden" name="capturedBy" value="Deal workspace" />
                        <input
                          type="hidden"
                          name="summary"
                          value="Manual TopSheet snapshot captured from the deal workspace."
                        />
                        <button className="button secondary" type="submit">
                          Capture current TopSheet
                        </button>
                      </form>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <p>No amendments have been activated or declined for this deal.</p>
                    {deal.viewer.permissions.canCaptureSnapshots ? (
                      <form action={captureDealSnapshot} className="stack compact-stack">
                        <input type="hidden" name="dealSlug" value={deal.slug} />
                        <input
                          type="hidden"
                          name="snapshotLabel"
                          value={`${deal.name} manual TopSheet snapshot`}
                        />
                        <input type="hidden" name="snapshotType" value="manual" />
                        <input type="hidden" name="capturedBy" value="Deal workspace" />
                        <input
                          type="hidden"
                          name="summary"
                          value="Manual TopSheet snapshot captured from the deal workspace."
                        />
                        <button className="button secondary" type="submit">
                          Capture current TopSheet
                        </button>
                      </form>
                    ) : null}
                  </>
                )}
              </article>
            </div>

          </section>
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
