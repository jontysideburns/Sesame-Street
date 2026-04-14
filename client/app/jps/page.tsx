import { getPortfolio } from "../../api/portfolio";
import JpsFilterGrid from "./jps-filter-grid";
import PrintButton from "./print-button";
import CurrencyToggle from "./currency-toggle";

type PageProps = {
  searchParams?: Promise<{ currency?: string }>;
};

export default async function JpsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const currency = (params.currency ?? "GBP").toUpperCase();
  const reportingCurrency: "GBP" | "USD" | "EUR" =
    currency === "USD" || currency === "EUR" ? currency : "GBP";

  let deals: any[] = [];
  let organisations: any[] = [];
  let owners: any[] = [];
  let sectors: string[] = [];
  let grades: string[] = [];
  let fxAsOf: string | null = null;
  let fxSource: string | null = null;
  let loadError = false;

  try {
    const portfolio = await getPortfolio({ reportingCurrency });
    deals = portfolio.deals ?? [];
    organisations = portfolio.hierarchy?.organisations ?? [];
    owners = portfolio.hierarchy?.owners ?? [];
    sectors = portfolio.availableFilters?.sectors ?? [];
    grades = portfolio.availableFilters?.grades ?? [];
    fxAsOf = portfolio.fxSnapshot?.asOf ?? null;
    fxSource = portfolio.fxSnapshot?.source ?? null;
  } catch {
    loadError = true;
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-body">
          <p className="section-eyebrow">Dashboard</p>
          <h1 className="hero-title" style={{ whiteSpace: "nowrap", fontSize: "1.88rem" }}>Portfolio Summary</h1>
          <p className="hero-sub" style={{ whiteSpace: "nowrap" }}>
            TopSheet import, covenant testing, variance analysis and ratio reconciliation.
          </p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <CurrencyToggle current={reportingCurrency} fxAsOf={fxAsOf} fxSource={fxSource} />
            <PrintButton />
          </div>
        </div>
      </section>

      <section className="panel section-panel">
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
            reportingCurrency={reportingCurrency}
          />
        )}
      </section>
    </main>
  );
}
