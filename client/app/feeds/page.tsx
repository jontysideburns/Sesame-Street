import { getFxSnapshot, type FxSnapshot } from "../../api/fx";

export const metadata = { title: "Market TopSheet — Sesame Street" };

const CURRENCY_NAMES: Record<string, string> = {
  EUR: "Euro",
  USD: "US Dollar",
  GBP: "British Pound",
  JPY: "Japanese Yen",
  CHF: "Swiss Franc",
  AUD: "Australian Dollar",
  CAD: "Canadian Dollar",
  NOK: "Norwegian Krone",
  SEK: "Swedish Krona",
  DKK: "Danish Krone",
  NZD: "New Zealand Dollar",
  SGD: "Singapore Dollar",
  HKD: "Hong Kong Dollar",
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "\u20AC", USD: "$", GBP: "\u00A3", JPY: "\u00A5",
  CHF: "Fr", AUD: "A$", CAD: "C$", NOK: "kr", SEK: "kr", DKK: "kr",
  NZD: "NZ$", SGD: "S$", HKD: "HK$",
};

function fmtRate(rate: number) {
  if (rate >= 100) return rate.toFixed(2);
  if (rate >= 10) return rate.toFixed(3);
  return rate.toFixed(4);
}

export default async function FeedsPage() {
  let fx: FxSnapshot | null = null;
  let loadError = false;

  try {
    fx = await getFxSnapshot("GBP");
  } catch {
    loadError = true;
  }

  const fxRows = fx
    ? Object.entries(fx.rates)
        .filter(([ccy]) => ccy !== fx!.baseCurrency)
        .sort(([a], [b]) => a.localeCompare(b))
    : [];

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-body">
          <p className="section-eyebrow">Reference</p>
          <h1 className="hero-title" style={{ whiteSpace: "nowrap", fontSize: "1.88rem" }}>
            Market TopSheet
          </h1>
          <p className="hero-sub">
            Centralised market-data feeds consumed by the platform API. Today: FX rates.
            Coming: interest rates, credit spreads, inflation indices, swap curves, commodity benchmarks.
          </p>
        </div>
      </section>

      <section className="panel section-panel">
        <article className="topsheet-card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            <strong style={{ fontSize: "1rem" }}>FX Reference Rates</strong>
            <span style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
              {fx ? (
                <>
                  As at <strong>{fx.asOf}</strong> · Source: <strong>{fx.source ?? "—"}</strong> · Base: <strong>{fx.baseCurrency}</strong>
                </>
              ) : (
                "Not loaded"
              )}
            </span>
          </div>
          <p className="topsheet-meta-note" style={{ marginBottom: 12 }}>
            ECB-style reference rates, EUR-base. Cross-rates for any pair are calculated as
            <code style={{ marginLeft: 4, marginRight: 4, padding: "1px 4px", background: "var(--panel-strong)", borderRadius: 3, fontSize: "0.72rem" }}>
              amount × (rate(EUR,target) ÷ rate(EUR,source))
            </code>.
            All deal-level data stays in native currency. The Dashboard converts portfolio aggregates at spot.
          </p>

          {loadError ? (
            <article className="topsheet-note topsheet-note-info">
              <strong>FX feed unavailable</strong>
              <p>The FX rates table could not be loaded from the server. Confirm that <code>fx_rates</code> is populated and the API is running.</p>
            </article>
          ) : !fx ? null : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--line-strong)", textAlign: "left" }}>
                    <th style={{ padding: "8px 12px", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)" }}>Code</th>
                    <th style={{ padding: "8px 12px", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)" }}>Currency</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)" }}>1 EUR =</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)" }}>1 GBP =</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-soft)" }}>1 USD =</th>
                  </tr>
                </thead>
                <tbody>
                  {fxRows.map(([ccy, eurRate]) => {
                    const gbpRate = fx.rates.GBP;
                    const usdRate = fx.rates.USD;
                    const fromGbp = gbpRate ? eurRate / gbpRate : null;
                    const fromUsd = usdRate ? eurRate / usdRate : null;
                    return (
                      <tr key={ccy} style={{ borderBottom: "1px solid var(--line)" }}>
                        <td style={{ padding: "6px 12px", fontWeight: 700, fontFamily: "monospace" }}>
                          <span style={{ marginRight: 6, color: "var(--ink-soft)" }}>{CURRENCY_SYMBOLS[ccy] ?? ""}</span>
                          {ccy}
                        </td>
                        <td style={{ padding: "6px 12px", color: "var(--ink-soft)" }}>{CURRENCY_NAMES[ccy] ?? ccy}</td>
                        <td style={{ padding: "6px 12px", textAlign: "right", fontFamily: "monospace" }}>{fmtRate(eurRate)}</td>
                        <td style={{ padding: "6px 12px", textAlign: "right", fontFamily: "monospace" }}>{fromGbp != null ? fmtRate(fromGbp) : "\u2014"}</td>
                        <td style={{ padding: "6px 12px", textAlign: "right", fontFamily: "monospace" }}>{fromUsd != null ? fmtRate(fromUsd) : "\u2014"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="topsheet-meta-note" style={{ marginTop: 12, fontSize: "0.7rem" }}>
            Update cadence (planned): live ECB feed via the Frankfurter API at 16:05 CET each business day, or on first login of the day if the daily snapshot is stale. Today the table is a static seed snapshot.
          </p>
        </article>

        <article className="topsheet-card" style={{ marginBottom: 16 }}>
          <strong style={{ fontSize: "1rem" }}>Planned Feeds</strong>
          <p className="topsheet-meta-note" style={{ marginBottom: 12 }}>
            Future market data sources that will sit alongside FX in the Market TopSheet. Each feed will be queryable from the platform API and consumable by the deal and portfolio engines.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            <FeedPlaceholder
              title="Risk-Free Interest Rates"
              examples="SONIA · €STR · SOFR · TONA · CORRA"
              uses="Floating-coupon resets, swap curve construction, valuation discount rates, NPV calcs."
            />
            <FeedPlaceholder
              title="Swap Curves"
              examples="GBP / EUR / USD IRS · OIS · cross-currency basis"
              uses="Mark-to-market of fixed-rate exposure, hedging effectiveness, scenario stress."
            />
            <FeedPlaceholder
              title="Credit Spreads"
              examples="iTraxx · CDX · sector indices · single-name CDS"
              uses="Implied default probability, spread duration, relative-value vs market."
            />
            <FeedPlaceholder
              title="Government Yields"
              examples="UK Gilts · Bunds · OATs · Treasuries"
              uses="Spread to benchmark, sovereign carry, asset-swap spreads."
            />
            <FeedPlaceholder
              title="Inflation Indices"
              examples="UK RPI / CPI / CPIH · Eurozone HICP · US CPI-U"
              uses="Indexed-revenue forecasts (utilities, regulated infra), inflation-linked bond pricing, real DSCR."
            />
            <FeedPlaceholder
              title="Commodity Benchmarks"
              examples="Brent · WTI · TTF gas · UK/EU power baseload"
              uses="Merchant power forecasts, tariff-vs-market pass-through, hedging exposure."
            />
            <FeedPlaceholder
              title="Equity & Property Indices"
              examples="FTSE 100 · STOXX 600 · MSCI World · IPD UK Property"
              uses="Sponsor-equity proxy, real-estate covenant collateral marks, peer-set comparisons."
            />
            <FeedPlaceholder
              title="Carbon & ESG"
              examples="EU ETS · UK ETS · GHG factors"
              uses="Scope 1/2 cost forecasts, transition-risk stress, ESG covenant reporting."
            />
          </div>
        </article>
      </section>
    </main>
  );
}

function FeedPlaceholder({
  title,
  examples,
  uses,
}: {
  title: string;
  examples: string;
  uses: string;
}) {
  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "10px 12px",
        background: "var(--panel-strong)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <strong style={{ fontSize: "0.86rem" }}>{title}</strong>
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--warning)",
            border: "1px solid var(--warning)",
            borderRadius: 3,
            padding: "1px 5px",
          }}
        >
          Planned
        </span>
      </div>
      <p style={{ fontSize: "0.72rem", color: "var(--ink-soft)", margin: "2px 0 6px" }}>
        <strong style={{ color: "var(--ink)" }}>Examples:</strong> {examples}
      </p>
      <p style={{ fontSize: "0.72rem", color: "var(--ink-soft)", margin: 0 }}>
        <strong style={{ color: "var(--ink)" }}>Uses:</strong> {uses}
      </p>
    </div>
  );
}
