import Link from "next/link";
import { getPortfolio } from "../../api/portfolio";

function gradeTone(grade: string) {
  if (grade.startsWith("1")) return "good";
  if (grade.startsWith("2")) return "good";
  if (grade.startsWith("3")) return "warning";
  return "critical";
}

function tierTone(status: string) {
  if (status === "event_of_default" || status === "trigger_event") return "critical";
  if (status === "distribution_lockup") return "warning";
  return "good";
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0
  }).format(n);
}

export default async function JpsPage() {
  const portfolio = await getPortfolio();
  const deals = portfolio.deals ?? [];

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-body">
          <p className="section-eyebrow">JPS</p>
          <h1 className="hero-title">Analytics Workbench</h1>
          <p className="hero-sub">
            TopSheet import, covenant testing, variance analysis and ratio
            reconciliation. Select a deal to view its analytics.
          </p>
        </div>
      </section>

      <section className="panel section-panel">
        <header className="panel-heading">
          <p className="panel-eyebrow">Deals</p>
          <h2 className="panel-title">Select a deal</h2>
        </header>

        <div className="jps-deal-grid">
          {deals.map((deal) => (
            <Link
              key={deal.dealSlug}
              href={`/jps/${deal.dealSlug}`}
              className="jps-deal-card"
            >
              <div className="jps-deal-card-header">
                <strong className="jps-deal-name">{deal.dealName}</strong>
                <span className={`badge ${gradeTone(deal.grade)}`}>{deal.grade}</span>
              </div>
              <p className="jps-deal-borrower">{deal.borrower}</p>
              <dl className="jps-deal-meta">
                <div>
                  <dt>Exposure</dt>
                  <dd>{fmt(deal.exposure)}</dd>
                </div>
                <div>
                  <dt>DSCR</dt>
                  <dd>{deal.reportedDscr != null ? `${deal.reportedDscr.toFixed(2)}x` : "—"}</dd>
                </div>
                <div>
                  <dt>Covenant</dt>
                  <dd>
                    <span className={`badge ${tierTone(deal.covenantStatus)} badge-sm`}>
                      {deal.covenantStatus.replace(/_/g, " ")}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Watchlist</dt>
                  <dd>{deal.watchlist ? <span className="badge warning badge-sm">On watchlist</span> : <span className="badge good badge-sm">Standard</span>}</dd>
                </div>
              </dl>
              <p className="jps-deal-cta">View analytics →</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
