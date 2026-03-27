import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeal } from "../../../../api/deals";
import {
  getActualPeriodDetail,
  getVarianceReport,
  getCovenantTests,
  getReconciliation,
  type CovenantTestRow,
  type VarianceRow,
  type ReconciliationRow
} from "../../../../api/jps";

function tierTone(tier: string) {
  if (tier === "event_of_default") return "critical";
  if (tier === "trigger_event") return "critical";
  if (tier === "distribution_lockup") return "warning";
  if (tier === "not_assessed") return "neutral";
  return "good";
}

function tierLabel(tier: string) {
  return tier.replace(/_/g, " ");
}

function materialityTone(m: string) {
  if (m === "critical" || m === "material") return "critical";
  if (m === "notable") return "warning";
  return "neutral";
}

function reconTone(s: string) {
  if (s === "material_variance" || s === "unreconciled") return "critical";
  if (s === "minor_variance") return "warning";
  if (s === "matched") return "good";
  return "neutral";
}

function pct(n: number | null) {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;
}

function num(n: number | null, dp = 2) {
  if (n == null) return "—";
  return n.toFixed(dp);
}

function headroomClass(headroom: number | null, threshold: number | null) {
  if (headroom == null || threshold == null) return "";
  const ratio = Math.abs(headroom) / Math.abs(threshold);
  if (ratio < 0.1) return "critical";
  if (ratio < 0.25) return "warning";
  return "";
}

function headroomWidth(headroom: number | null, threshold: number | null) {
  if (headroom == null || threshold == null) return 0;
  const ratio = Math.abs(headroom) / (Math.abs(threshold) + Math.abs(headroom));
  return Math.min(100, Math.max(0, ratio * 100));
}

