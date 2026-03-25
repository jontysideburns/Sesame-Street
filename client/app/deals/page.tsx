import Link from "next/link";
import { getDeals } from "../../api/deals";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export default async function DealsIndexPage() {
  const deals = await getDeals();

  return (
    <main className="shell">
      <section className="hero compact">
        <div>
          <p className="eyebrow">Deal workspace</p>
          <h1>Navigate the portfolio by deal, not by data table.</h1>
          <p className="hero-copy">
            Each deal acts as the parent workspace for covenant status,
            compliance schedule, source documents, and period-by-period
            monitoring.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">All deals</p>
            <h2>Current monitored deals</h2>
          </div>
        </div>
        <div className="list-grid">
          {deals.map((deal) => (
            <Link key={deal.slug} href={`/deals/${deal.slug}`} className="deal-list-card">
              <div className="tag-row">
                <span className="badge neutral">{deal.grade}</span>
                <span className={`badge ${deal.watchlist ? "warning" : "good"}`}>
                  {deal.watchlist ? "Watchlist" : "Stable"}
                </span>
              </div>
              <h3>{deal.name}</h3>
              <p>{deal.summary}</p>
              <div className="status-row">
                <span>Exposure</span>
                <strong>{formatMoney(deal.exposure)}</strong>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
