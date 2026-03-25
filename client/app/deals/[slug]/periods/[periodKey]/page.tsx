import Link from "next/link";
import { notFound } from "next/navigation";
import { getDealFinancialPeriod } from "../../../../../api/deals";

const metricOrder = [
  "revenue",
  "ebitda",
  "cfads",
  "debtService",
  "leasedCapacityPct",
  "constructionCompletionPct",
  "seniorDscr"
] as const;

function formatMetricValue(metricKey: string, value: number) {
  if (metricKey === "seniorDscr") {
    return `${value.toFixed(2)}x`;
  }

  if (metricKey.endsWith("Pct")) {
    return `${value.toFixed(0)}%`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatVarianceValue(metricKey: string, value: number) {
  const prefix = value > 0 ? "+" : "";
  if (metricKey === "seniorDscr") {
    return `${prefix}${value.toFixed(2)}x`;
  }

  if (metricKey.endsWith("Pct")) {
    return `${prefix}${value.toFixed(0)} pts`;
  }

  return `${prefix}${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value)}`;
}

function statusBadge(status: string) {
  if (status === "approved") return "good";
  if (status === "under_review") return "warning";
  return "neutral";
}

function varianceBadge(materiality: string) {
  if (materiality === "critical") return "critical";
  if (materiality === "material") return "warning";
  if (materiality === "notable") return "neutral";
  return "good";
}

function reconciliationBadge(status: string) {
  if (status === "pending_review" || status === "exception") return "warning";
  if (status === "matched" || status === "approved") return "good";
  return "neutral";
}

export default async function DealFinancialPeriodPage({
  params
}: {
  params: Promise<{ slug: string; periodKey: string }>;
}) {
  const { slug, periodKey } = await params;

  try {
    const period = await getDealFinancialPeriod(slug, periodKey);
    const materialVariances = period.variances.filter((item) =>
      ["material", "critical"].includes(item.materiality)
    );

    return (
      <main className="shell">
        <nav className="subnav period-nav" aria-label="Financial periods">
          {period.availablePeriods.map((item) => (
            <Link
              key={item.periodKey}
              className={`subnav-link ${
                item.periodKey === period.periodKey ? "active" : ""
              }`}
              href={`/deals/${period.dealSlug}/periods/${item.periodKey}`}
            >
              {item.periodLabel}
            </Link>
          ))}
        </nav>

        <section className="hero">
          <div>
            <p className="eyebrow">Variance analysis</p>
            <h1>
              {period.dealName} · {period.periodLabel}
            </h1>
            <p className="hero-copy">{period.summary}</p>
            <div className="tag-row">
              <span className={`badge ${statusBadge(period.status)}`}>
                {period.status.replaceAll("_", " ")}
              </span>
              <span className="badge neutral">{period.grade}</span>
              <span className="badge neutral">{period.borrower}</span>
            </div>
            <div className="hero-actions">
              <Link className="button primary" href={`/deals/${period.dealSlug}`}>
                Back to deal
              </Link>
              <Link className="button secondary" href={`/deals/${period.dealSlug}/forecasts`}>
                Forecasts
              </Link>
              <Link className="button secondary" href="/review">
                Open review queue
              </Link>
            </div>
          </div>
          <aside className="hero-card">
            <div className="summary-stat-list">
              <div className="summary-stat">
                <span>Period end</span>
                <strong>{period.periodEnd}</strong>
              </div>
              <div className="summary-stat">
                <span>Material variances</span>
                <strong>{materialVariances.length}</strong>
              </div>
              <div className="summary-stat">
                <span>Senior DSCR</span>
                <strong>{period.covenant.currentValue.toFixed(2)}x</strong>
              </div>
              <div className="summary-stat">
                <span>Headroom</span>
                <strong>{period.covenant.headroomPct.toFixed(1)}%</strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="metric-grid">
          {metricOrder
            .filter((metricKey) => period.reportedMetrics[metricKey] !== undefined)
            .map((metricKey) => (
              <article key={metricKey} className="metric-card">
                <span>{period.variances.find((item) => item.metricKey === metricKey)?.metricLabel ?? metricKey}</span>
                <strong>{formatMetricValue(metricKey, period.reportedMetrics[metricKey])}</strong>
                <p className="meta-note">
                  Expected {formatMetricValue(metricKey, period.expectedMetrics[metricKey])}
                </p>
              </article>
            ))}
        </section>

        <section className="content-grid">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Period view</p>
                <h2>Variance analysis</h2>
              </div>
            </div>
            <div className="variance-list">
              {period.variances.map((item) => (
                <div
                  key={item.metricKey}
                  id={`variance-${item.metricKey}`}
                  className="variance-row"
                >
                  <div>
                    <div className="tag-row">
                      <span className={`badge ${varianceBadge(item.materiality)}`}>
                        {item.materiality}
                      </span>
                      <span className="badge neutral">
                        {item.direction === "flat" ? "flat" : `${item.direction} vs plan`}
                      </span>
                    </div>
                    <h3>{item.metricLabel}</h3>
                    <p>{item.commentary}</p>
                  </div>
                  <div className="variance-meta">
                    <strong>{formatVarianceValue(item.metricKey, item.varianceValue)}</strong>
                    <span>{item.variancePct.toFixed(2)}% vs expected</span>
                    <small>
                      {formatMetricValue(item.metricKey, item.reportedValue)} reported ·{" "}
                      {formatMetricValue(item.metricKey, item.expectedValue)} expected
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <div className="stack">
            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Source package</p>
                  <h2>Evidence and status</h2>
                </div>
                <Link className="text-link" href="/evidence">
                  Evidence workspace
                </Link>
              </div>
              {period.sourceDocument ? (
                <div className="document-card">
                  <div className="tag-row">
                    <span className={`badge ${statusBadge(period.sourceDocument.status)}`}>
                      {period.sourceDocument.status.replaceAll("_", " ")}
                    </span>
                    <span className="badge neutral">
                      Page {period.sourceDocument.evidencePage}
                    </span>
                  </div>
                  <strong>{period.sourceDocument.documentName}</strong>
                  <p>
                    {period.sourceDocument.documentType.replaceAll("_", " ")} · received{" "}
                    {period.sourceDocument.receivedAt.slice(0, 10)}
                  </p>
                  <p>{period.sourceDocument.snippet}</p>
                </div>
              ) : (
                <p className="detail-copy">
                  No source package is linked yet for this period in the current environment.
                </p>
              )}
              {period.sourceSupersessions.length > 0 ? (
                <div className="stack section-stack">
                  {period.sourceSupersessions.map((item) => (
                    <div key={item.id} className="document-card">
                      <div className="status-row">
                        <strong>Supersession event</strong>
                        <span className="badge warning">
                          {item.supersessionReason.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p>
                        {item.supersedingDocument.documentName} supersedes{" "}
                        {item.supersededDocument.documentName}
                      </p>
                      <p>{item.impactSummary}</p>
                      <p className="meta-note">
                        Effective {item.effectiveAt.slice(0, 10)} ·{" "}
                        {item.downstreamRecomputed ? "downstream recomputed" : "pending recompute"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Scenario comparison</p>
                  <h2>How this period looks across cases</h2>
                </div>
                <Link className="text-link" href={`/deals/${period.dealSlug}/forecasts`}>
                  Forecast workspace
                </Link>
              </div>
              {period.scenarioComparison ? (
                <div className="stack compact-stack">
                  {period.scenarioComparison.scenarios.map((scenario) => (
                    <div key={`${scenario.caseType}-${scenario.versionLabel}`} className="document-card">
                      <div className="status-row">
                        <strong>{scenario.caseName}</strong>
                        <div className="tag-row">
                          <span className={`badge ${scenario.isMonitoring ? "good" : "neutral"}`}>
                            {scenario.isMonitoring ? "monitoring" : scenario.caseType}
                          </span>
                          <span className="badge neutral">{scenario.versionLabel}</span>
                        </div>
                      </div>
                      <p>{scenario.scenarioSummary}</p>
                      <dl className="topsheet-definition-grid">
                        <div>
                          <dt>Revenue</dt>
                          <dd>{formatMetricValue("revenue", scenario.metrics.revenue)}</dd>
                        </div>
                        <div>
                          <dt>EBITDA</dt>
                          <dd>{formatMetricValue("ebitda", scenario.metrics.ebitda)}</dd>
                        </div>
                        <div>
                          <dt>CFADS</dt>
                          <dd>{formatMetricValue("cfads", scenario.metrics.cfads)}</dd>
                        </div>
                        <div>
                          <dt>Senior DSCR</dt>
                          <dd>{formatMetricValue("seniorDscr", scenario.metrics.seniorDscr)}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="detail-copy">
                  No scenario comparison is available for this period.
                </p>
              )}
            </article>

            <article className="panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Covenant impact</p>
                  <h2>Senior DSCR context</h2>
                </div>
                <Link
                  className="text-link"
                  href={`/deals/${period.dealSlug}/covenants/${period.covenant.id}`}
                >
                  Open covenant drilldown
                </Link>
              </div>
              <div className="summary-grid">
                <div>
                  <span>Current value</span>
                  <strong>{period.covenant.currentValue.toFixed(2)}x</strong>
                </div>
                <div>
                  <span>Lock-up threshold</span>
                  <strong>{period.covenant.thresholdLockup.toFixed(2)}x</strong>
                </div>
                <div>
                  <span>Headroom</span>
                  <strong>{period.covenant.headroomPct.toFixed(1)}%</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{period.covenant.status.replaceAll("_", " ")}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Ratio reconciliation</p>
              <h2>Borrower-reported vs platform-computed ratios</h2>
            </div>
            <Link className="text-link" href="/review">
              Open review queue
            </Link>
          </div>
          <div className="variance-list">
            {period.ratioReconciliations.length > 0 ? (
              period.ratioReconciliations.map((item) => (
                <div
                  key={item.id}
                  id={`reconciliation-${item.metricKey}`}
                  className="variance-row"
                >
                  <div>
                    <div className="tag-row">
                      <span className={`badge ${reconciliationBadge(item.status)}`}>
                        {item.status.replaceAll("_", " ")}
                      </span>
                      <span className="badge neutral">
                        tolerance {item.tolerancePct.toFixed(2)}%
                      </span>
                    </div>
                    <h3>{item.metricLabel}</h3>
                    <p>{item.explanation}</p>
                  </div>
                  <div className="variance-meta">
                    <strong>{formatVarianceValue(item.metricKey, item.varianceValue)}</strong>
                    <span>{item.variancePct.toFixed(2)}% variance</span>
                    <small>
                      Borrower {formatMetricValue(item.metricKey, item.borrowerReportedValue)} ·
                      Platform {formatMetricValue(item.metricKey, item.platformComputedValue)}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <p className="detail-copy">No ratio reconciliations are recorded for this period.</p>
            )}
          </div>
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
