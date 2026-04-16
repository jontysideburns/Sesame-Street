import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeal, getDealFinancialPeriod } from "../../../api/deals";
import { getDealAssessment } from "../../../api/assessment";
import { getPortfolio } from "../../../api/portfolio";
import { captureDealSnapshot } from "../actions";
import DealCharts from "./deal-charts";
import KpiChart from "./kpi-chart";

/* ─────────────────────────────────────────────────────────────────────
 * Deal Overview page
 *
 *  1. Investment description — full-width narrative
 *  2. Deal Snapshot — portfolio-KPI-style strip + characteristics + perf
 *  3. Compliance · Risk · Distribution — three-column row
 *  4. Investment Update — AI-produced 12-month business summary (placeholder)
 *  5. Financial Performance Charts + Sector KPI chart
 *  6. Forecast · Risk · Borrower requests
 *  7. Snapshot history · Term change management
 *  8. Key Metrics comparison table (Actuals / Base Case / Lockup / Default)
 *  9. Liquidity & Reserve Accounts
 * ───────────────────────────────────────────────────────────────────── */

type KpiTone = "good" | "warning" | "critical" | undefined;

function fmtCompact(n: number | null | undefined, ccy = "GBP") {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: ccy,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtNum(n: number | null | undefined, digits = 2, suffix = "") {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}${suffix}`;
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function formatMoney(value: number | null | undefined, ccy = "GBP") {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: ccy,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null | undefined, digits = 2) {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function metricValue(value?: number | null, suffix = "") {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(2)}${suffix}`;
}

function metricDisplay(value?: number | null, suffix = "") {
  if (value == null || Number.isNaN(value)) return "—";
  return `${formatNumber(value)}${suffix}`;
}

function toneForStatus(status: string): "good" | "warning" | "critical" | "neutral" {
  const s = (status ?? "").toLowerCase();
  if (s.includes("trigger") || s === "overdue" || s === "high" || s === "oppose") return "critical";
  if (
    s.includes("lock") ||
    s.includes("watch") ||
    s.includes("concern") ||
    s.includes("enhanced") ||
    s === "medium" ||
    s === "under_review" ||
    s === "open" ||
    s === "support_with_conditions"
  ) {
    return "warning";
  }
  return "good";
}

function assignedRating(moodys?: string | null, sp?: string | null, fitch?: string | null) {
  const externals = [moodys, sp, fitch].filter((r): r is string => !!r);
  if (externals.length >= 3) return externals[1]; // middle
  if (externals.length === 2) return externals[1]; // conservative
  if (externals.length === 1) return externals[0];
  return null;
}

function gradeTone(grade: string): KpiTone {
  if (grade.startsWith("1")) return "good";
  if (grade.startsWith("2")) return undefined;
  if (grade.startsWith("3")) return "warning";
  return "critical";
}

function covenantTone(status: string): KpiTone {
  if (status === "performing") return "good";
  if (status === "distribution_lockup") return "warning";
  return "critical";
}

const TREND_LABEL: Record<string, string> = {
  improving_rapidly: "Improving rapidly ↑↑",
  improving: "Improving ↑",
  flat: "Stable →",
  new: "Newly monitored",
  deteriorating: "Deteriorating ↓",
  deteriorating_rapidly: "Deteriorating rapidly ↓↓",
};

/* ─── Compact KPI card (matches JPS portfolio-summary KpiCard) ────── */

function KpiCard({ label, value, tone, hint }: { label: string; value: string; tone?: KpiTone; hint?: string }) {
  const color =
    tone === "critical" ? "#d65454" : tone === "warning" ? "#c97f1f" : tone === "good" ? "#2f8b72" : undefined;
  return (
    <div
      style={{
        flex: 1,
        minWidth: 110,
        borderRadius: 14,
        border: "1px solid var(--line)",
        background: "var(--panel)",
        padding: "10px 12px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "0.62rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink-soft)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: color ?? "var(--ink)", fontFamily: "monospace" }}>
        {value}
      </div>
      {hint ? (
        <div style={{ fontSize: "0.62rem", color: "var(--ink-soft)", marginTop: 2 }}>{hint}</div>
      ) : null}
    </div>
  );
}