export default async function JpsPeriodPage({
  params
}: {
  params: Promise<{ slug: string; periodFlag: string }>;
}) {
  const { slug, periodFlag } = await params;

  try {
    const [deal, periodDetail, varianceReport, covenantTests, reconciliation] =
      await Promise.all([
        getDeal(slug),
        getActualPeriodDetail(slug, periodFlag).catch(() => null),
        getVarianceReport(slug, periodFlag).catch(() => null),
        getCovenantTests(slug, periodFlag).catch(() => null),
        getReconciliation(slug, periodFlag).catch(() => null)
      ]);

    if (!periodDetail) notFound();

    const variances: VarianceRow[] = varianceReport?.variances ?? [];
    const tests: CovenantTestRow[] = covenantTests?.tests ?? [];
    const reconciliations: ReconciliationRow[] = reconciliation?.reconciliations ?? [];

    const worstTier = covenantTests?.worstTier ?? "not_assessed";

    return (
      <main className="shell">
        {/* Header */}
        <section className="hero">
          <div className="hero-body">
            <p className="section-eyebrow">
              <Link href="/jps">JPS</Link> ·{" "}
              <Link href={`/jps/${slug}`}>{deal.name}</Link> · Analytics
            </p>
            <h1 className="hero-title">{periodDetail.periodLabel}</h1>
            <p className="hero-sub">
              {deal.borrower} · {periodDetail.periodEnd} ·{" "}
              <span className={`badge ${tierTone(worstTier)} badge-sm`}>
                {tierLabel(worstTier)}
              </span>
            </p>
          </div>
        </section>

        {/* Period metadata */}
        <section className="panel section-panel">
          <header className="panel-heading">
            <p className="panel-eyebrow">Period</p>
            <h2 className="panel-title">Reporting period details</h2>
          </header>
          <dl className="topsheet-definition-grid">
            <div><dt>Period label</dt><dd>{periodDetail.periodLabel}</dd></div>
            <div><dt>Period end</dt><dd>{periodDetail.periodEnd}</dd></div>
            <div><dt>Frequency</dt><dd>{periodDetail.periodFrequency?.replace(/_/g, " ") ?? "—"}</dd></div>
            <div><dt>Source document</dt><dd>{periodDetail.sourceDocumentName ?? "—"}</dd></div>
            <div><dt>Received</dt><dd>{periodDetail.receivedDate ?? "—"}</dd></div>
            <div><dt>Approval tier</dt><dd>{periodDetail.approvalTier?.replace(/_/g, " ") ?? "—"}</dd></div>
            <div><dt>Approved by</dt><dd>{periodDetail.approvedBy ?? "—"}</dd></div>
            <div>
              <dt>Reconciliation</dt>
              <dd>
                {periodDetail.ratioReconciliationStatus ? (
                  <span className={`badge ${reconTone(periodDetail.ratioReconciliationStatus)} badge-sm`}>
                    {periodDetail.ratioReconciliationStatus.replace(/_/g, " ")}
                  </span>
                ) : (
                  <span className="badge neutral badge-sm">not run</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* Actual metrics */}
        {Object.keys(periodDetail.actualMetrics ?? {}).length > 0 && (
          <section className="panel section-panel">
            <header className="panel-heading">
              <p className="panel-eyebrow">Actuals</p>
              <h2 className="panel-title">Reported financial metrics</h2>
            </header>
            <div className="jps-metrics-grid">
              {Object.entries(periodDetail.actualMetrics).map(([key, val]) => (
                <dl key={key} className="jps-metric-card">
                  <dt>{key.replace(/_/g, " ")}</dt>
                  <dd>{typeof val === "number" ? val.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(val)}</dd>
                </dl>
              ))}
            </div>
          </section>
        )}

        {/* Variance report */}
        <section className="panel section-panel">
          <header className="panel-heading">
            <p className="panel-eyebrow">Variance Analysis</p>
            <h2 className="panel-title">
              Actual vs base case
              {varianceReport && (
                <span style={{ marginLeft: 12, fontSize: "1rem", fontWeight: 500, color: "var(--ink-soft)" }}>
                  Score: {varianceReport.summaryScore}/100
                </span>
              )}
            </h2>
          </header>
          {variances.length === 0 ? (
            <article className="topsheet-note topsheet-note-info">
              <strong>No variance data available</strong>
              <p>Run the analytics engine after importing actuals and a base case forecast to generate variance analysis.</p>
            </article>
          ) : (
            <div className="jps-table-wrap">
              <table className="jps-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th className="jps-num">Actual</th>
                    <th className="jps-num">Base case</th>
                    <th className="jps-num">Variance</th>
                    <th className="jps-num">Variance %</th>
                    <th>Direction</th>
                    <th>Materiality</th>
                  </tr>
                </thead>
                <tbody>
                  {variances.map((v) => (
                    <tr key={v.metricKey}>
                      <td><strong>{v.metricKey.replace(/_/g, " ")}</strong></td>
                      <td className="jps-num">{num(v.actualValue)}</td>
                      <td className="jps-num">{num(v.expectedValue)}</td>
                      <td className={`jps-num ${v.adverse ? "jps-adverse" : "jps-favourable"}`}>
                        {num(v.varianceValue)}
                      </td>
                      <td className={`jps-num ${v.adverse ? "jps-adverse" : "jps-favourable"}`}>
                        {pct(v.variancePct / 100)}
                      </td>
                      <td>{v.direction}</td>
                      <td>
                        <span className={`badge ${materialityTone(v.materiality)} badge-sm`}>
                          {v.materiality}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {varianceReport?.errors && varianceReport.errors.length > 0 && (
            <article className="topsheet-note topsheet-note-critical" style={{ marginTop: 12 }}>
              <strong>Variance engine warnings</strong>
              <p>{varianceReport.errors.join("; ")}</p>
            </article>
          )}
        </section>

        {/* Covenant tests */}
        <section className="panel section-panel">
          <header className="panel-heading">
            <p className="panel-eyebrow">Covenant Testing</p>
            <h2 className="panel-title">
              Test results
              {covenantTests && (
                <span style={{ marginLeft: 12 }}>
                  <span className={`badge ${tierTone(covenantTests.worstTier)} badge-sm`}>
                    Worst: {tierLabel(covenantTests.worstTier)}
                  </span>
                </span>
              )}
            </h2>
          </header>
          {tests.length === 0 ? (
            <article className="topsheet-note topsheet-note-info">
              <strong>No covenant test results</strong>
              <p>Configure covenant thresholds and run the analytics engine to generate test results.</p>
            </article>
          ) : (
            <div className="jps-table-wrap">
              <table className="jps-table">
                <thead>
                  <tr>
                    <th>Covenant</th>
                    <th>Type</th>
                    <th className="jps-num">Ratio value</th>
                    <th className="jps-num">Borrower reported</th>
                    <th className="jps-num">Lock-up</th>
                    <th className="jps-num">Trigger</th>
                    <th className="jps-num">Default</th>
                    <th>Status</th>
                    <th>Headroom to lockup</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => {
                    const hClass = headroomClass(t.headroomToLockup, t.lockupThreshold);
                    const hWidth = headroomWidth(t.headroomToLockup, t.lockupThreshold);
                    return (
                      <tr key={t.id}>
                        <td><strong>{t.covenantName}</strong></td>
                        <td>{t.testType?.replace(/_/g, " ") ?? "—"}</td>
                        <td className="jps-num">
                          {t.ratioValue != null ? num(t.ratioValue) : <span className="jps-blank">—</span>}
                        </td>
                        <td className="jps-num">
                          {t.borrowerReportedValue != null ? num(t.borrowerReportedValue) : <span className="jps-blank">—</span>}
                        </td>
                        <td className="jps-num">
                          {t.lockupThreshold != null ? num(t.lockupThreshold) : <span className="jps-blank">—</span>}
                        </td>
                        <td className="jps-num">
                          {t.triggerThreshold != null ? num(t.triggerThreshold) : <span className="jps-blank">—</span>}
                        </td>
                        <td className="jps-num">
                          {t.defaultThreshold != null ? num(t.defaultThreshold) : <span className="jps-blank">—</span>}
                        </td>
                        <td>
                          <span className={`badge ${tierTone(t.tierStatus)} badge-sm`}>
                            {tierLabel(t.tierStatus)}
                          </span>
                        </td>
                        <td style={{ minWidth: 140 }}>
                          {t.headroomToLockup != null && t.lockupThreshold != null ? (
                            <div className="jps-headroom-bar">
                              <div className="jps-headroom-track">
                                <div
                                  className={`jps-headroom-fill ${hClass}`}
                                  style={{ width: `${hWidth}%` }}
                                />
                              </div>
                              <span className="jps-headroom-label">{num(t.headroomToLockup)}</span>
                            </div>
                          ) : (
                            <span className="jps-blank">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Ratio reconciliation */}
        <section className="panel section-panel">
          <header className="panel-heading">
            <p className="panel-eyebrow">Reconciliation</p>
            <h2 className="panel-title">
              Borrower vs platform ratios
              {reconciliation && (
                <span style={{ marginLeft: 12 }}>
                  <span className={`badge ${reconTone(reconciliation.overallStatus)} badge-sm`}>
                    {reconciliation.overallStatus.replace(/_/g, " ")}
                  </span>
                </span>
              )}
            </h2>
          </header>
          {reconciliations.length === 0 ? (
            <article className="topsheet-note topsheet-note-info">
              <strong>No reconciliation data</strong>
              <p>Borrower-reported ratios and platform-computed ratios are needed to run reconciliation.</p>
            </article>
          ) : (
            <div className="jps-table-wrap">
              <table className="jps-table">
                <thead>
                  <tr>
                    <th>Ratio</th>
                    <th className="jps-num">Borrower reported</th>
                    <th className="jps-num">Platform computed</th>
                    <th className="jps-num">Variance</th>
                    <th className="jps-num">Variance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reconciliations.map((r) => (
                    <tr key={r.ratioKey}>
                      <td><strong>{r.ratioKey.replace(/_/g, " ")}</strong></td>
                      <td className="jps-num">
                        {r.borrowerReported != null ? num(r.borrowerReported) : <span className="jps-blank">—</span>}
                      </td>
                      <td className="jps-num">
                        {r.platformComputed != null ? num(r.platformComputed) : <span className="jps-blank">—</span>}
                      </td>
                      <td className={`jps-num ${r.variance != null && r.variance < 0 ? "jps-adverse" : ""}`}>
                        {r.variance != null ? num(r.variance) : <span className="jps-blank">—</span>}
                      </td>
                      <td className="jps-num">
                        {r.variancePct != null ? pct(r.variancePct / 100) : <span className="jps-blank">—</span>}
                      </td>
                      <td>
                        <span className={`badge ${reconTone(r.status)} badge-sm`}>
                          {r.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Borrower narrative */}
        {periodDetail.borrowerNarrative && (
          <section className="panel section-panel">
            <header className="panel-heading">
              <p className="panel-eyebrow">Narrative</p>
              <h2 className="panel-title">Borrower commentary</h2>
            </header>
            <article className="topsheet-description">
              <p>{periodDetail.borrowerNarrative}</p>
            </article>
          </section>
        )}
      </main>
    );
  } catch {
    notFound();
  }
}
