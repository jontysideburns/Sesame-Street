import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeal } from "../../../api/deals";
import { getCovenantConfig, getActualPeriods } from "../../../api/jps";
import RevenueRiskTooltip from "../../../components/revenue-risk-tooltip";

function tierTone(tier: string) {
  if (tier === "event_of_default" || tier === "trigger_event") return "critical";
  if (tier === "distribution_lockup") return "warning";
  if (tier === "not_assessed") return "neutral";
  return "good";
}

function tierLabel(tier: string) {
  return tier.replace(/_/g, " ");
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(n);
}

export default async function JpsDealPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  try {
    const [deal, covenantConfig, actualsData] = await Promise.all([
      getDeal(slug),
      getCovenantConfig(slug).catch(() => ({ covenants: [] })),
      getActualPeriods(slug).catch(() => ({ actuals: [] }))
    ]);

    const covenants = covenantConfig.covenants;
    const actuals = actualsData.actuals;

    return (
      <main className="shell">
        {/* Header */}
        <section className="hero">
          <div className="hero-body">
            <p className="section-eyebrow">
              <Link href="/jps">JPS</Link> · Analytics
            </p>
            <h1 className="hero-title">{deal.name}</h1>
            <p className="hero-sub">{deal.borrower} · {deal.dealType} · {deal.region}</p>
          </div>
        </section>

        {/* Deal snapshot */}
        <section className="panel section-panel">
          <header className="panel-heading">
            <p className="panel-eyebrow">TopSheet</p>
            <h2 className="panel-title">Deal overview</h2>
          </header>
          <div className="jps-kv-grid">
            <dl className="topsheet-definition-grid">
              <div><dt>Borrower</dt><dd>{deal.borrower}</dd></div>
              <div><dt>Sector</dt><dd>{deal.sector}</dd></div>
              <div><dt>Type</dt><dd>{deal.dealType}</dd></div>
              <div><dt>Phase</dt><dd>{deal.phase}</dd></div>
              <div><dt>Region</dt><dd>{deal.region}</dd></div>
              <div><dt>Currency</dt><dd>{deal.currency}</dd></div>
              <div><dt>Facility</dt><dd>{fmt(deal.facilityAmount)}</dd></div>
              <div><dt>Exposure</dt><dd>{fmt(deal.exposure)}</dd></div>
              <div><dt>Revenue risk</dt><dd><RevenueRiskTooltip code={deal.revenueRisk} /></dd></div>
              <div><dt>Grade</dt><dd>{deal.grade}</dd></div>
              <div><dt>Watchlist</dt><dd>{deal.watchlist ? "Yes" : "No"}</dd></div>
              <div><dt>Status</dt><dd>{deal.status}</dd></div>
            </dl>
            <article className="topsheet-description">
              <p>{deal.dealOverview}</p>
            </article>
          </div>
        </section>

        {/* Covenant configuration */}
        <section className="panel section-panel">
          <header className="panel-heading">
            <p className="panel-eyebrow">F.6 Configuration</p>
            <h2 className="panel-title">Covenant thresholds</h2>
          </header>
          {covenants.length === 0 ? (
            <article className="topsheet-note topsheet-note-info">
              <strong>No covenant thresholds configured</strong>
              <p>Import a TopSheet template to configure covenants for this deal.</p>
            </article>
          ) : (
            <div className="jps-table-wrap">
              <table className="jps-table">
                <thead>
                  <tr>
                    <th>Covenant</th>
                    <th>Ratio</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Direction</th>
                    <th>Lock-up</th>
                    <th>Trigger</th>
                    <th>Default</th>
                    <th>Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  {covenants.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.covenantName}</strong></td>
                      <td><code className="jps-code">{c.ratioName}</code></td>
                      <td>{c.covenantCategory?.replace(/_/g, " ")}</td>
                      <td>{c.testType?.replace(/_/g, " ")}</td>
                      <td className="jps-center">{c.direction}</td>
                      <td className="jps-num">{c.lockupLevel != null ? c.lockupLevel.toFixed(2) : <span className="jps-blank">—</span>}</td>
                      <td className="jps-num">{c.triggerLevel != null ? c.triggerLevel.toFixed(2) : <span className="jps-blank">—</span>}</td>
                      <td className="jps-num">{c.defaultLevel != null ? c.defaultLevel.toFixed(2) : <span className="jps-blank">—</span>}</td>
                      <td>{c.testFrequency?.replace(/_/g, " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Risk register link */}
        <section className="panel section-panel">
          <header className="panel-heading">
            <p className="panel-eyebrow">F.11 Risk Register</p>
            <h2 className="panel-title">Full risk register</h2>
          </header>
          <p style={{ margin: "0 0 12px", color: "var(--ink-soft)", fontSize: "0.9rem" }}>
            226-risk taxonomy covering credit, structural, operational, market, regulatory, ESG, and sector-specific risks. Filterable by category, score, and mitigation quality.
          </p>
          <Link href={`/jps/${slug}/risk-register`} className="jps-action-link" style={{ fontSize: "0.95rem" }}>
            Open risk register →
          </Link>
        </section>

        {/* Actuals periods */}
        <section className="panel section-panel">
          <header className="panel-heading">
            <p className="panel-eyebrow">Actuals</p>
            <h2 className="panel-title">Imported reporting periods</h2>
          </header>
          {actuals.length === 0 ? (
            <article className="topsheet-note topsheet-note-info">
              <strong>No actuals imported yet</strong>
              <p>Import a TopSheet template with actuals data to enable variance and covenant analysis.</p>
            </article>
          ) : (
            <div className="jps-table-wrap">
              <table className="jps-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Period end</th>
                    <th>Source document</th>
                    <th>Received</th>
                    <th>Approval tier</th>
                    <th>Reconciliation</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {actuals.map((a) => {
                    const reconTone =
                      a.ratioReconciliationStatus === "material_variance" || a.ratioReconciliationStatus === "unreconciled"
                        ? "critical"
                        : a.ratioReconciliationStatus === "minor_variance"
                        ? "warning"
                        : a.ratioReconciliationStatus === "matched"
                        ? "good"
                        : "neutral";
                    return (
                      <tr key={a.id}>
                        <td><strong>{a.periodLabel}</strong></td>
                        <td>{a.periodEnd}</td>
                        <td>{a.sourceDocumentName ?? <span className="jps-blank">—</span>}</td>
                        <td>{a.receivedDate ?? <span className="jps-blank">—</span>}</td>
                        <td>{a.approvalTier?.replace(/_/g, " ") ?? <span className="jps-blank">—</span>}</td>
                        <td>
                          {a.ratioReconciliationStatus ? (
                            <span className={`badge ${reconTone} badge-sm`}>
                              {a.ratioReconciliationStatus.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="badge neutral badge-sm">not run</span>
                          )}
                        </td>
                        <td>
                          <Link
                            href={`/jps/${slug}/${a.periodFlag}`}
                            className="jps-action-link"
                          >
                            Analyse →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Risk Register */}
        {deal.riskRegister && deal.riskRegister.length > 0 && (
          <section className="panel section-panel">
            <header className="panel-heading">
              <p className="panel-eyebrow">F.11 Risk Register</p>
              <h2 className="panel-title">Risk entries</h2>
            </header>
            <div className="jps-table-wrap">
              <table className="jps-table">
                <thead>
                  <tr>
                    <th>Risk ID</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Likelihood</th>
                    <th>Severity</th>
                    <th>Trend</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {deal.riskRegister.map((r: any) => (
                    <tr key={r.id}>
                      <td><code className="jps-code">{r.riskId ?? r.id}</code></td>
                      <td><strong>{r.riskName ?? r.title}</strong></td>
                      <td>{r.riskCategory ?? r.risk_category}</td>
                      <td>{r.likelihood ?? r.probability}</td>
                      <td>{r.severity}</td>
                      <td>{r.trend ?? "—"}</td>
                      <td className="jps-num">{r.score != null ? r.score.toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    );
  } catch {
    notFound();
  }
}