function AttrRow({ label, value, tone }: { label: string; value: string; tone?: KpiTone }) {
  const color =
    tone === "critical" ? "#d65454" : tone === "warning" ? "#c97f1f" : tone === "good" ? "#2f8b72" : undefined;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        padding: "6px 0",
        borderBottom: "1px dashed var(--line)",
      }}
    >
      <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>{label}</span>
      <span
        style={{
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: "0.92rem",
          color: color ?? "var(--ink)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default async function DealPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let deal: any;
  try {
    deal = await getDeal(slug);
  } catch {
    notFound();
  }

  const [assessment, portfolio, latestPeriod] = await Promise.all([
    getDealAssessment(slug).catch(() => null),
    getPortfolio({ reportingCurrency: "GBP" as const }).catch(() => null),
    getDealFinancialPeriod(slug, "latest").catch(() => null),
  ]);

  // Safe defaults for optional data
  const safeLatestPeriod = latestPeriod ?? {
    periodLabel: "No period data",
    reportedMetrics: {} as Record<string, any>,
    expectedMetrics: {} as Record<string, any>,
  };

  // Find the richer Portfolio row for this deal (has spreadBps, walYears, ndEbitda, sector, ranking, etc.)
  const pRow: any =
    portfolio?.deals?.find?.((d: any) => d.dealSlug === slug || d.slug === slug) ?? null;

  const rating = assignedRating(deal.moodysRating, deal.spRating, deal.fitchRating)
    ?? deal.internalCreditScore
    ?? null;
  const headroom = deal.covenant?.headroomPct ?? pRow?.headroomPct ?? null;
  const dscr = pRow?.reportedDscr ?? deal.covenant?.currentValue ?? null;
  const ndEbitda = pRow?.ndEbitda ?? null;
  const spreadBps = pRow?.spreadBps ?? null;
  const walYears = pRow?.walYears ?? null;
  const sector = pRow?.sector ?? deal.sector ?? deal.dealType ?? "—";
  const country =
    pRow?.primaryCountryName ??
    deal.region ??
    (pRow?.jurisdictionSplits?.[0]?.countryName ?? "—");
  const securityRanking = pRow?.securityRanking ?? "—";
  const instrumentFormat = pRow?.instrumentFormat ?? "—";
  const trend = deal.performanceTrend ?? pRow?.performanceTrend ?? null;
  const covenantStatus = deal.covenant?.status ?? pRow?.covenantStatus ?? "—";

  const topRisks: any[] = (deal.riskSnapshot?.entries ?? [])
    .slice()
    .sort((a: any, b: any) => Number(b.severity ?? 0) - Number(a.severity ?? 0))
    .slice(0, 3);

  const latestAmendment = (deal.amendmentHistory ?? [])[0] ?? null;
  const canCapture = deal.viewer?.permissions?.canCaptureSnapshots ?? false;
  const snapshotForm = (
    <form action={captureDealSnapshot} className="stack compact-stack">
      <input type="hidden" name="dealSlug" value={deal.slug} />
      <input type="hidden" name="snapshotLabel" value={`${deal.name} manual TopSheet snapshot`} />
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
  );

  const overdueCount = (deal.obligations ?? []).filter((o: any) => o.status === "overdue").length;
  const pendingReviewCount = deal.borrowerRequests?.length ?? 0;
  const distribution = deal.distributionAssessment;
  const distributionStatus = distribution?.status ?? "not_assessed";
  const distributionToneValue: KpiTone =
    distributionStatus === "blocked"
      ? "critical"
      : distributionStatus === "restricted" || distributionStatus === "review_required"
      ? "warning"
      : distributionStatus === "allowed"
      ? "good"
      : undefined;

  /* ── Key Metrics table rows (actuals vs base case vs thresholds) ──── */
  const dscrHistoryPoint = (deal.history ?? [])[(deal.history ?? []).length - 1];
  const collateralRatio = (() => {
    const rm = safeLatestPeriod.reportedMetrics ?? {};
    const em = safeLatestPeriod.expectedMetrics ?? {};
    if (rm.ltv_npv != null) return { label: "LTV (NPV)", actualVal: rm.ltv_npv, baseVal: em.ltv_npv, suffix: "x" };
    if (rm.senior_net_debt_ebitda != null) return { label: "Net Debt / EBITDA", actualVal: rm.senior_net_debt_ebitda, baseVal: em.senior_net_debt_ebitda, suffix: "x" };
    if (rm.total_net_debt_ebitda != null) return { label: "Net Debt / EBITDA", actualVal: rm.total_net_debt_ebitda, baseVal: em.total_net_debt_ebitda, suffix: "x" };
    return null;
  })();

  const currentPeriodRows: Array<{
    label: string;
    actual: string;
    baseCase: string;
    lockup: string;
    defaultLevel: string;
    tone: "good" | "warning" | "critical" | "neutral";
  }> = [
    {
      label: "Senior DSCR",
      actual: metricDisplay(deal.covenant?.currentValue, "x"),
      baseCase: metricDisplay(dscrHistoryPoint?.expectedDscr, "x"),
      lockup: metricDisplay(deal.covenant?.thresholdLockup, "x"),
      defaultLevel: metricDisplay(deal.covenant?.thresholdTrigger, "x"),
      tone: toneForStatus(covenantStatus ?? ""),
    },
    {
      label: collateralRatio ? collateralRatio.label : "Collateral Ratio",
      actual: collateralRatio ? metricDisplay(collateralRatio.actualVal, collateralRatio.suffix) : "Not specified",
      baseCase: collateralRatio ? metricDisplay(collateralRatio.baseVal, collateralRatio.suffix) : "—",
      lockup: "—",
      defaultLevel: "—",
      tone: "neutral",
    },
    {
      label: "Revenue",
      actual: metricDisplay(safeLatestPeriod.reportedMetrics.revenue),
      baseCase: metricDisplay(safeLatestPeriod.expectedMetrics.revenue),
      lockup: "—",
      defaultLevel: "—",
      tone: "neutral",
    },
    {
      label: "EBITDA",
      actual: metricDisplay(safeLatestPeriod.reportedMetrics.ebitda),
      baseCase: metricDisplay(safeLatestPeriod.expectedMetrics.ebitda),
      lockup: "—",
      defaultLevel: "—",
      tone: "neutral",
    },
    {
      label: "CFADS",
      actual: metricDisplay(safeLatestPeriod.reportedMetrics.cfads),
      baseCase: metricDisplay(safeLatestPeriod.expectedMetrics.cfads),
      lockup: "—",
      defaultLevel: "—",
      tone: "neutral",
    },
    {
      label: "Leased Capacity",
      actual: metricDisplay(safeLatestPeriod.reportedMetrics.leasedCapacityPct, "%"),
      baseCase: metricDisplay(safeLatestPeriod.expectedMetrics.leasedCapacityPct, "%"),
      lockup: "—",
      defaultLevel: "—",
      tone: "neutral",
    },
    {
      label: "Construction Completion",
      actual: metricDisplay(safeLatestPeriod.reportedMetrics.constructionCompletionPct, "%"),
      baseCase: metricDisplay(safeLatestPeriod.expectedMetrics.constructionCompletionPct, "%"),
      lockup: "—",
      defaultLevel: "—",
      tone: "neutral",
    },
  ];

  /* ── Mock AI-produced 12-month business summary (placeholder for real engine) ── */
  const periodLabel = deal.latestPeriodLabel ?? "latest reporting period";
  const mockInvestmentUpdate = [
    `Over the past twelve months through ${periodLabel}, ${deal.name} has performed ${
      trend === "improving" || trend === "improving_rapidly"
        ? "ahead of"
        : trend === "deteriorating" || trend === "deteriorating_rapidly"
        ? "below"
        : "broadly in line with"
    } the management-case forecast underwritten at close. The deal currently holds a grade of ${deal.grade} with covenant status ${covenantStatus.replace(/_/g, " ")} and ${fmtPct(
      headroom
    )} headroom to the tightest test.`,
    `Revenue and EBITDA trajectory reflect ${
      sector
    } sector dynamics: ${deal.summary ? deal.summary.slice(0, 220) : "underlying performance as reported in the latest compliance certificate."}`,
    `Key watchpoints for the next twelve months include ${
      topRisks[0]?.title ?? "the risks captured in the deal risk register"
    }${topRisks[1] ? ` and ${topRisks[1].title}` : ""}. No change of control, event of default, or lock-up trigger has occurred in the reporting period.`,
    `Recommendation: ${
      deal.watchlist
        ? "maintain on watchlist with monthly review cadence pending resolution of flagged drivers."
        : "continue routine quarterly monitoring; no escalation required."
    }`,
  ];

  return (
    <main className="shell">
      {/* ─── Page header ───────────────────────────────────────────── */}
      <section className="topsheet-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow">Deal Overview</p>
          <h1 style={{ margin: "6px 0 0 0" }}>{deal.name}</h1>
          <p className="topsheet-subtitle" style={{ margin: "4px 0 0 0", color: "var(--ink-soft)" }}>
            {deal.borrower} · {sector} · {country}
          </p>
          <p className="meta-note" style={{ margin: "4px 0 0 0" }}>
            Viewer: {deal.viewer?.displayName} · {deal.viewer?.teamName}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="button secondary" href={`/deals/${slug}/topsheet`}>
            Full TopSheet
          </Link>
          <Link className="button secondary" href={`/deals/${slug}/periods/latest`}>
            Period View
          </Link>
          <Link className="button secondary" href={`/deals/${slug}/forecasts`}>
            Forecasts
          </Link>
          <Link className="button secondary" href={`/deals/${slug}/amendments`}>
            Amendments
          </Link>
          <Link className="button secondary" href={`/deals/${slug}/calendar`}>
            Calendar
          </Link>
          <Link className="button secondary" href={`/deals/${slug}/activity`}>
            Activity
          </Link>
          <Link className="button secondary" href={`/deals/${slug}/reports`}>
            Reports
          </Link>
          <Link className="button secondary" href={`/deals/${slug}/packs`}>
            Memo Packs
          </Link>
          <Link className="button secondary" href="/jps">
            Back to Dashboard
          </Link>
        </div>
      </section>

      {/* ─── §1 Investment description — FULL WIDTH ───────────────── */}
      <section
        className="panel section-panel"
        style={{
          marginTop: 16,
          padding: "22px 28px",
        }}
      >
        <p className="eyebrow" style={{ marginBottom: 8 }}>
          Investment Description
        </p>
        <p
          style={{
            fontSize: "1.02rem",
            lineHeight: 1.65,
            margin: 0,
            color: "var(--ink)",
            maxWidth: "none",
          }}
        >
          {deal.dealOverview || deal.summary || "No investment description recorded yet."}
        </p>
      </section>

      {/* ─── §2 Deal Snapshot ──────────────────────────────────────── */}
      <section className="panel section-panel" style={{ marginTop: 16, padding: "22px 28px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <p className="eyebrow">Deal Snapshot</p>
            <h2 style={{ margin: "2px 0 0 0", fontSize: "1.25rem" }}>Contribution to portfolio · characteristics · performance</h2>
          </div>
          <span className="meta-note" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
            {deal.latestPeriodLabel ? `As at ${deal.latestPeriodLabel}` : "As at latest snapshot"}
          </span>
        </div>

        {/* KPI strip — same format as JPS portfolio dashboard */}
        <p
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            color: "var(--ink-soft)",
            margin: "0 0 8px 0",
          }}
        >
          This deal&apos;s contribution to portfolio aggregates
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          <KpiCard label="Exposure" value={fmtCompact(deal.exposure, deal.currency || "GBP")} />
          <KpiCard label="Rating" value={rating ?? "—"} hint="Assigned" />
          <KpiCard label="Spread" value={spreadBps != null ? `${spreadBps}bp` : "—"} />
          <KpiCard label="WA Life" value={walYears != null ? `${walYears.toFixed(1)}yr` : "—"} />
          <KpiCard
            label="DSCR"
            value={fmtNum(dscr, 2, "x")}
            tone={dscr != null ? (dscr >= 1.5 ? "good" : dscr >= 1.1 ? "warning" : "critical") : undefined}
          />
          <KpiCard
            label="ND : EBITDA"
            value={fmtNum(ndEbitda, 1, "x")}
            tone={ndEbitda != null ? (ndEbitda > 8 ? "critical" : ndEbitda > 6 ? "warning" : "good") : undefined}
          />
          <KpiCard
            label="Headroom"
            value={fmtPct(headroom)}
            tone={headroom != null ? (headroom < 30 ? "critical" : headroom < 70 ? "warning" : "good") : undefined}
          />
        </div>

        {/* Two-column row: Characteristics + Performance */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          <div>
            <p
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: "var(--ink-soft)",
                margin: "0 0 6px 0",
              }}
            >
              Characteristics
            </p>
            <AttrRow label="Sector" value={sector} />
            <AttrRow label="Country" value={country} />
            <AttrRow label="Security ranking" value={securityRanking} />
            <AttrRow label="Instrument format" value={instrumentFormat} />
            <AttrRow label="Currency" value={deal.currency ?? "—"} />
            <AttrRow label="Facility amount" value={fmtCompact(deal.facilityAmount, deal.currency || "GBP")} />
          </div>

          <div>
            <p
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                color: "var(--ink-soft)",
                margin: "0 0 6px 0",
              }}
            >
              Performance
            </p>
            <AttrRow
              label="Credit rating (Moody&apos;s / S&P / Fitch)"
              value={`${deal.moodysRating ?? "—"} / ${deal.spRating ?? "—"} / ${deal.fitchRating ?? "—"}`}
            />
            <AttrRow label="Internal grade" value={deal.grade ?? "—"} tone={gradeTone(deal.grade ?? "")} />
            <AttrRow
              label="Trend"
              value={trend ? TREND_LABEL[trend] ?? trend : "—"}
              tone={
                trend === "deteriorating_rapidly"
                  ? "critical"
                  : trend === "deteriorating"
                  ? "warning"
                  : trend === "improving" || trend === "improving_rapidly"
                  ? "good"
                  : undefined
              }
            />
            <AttrRow
              label="Covenant status"
              value={covenantStatus.replace(/_/g, " ")}
              tone={covenantTone(covenantStatus)}
            />
            <AttrRow label="Watchlist" value={deal.watchlist ? "Yes" : "No"} tone={deal.watchlist ? "warning" : "good"} />
            <AttrRow
              label="Escalation"
              value={assessment?.assessment?.escalationLevel ?? "—"}
            />
          </div>
        </div>
      </section>

      {/* ─── §3 Compliance · Risk · Distribution ───────────────────── */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* Compliance */}
        <div className="panel section-panel" style={{ padding: "18px 20px" }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Compliance</p>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "1rem" }}>
            Covenant &amp; obligations
          </h3>
          <AttrRow
            label="Primary covenant"
            value={deal.covenant?.name ?? "—"}
          />
          <AttrRow
            label="Current value"
            value={fmtNum(deal.covenant?.currentValue, 2, "x")}
            tone={covenantTone(covenantStatus)}
          />
          <AttrRow label="Lock-up threshold" value={fmtNum(deal.covenant?.thresholdLockup, 2, "x")} />
          <AttrRow label="Trigger threshold" value={fmtNum(deal.covenant?.thresholdTrigger, 2, "x")} />
          <AttrRow label="Headroom" value={fmtPct(headroom)} tone={headroom != null && headroom < 30 ? "critical" : headroom != null && headroom < 70 ? "warning" : "good"} />
          <AttrRow label="Overdue obligations" value={String(overdueCount)} tone={overdueCount > 0 ? "warning" : "good"} />
          <AttrRow label="Pending borrower requests" value={String(pendingReviewCount)} />
          <div style={{ marginTop: 12 }}>
            <Link className="button secondary" href={`/deals/${slug}/covenants/${deal.covenant?.id ?? ""}`}>
              Covenant detail →
            </Link>
          </div>
        </div>

        {/* Risk */}
        <div className="panel section-panel" style={{ padding: "18px 20px" }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Risk</p>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "1rem" }}>
            Top risks ({deal.riskSnapshot?.entries?.length ?? 0} active)
          </h3>
          {topRisks.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: "0.88rem" }}>No active risks recorded.</p>
          ) : (
            <ol style={{ margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
              {topRisks.map((r) => {
                const score = Number(r.severity ?? 0) * Number(r.probability ?? 0);
                const tone: KpiTone = score >= 15 ? "critical" : score >= 9 ? "warning" : "good";
                return (
                  <li key={r.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <strong style={{ fontSize: "0.9rem" }}>{r.title}</strong>
                      <span className={`badge ${tone === "critical" ? "critical" : tone === "warning" ? "warning" : "good"}`} style={{ fontSize: "0.7rem" }}>
                        {r.riskCategory}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: 2 }}>
                      Score {score}/30 · {r.ownerName}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          <div style={{ marginTop: 12 }}>
            <Link className="button secondary" href={`/deals/${slug}/risk`}>
              Risk register →
            </Link>
          </div>
        </div>

        {/* Distribution */}
        <div className="panel section-panel" style={{ padding: "18px 20px" }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Distribution</p>
          <h3 style={{ margin: "0 0 10px 0", fontSize: "1rem" }}>Lock-up &amp; gate status</h3>
          <AttrRow
            label="Status"
            value={distributionStatus.replace(/_/g, " ")}
            tone={distributionToneValue}
          />
          {distribution ? (
            <>
              <AttrRow
                label="Blocker count"
                value={String(distribution.blockerCount ?? 0)}
                tone={distribution.blockerCount > 0 ? "critical" : "good"}
              />
              <AttrRow
                label="Next test date"
                value={distribution.nextTestDate ?? "—"}
              />
              <AttrRow
                label="Last assessed"
                value={distribution.lastAssessedAt ?? "—"}
              />
            </>
          ) : (
            <p style={{ color: "var(--ink-soft)", fontSize: "0.85rem", margin: "8px 0 0 0" }}>
              No distribution assessment run yet for this deal. Once the distribution engine evaluates the lock-up
              register, the gate status, blocker count, and next test date will appear here.
            </p>
          )}
          <div style={{ marginTop: 12 }}>
            <Link className="button secondary" href={`/deals/${slug}/distribution`}>
              Distribution detail →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── §4 Investment Update ──────────────────────────────────── */}
      <section
        className="panel section-panel"
        style={{
          marginTop: 16,
          padding: "22px 28px",
          borderLeft: "3px solid var(--accent)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div>
            <p className="eyebrow">Investment Update</p>
            <h2 style={{ margin: "2px 0 0 0", fontSize: "1.2rem" }}>
              AI-produced 12-month business performance summary
            </h2>
          </div>
          <span
            className="badge neutral"
            style={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Mocked · real engine pending
          </span>
        </div>
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          {mockInvestmentUpdate.map((para, i) => (
            <p key={i} style={{ margin: 0, lineHeight: 1.65, color: "var(--ink)" }}>
              {para}
            </p>
          ))}
        </div>
        <div style={{ marginTop: 16, fontSize: "0.75rem", color: "var(--ink-soft)" }}>
          Source: 4 compliance certificates, 2 audited financial statements, 3 rating reports, 12 management
          reporting packs · Model: placeholder · Generated: {new Date().toISOString().slice(0, 10)}
        </div>
      </section>

      {/* ─── §5 Financial Performance Charts + KPI Chart ────────────── */}
      <section className="panel section-panel" style={{ marginTop: 16, padding: "22px 28px" }}>
        <p className="eyebrow" style={{ marginBottom: 4 }}>Financial Performance</p>
        <h2 style={{ margin: "2px 0 14px 0", fontSize: "1.2rem" }}>
          Actuals vs management case — revenue, costs, cash flow, leverage
        </h2>
        <DealCharts
          slug={slug}
          currency={deal.currency}
          lockupLevel={deal.covenant?.thresholdLockup}
          defaultLevel={deal.covenant?.thresholdTrigger}
        />
        <KpiChart slug={slug} />
      </section>

      {/* ─── §6 Forecast · Risk detail · Borrower requests ──────────── */}
      <div className="topsheet-two-column" style={{ marginTop: 16 }}>
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
              {deal.forecastSummary.scenarios.slice(0, 3).map((scenario: any) => (
                <div key={`${scenario.caseType}-${scenario.versionLabel}`} className="mini-card">
                  <div className="status-row">
                    <strong>{scenario.caseName}</strong>
                    <span className={`badge ${scenario.isMonitoring ? "good" : "neutral"}`}>
                      {scenario.caseType}
                    </span>
                  </div>
                  <p>{scenario.scenarioSummary}</p>
                  <p className="meta-note">
                    Revenue delta {metricValue(scenario.deltaToMonitoring?.revenue)} · DSCR delta{" "}
                    {metricValue(scenario.deltaToMonitoring?.seniorDscr, "x")}
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
              {deal.riskSnapshot?.openCount ?? deal.riskSnapshot?.entries?.length ?? 0} open
            </span>
          </div>
          <div className="stack compact-stack">
            {(deal.riskSnapshot?.entries ?? []).slice(0, 3).map((entry: any) => (
              <div key={entry.id} className="mini-card">
                <div className="status-row">
                  <strong>{entry.title}</strong>
                  <span className={`badge ${toneForStatus(entry.severity)}`}>{entry.severity}</span>
                </div>
                <p style={{ fontSize: "0.8rem", lineHeight: 1.5 }}>
                  {entry.generatedNarrative ?? entry.summary}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="topsheet-card">
          <div className="status-row">
            <strong>Borrower Requests</strong>
            <span className="badge neutral">
              {(deal.borrowerRequests ?? []).length} active
            </span>
          </div>
          {(deal.borrowerRequests ?? []).length > 0 ? (
            <div className="stack compact-stack">
              {deal.borrowerRequests.map((request: any) => (
                <div key={request.id} className="mini-card">
                  <div className="status-row">
                    <strong>{request.title}</strong>
                    <span className={`badge ${toneForStatus(request.priority)}`}>
                      {request.priority}
                    </span>
                  </div>
                  <p>{request.summary}</p>
                  <p className="meta-note">
                    Due {request.dueDate} · votes {request.voteSummary?.total ?? 0} · oppose{" "}
                    {request.voteSummary?.oppose ?? 0}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p>No borrower requests are currently open for this deal.</p>
          )}
        </article>
      </div>

      {/* ─── §7 Snapshot history · Term change management ──────────── */}
      <div className="topsheet-two-column" style={{ marginTop: 16 }}>
        <article className="topsheet-card">
          <div className="status-row">
            <strong>TopSheet snapshot history</strong>
            <span className="badge neutral">{(deal.snapshotHistory ?? []).length} stored</span>
          </div>
          <div className="stack compact-stack">
            {(deal.snapshotHistory ?? []).slice(0, 3).map((snapshot: any) => (
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
            <span className="badge neutral">{(deal.amendmentHistory ?? []).length} recorded</span>
          </div>
          {latestAmendment ? (
            <div className="stack compact-stack">
              {deal.amendmentHistory.slice(0, 2).map((amendment: any) => (
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
                    {" · "}rule versions {amendment.ruleVersions?.length ?? 0}
                  </p>
                </div>
              ))}
              {canCapture ? snapshotForm : null}
            </div>
          ) : (
            <>
              <p>No amendments have been activated or declined for this deal.</p>
              {canCapture ? snapshotForm : null}
            </>
          )}
        </article>
      </div>

      {/* ─── §8 Key Metrics (Actuals vs Base Case vs Thresholds) ──── */}
      <article className="topsheet-card" style={{ marginTop: 16 }}>
        <strong>Key Metrics as at {deal.latestReportedAt ? deal.latestReportedAt.slice(0, 10) : deal.latestPeriodLabel}</strong>
        <table className="topsheet-table" style={{ marginTop: 10 }}>
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
                        {(covenantStatus ?? "").replaceAll("_", " ")}
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

      {/* ─── §9 Liquidity & Reserve Accounts ─────────────────────── */}
      {deal.reserveAccounts && deal.reserveAccounts.length > 0 && (
        <article className="topsheet-card" style={{ marginTop: 16 }}>
          <strong>Liquidity &amp; Reserve Accounts</strong>
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
                        {formatMoney(required)}
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
    </main>
  );
}
