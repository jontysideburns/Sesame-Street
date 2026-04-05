import {
  PRICING_MECHANISMS,
  VOLUME_MECHANISMS,
  DURATION_CATEGORIES,
  type RiskCode,
  type DurationCode,
} from "../../lib/revenue-risk-template";
import { getRiskTemplate, type DealClassification } from "../../api/plumbing";
import { fetchJson } from "../../api/http";
import DataArchitecture from "./data-architecture";
import FinancialTemplatePreview, { type TemplateRow } from "./financial-template-preview";

const riskLevelTone: Record<string, string> = {
  very_low: "good",
  low: "good",
  moderate: "warning",
  high: "critical",
  very_high: "critical",
};

const riskLevelLabel: Record<string, string> = {
  very_low: "Very low",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  very_high: "Very high",
};

function CodeRow({ item, showSectors }: { item: RiskCode | DurationCode; showSectors: boolean }) {
  return (
    <tr>
      <td style={{ width: "4rem", verticalAlign: "top" }}>
        <code className="jps-code" style={{ fontSize: "0.9rem", fontWeight: 700 }}>
          {item.code}
        </code>
      </td>
      <td style={{ verticalAlign: "top" }}>
        <strong style={{ display: "block", marginBottom: 2 }}>{item.name}</strong>
        <span style={{ color: "var(--ink-soft)", fontSize: "0.85rem", lineHeight: 1.5 }}>
          {item.description}
        </span>
      </td>
      {showSectors && "typicalSectors" in item && (
        <td style={{ verticalAlign: "top", fontSize: "0.83rem", color: "var(--ink-soft)" }}>
          {item.typicalSectors}
        </td>
      )}
      <td style={{ verticalAlign: "top", fontSize: "0.83rem", color: "var(--ink-soft)" }}>
        {item.riskImplication}
      </td>
    </tr>
  );
}

