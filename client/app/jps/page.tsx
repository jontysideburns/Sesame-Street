import { getPortfolio } from "../../api/portfolio";
import JpsFilterGrid from "./jps-filter-grid";

export default async function JpsPage() {
  let deals: any[] = [];
  let organisations: any[] = [];
  let owners: any[] = [];
  let sectors: string[] = [];
  let grades: string[] = [];
  let loadError = false;

  try {
    const portfolio = await getPortfolio();
    deals = portfolio.deals ?? [];
    organisations = portfolio.hierarchy?.organisations ?? [];
    owners = portfolio.hierarchy?.owners ?? [];
    sectors = portfolio.availableFilters?.sectors ?? [];
    grades = portfolio.availableFilters?.grades ?? [];
  } catch {
    loadError = true;
  }

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

        {loadError ? (
          <article className="topsheet-note topsheet-note-info">
            <strong>Backend unavailable</strong>
            <p>Deals will appear here once the server is running.</p>
          </article>
        ) : deals.length === 0 ? (
          <article className="topsheet-note topsheet-note-info">
            <strong>No deals found</strong>
            <p>No deals have been configured in the system yet.</p>
          </article>
        ) : (
          <JpsFilterGrid
            deals={deals}
            organisations={organisations}
            owners={owners}
            sectors={sectors}
            grades={grades}
          />
        )}
      </section>
    </main>
  );
}