export default async function PlumbingPage() {
  // Static template data — always available
  const pMap = Object.fromEntries(PRICING_MECHANISMS.map((x) => [x.code, x.name]));
  const vMap = Object.fromEntries(VOLUME_MECHANISMS.map((x) => [x.code, x.name]));
  const dMap = Object.fromEntries(DURATION_CATEGORIES.map((x) => [x.code, x.name]));

  // Deal classifications — fetched from backend, graceful fallback
  let dealClassifications: DealClassification[] = [];
  let classificationError = false;
  try {
    const data = await getRiskTemplate();
    dealClassifications = data.dealClassifications;
  } catch {
    classificationError = true;
  }

  // Financial template preview — fetch all templates
  let templates: TemplateRow[] = [];
  let templateError = false;
  try {
    const deals = await fetchJson<{ deals: { dealSlug: string; dealName: string }[] }>("/api/portfolio");
    const slugs = (deals.deals ?? []).map((d: { dealSlug: string }) => d.dealSlug);
    for (const slug of slugs) {
      try {
        const resp = await fetchJson<{ dealSlug: string; template: Record<string, unknown> | null }>(
          `/api/deals/${slug}/financial-template`
        );
        if (resp.template) {
          const t = resp.template;
          const categoryMap: [string, string][] = [
            ["revenue_line_labels", "Revenue"],
            ["cost_line_labels", "Operating Costs"],
            ["growth_capex_labels", "Growth Capex"],
            ["maintenance_capex_labels", "Maintenance Capex"],
            ["capex_line_labels", "Capital Expenditure"],
            ["funding_line_labels", "Funding / Debt"],
            ["ds_line_labels", "Debt Service"],
            ["equity_line_labels", "Equity Returns"],
            ["sector_kpi_labels", "Sector KPIs"],
            ["class_ratio_labels", "Class Ratios"],
            ["rab_leverage_labels", "RAB / Leverage"],
          ];
          const categories = categoryMap
            .map(([key, label]) => ({ key, label, lines: (t[key] as string[]) || [] }))
            .filter((c) => c.lines.length > 0);
          const totalLines = categories.reduce((sum, c) => sum + c.lines.length, 0);
          templates.push({
            dealSlug: slug,
            dealName: (deals.deals ?? []).find((d: { dealSlug: string }) => d.dealSlug === slug)?.dealName ?? slug,
            sectorTemplate: (t.sector_template as string) ?? "custom",
            categories,
            totalLines,
          });
        }
      } catch {
        // Skip deals without templates
      }
    }
  } catch {
    templateError = true;
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-body">
          <p className="section-eyebrow">Templates</p>
          <h1 className="hero-title">System configuration</h1>
          <p className="hero-sub">
            Reference templates and classification frameworks as currently configured.
          </p>
          <div style={{ marginTop: 12 }}>
            <a className="button secondary" href="/plumbing/risk-taxonomy" style={{ fontWeight: 700, background: "var(--accent)", color: "white", border: "none", textDecoration: "none", padding: "8px 20px", borderRadius: 10, display: "inline-block" }}>
              View Risk Taxonomy (226 risks)
            </a>
            {" "}
            <a className="button secondary" href="/plumbing/obligation-taxonomy" style={{ fontWeight: 700, background: "var(--accent)", color: "white", border: "none", textDecoration: "none", padding: "8px 20px", borderRadius: 10, display: "inline-block" }}>
              View Obligation & Covenant Taxonomy (229 items)
            </a>
          </div>
        </div>
      </section>

      {/* Data Architecture */}
      <section className="panel section-panel">
        <header className="panel-heading">
          <p className="panel-eyebrow">Schema</p>
          <h2 className="panel-title">Data architecture</h2>
        </header>
        <DataArchitecture />
      </section>

      {/* Financial Template Preview */}
      <section className="panel section-panel">
        <header className="panel-heading">
          <p className="panel-eyebrow">Financial Model</p>
          <h2 className="panel-title">Financial template preview</h2>
        </header>
        {templateError ? (
          <article className="topsheet-note topsheet-note-info">
            <strong>Backend unavailable</strong>
            <p>Financial templates will appear here once the server is running.</p>
          </article>
        ) : templates.length === 0 ? (
          <article className="topsheet-note topsheet-note-info">
            <strong>No templates configured</strong>
            <p>No deals have a financial template configured yet. Templates define the revenue, cost, capex, and KPI line items that will be recorded for each reporting period.</p>
          </article>
        ) : (
          <FinancialTemplatePreview templates={templates} />
        )}
      </section>

      {/* Portfolio classifications */}
      <section className="panel section-panel">
        <header className="panel-heading">
          <p className="panel-eyebrow">Revenue Risk</p>
          <h2 className="panel-title">Deal classifications</h2>
        </header>
        {classificationError ? (
          <article className="topsheet-note topsheet-note-info">
            <strong>Backend unavailable</strong>
            <p>Deal classifications will appear here once the server is running.</p>
          </article>
        ) : dealClassifications.length === 0 ? (
          <article className="topsheet-note topsheet-note-info">
            <strong>No deals found</strong>
            <p>No deals have been configured in the system yet.</p>
          </article>
        ) : (
          <div className="jps-table-wrap">
            <table className="jps-table">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Composite</th>
                  <th>Pricing (P)</th>
                  <th>Volume (V)</th>
                  <th>Duration (D)</th>
                  <th>Risk level</th>
                </tr>
              </thead>
              <tbody>
                {dealClassifications.map((d: DealClassification) => (
                  <tr key={d.dealSlug}>
                    <td><strong>{d.dealName}</strong></td>
                    <td>
                      <code className="jps-code" style={{ fontWeight: 700 }}>
                        {d.composite ?? <span className="jps-blank">—</span>}
                      </code>
                    </td>
                    <td>
                      {d.pricingCode ? (
                        <>
                          <code className="jps-code">{d.pricingCode}</code>
                          <span style={{ marginLeft: 6, fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                            {pMap[d.pricingCode]}
                          </span>
                        </>
                      ) : <span className="jps-blank">—</span>}
                    </td>
                    <td>
                      {d.volumeCode ? (
                        <>
                          <code className="jps-code">{d.volumeCode}</code>
                          <span style={{ marginLeft: 6, fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                            {vMap[d.volumeCode]}
                          </span>
                        </>
                      ) : <span className="jps-blank">—</span>}
                    </td>
                    <td>
                      {d.durationCode ? (
                        <>
                          <code className="jps-code">{d.durationCode}</code>
                          <span style={{ marginLeft: 6, fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                            {dMap[d.durationCode]}
                          </span>
                        </>
                      ) : <span className="jps-blank">—</span>}
                    </td>
                    <td>
                      {d.riskLevel ? (
                        <span className={`badge ${riskLevelTone[d.riskLevel] ?? "neutral"} badge-sm`}>
                          {riskLevelLabel[d.riskLevel] ?? d.riskLevel}
                        </span>
                      ) : <span className="jps-blank">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Pricing mechanisms */}
      <section className="panel section-panel">
        <header className="panel-heading">
          <p className="panel-eyebrow">Dimension 1 — Pricing</p>
          <h2 className="panel-title">Pricing mechanisms (P1 – P6)</h2>
        </header>
        <div className="jps-table-wrap">
          <table className="jps-table">
            <thead>
              <tr>
                <th style={{ width: "4rem" }}>Code</th>
                <th>Name &amp; description</th>
                <th>Typical sectors</th>
                <th>Risk implication</th>
              </tr>
            </thead>
            <tbody>
              {PRICING_MECHANISMS.map((item) => (
                <CodeRow key={item.code} item={item} showSectors={true} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Volume mechanisms */}
      <section className="panel section-panel">
        <header className="panel-heading">
          <p className="panel-eyebrow">Dimension 2 — Volume</p>
          <h2 className="panel-title">Volume / demand mechanisms (V1 – V6)</h2>
        </header>
        <div className="jps-table-wrap">
          <table className="jps-table">
            <thead>
              <tr>
                <th style={{ width: "4rem" }}>Code</th>
                <th>Name &amp; description</th>
                <th>Typical sectors</th>
                <th>Risk implication</th>
              </tr>
            </thead>
            <tbody>
              {VOLUME_MECHANISMS.map((item) => (
                <CodeRow key={item.code} item={item} showSectors={true} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Duration categories */}
      <section className="panel section-panel">
        <header className="panel-heading">
          <p className="panel-eyebrow">Dimension 3 — Duration</p>
          <h2 className="panel-title">Revenue duration (D1 – D5)</h2>
        </header>
        <div className="jps-table-wrap">
          <table className="jps-table">
            <thead>
              <tr>
                <th style={{ width: "4rem" }}>Code</th>
                <th>Name &amp; description</th>
                <th>Risk implication</th>
              </tr>
            </thead>
            <tbody>
              {DURATION_CATEGORIES.map((item) => (
                <CodeRow key={item.code} item={item} showSectors={false} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
