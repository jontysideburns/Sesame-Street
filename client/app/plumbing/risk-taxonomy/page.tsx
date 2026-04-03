import Link from "next/link";
import { fetchJson } from "../../../api/http";

type Risk = {
  risk_id: string;
  risk_name: string;
  category_code: string;
  category_name: string;
  category_number: number;
  sub_sector: string | null;
  description: string | null;
  typical_sectors: string | null;
  key_indicators: string | null;
  sort_order: number;
};

type Category = {
  number: number;
  name: string;
  code: string;
  risks: Risk[];
  subSectors: string[];
};

export default async function RiskTaxonomyPage() {
  let categories: Category[] = [];
  let totalRisks = 0;
  let loadError = false;

  try {
    const data = await fetchJson<{ risks: Risk[] }>("/api/risk-taxonomy");
    const risks = data.risks ?? [];
    totalRisks = risks.length;

    // Group by category
    const catMap = new Map<number, Category>();
    for (const r of risks) {
      if (!catMap.has(r.category_number)) {
        catMap.set(r.category_number, {
          number: r.category_number,
          name: r.category_name,
          code: r.category_code,
          risks: [],
          subSectors: [],
        });
      }
      const cat = catMap.get(r.category_number)!;
      cat.risks.push(r);
      if (r.sub_sector && !cat.subSectors.includes(r.sub_sector)) {
        cat.subSectors.push(r.sub_sector);
      }
    }
    categories = Array.from(catMap.values()).sort((a, b) => a.number - b.number);
  } catch {
    loadError = true;
  }

  const th: React.CSSProperties = {
    padding: "6px 8px", textAlign: "left", fontWeight: 700, fontSize: "0.70rem",
    textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)",
    borderBottom: "2px solid var(--line)", whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "5px 8px", fontSize: "0.78rem", borderBottom: "1px solid var(--line)", verticalAlign: "top",
  };

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-body">
          <p className="section-eyebrow">Templates</p>
          <h1 className="hero-title" style={{ whiteSpace: "nowrap" }}>Risk Taxonomy</h1>
          <p className="hero-sub">
            {totalRisks} standardised risks across {categories.length} categories. Applied consistently to every deal for portfolio-level comparability.
          </p>
          <div style={{ marginTop: 10 }}>
            <Link className="button secondary" href="/plumbing">&larr; Back to Templates</Link>
          </div>
        </div>
      </section>

      {loadError ? (
        <section className="panel section-panel">
          <article className="topsheet-note topsheet-note-info">
            <strong>Backend unavailable</strong>
            <p>Risk taxonomy will appear here once the server is running.</p>
          </article>
        </section>
      ) : (
        <>
          {/* Summary cards */}
          <section className="panel section-panel">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {categories.map((cat) => (
                <a
                  key={cat.number}
                  href={`#cat-${cat.number}`}
                  style={{
                    flex: "1 1 200px", padding: "12px 16px",
                    borderRadius: 14, border: "1px solid var(--line)",
                    background: "var(--panel)", textDecoration: "none", color: "var(--ink)",
                  }}
                >
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 4 }}>
                    Category {cat.number}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 2 }}>{cat.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
                    {cat.risks.length} risk{cat.risks.length !== 1 ? "s" : ""}
                    {cat.subSectors.length > 0 ? ` across ${cat.subSectors.length} sub-sectors` : ""}
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Category sections */}
          {categories.map((cat) => {
            // Group sector-specific risks by sub-sector
            const hasSubSectors = cat.subSectors.length > 0;
            const coreRisks = cat.risks.filter((r) => !r.sub_sector);
            const subSectorGroups = hasSubSectors
              ? cat.subSectors.map((ss) => ({
                  label: ss,
                  risks: cat.risks.filter((r) => r.sub_sector === ss),
                }))
              : [];

            return (
              <section key={cat.number} id={`cat-${cat.number}`} className="panel section-panel">
                <header className="panel-heading">
                  <p className="panel-eyebrow">Category {cat.number}</p>
                  <h2 className="panel-title">{cat.name}</h2>
                </header>

                {/* Core risks (no sub-sector) */}
                {coreRisks.length > 0 && (
                  <div className="jps-table-wrap">
                    <table className="jps-table" style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ ...th, width: "6rem" }}>Code</th>
                          <th style={th}>Risk</th>
                          <th style={th}>Description</th>
                          <th style={th}>Typical Sectors</th>
                          <th style={th}>Key Indicators</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coreRisks.map((r) => (
                          <tr key={r.risk_id}>
                            <td style={td}><code style={{ fontSize: "0.72rem", fontWeight: 600 }}>{r.risk_id}</code></td>
                            <td style={{ ...td, fontWeight: 600 }}>{r.risk_name}</td>
                            <td style={{ ...td, color: "var(--ink-soft)" }}>{r.description || "\u2014"}</td>
                            <td style={{ ...td, color: "var(--ink-soft)", fontSize: "0.75rem" }}>{r.typical_sectors || "\u2014"}</td>
                            <td style={{ ...td, color: "var(--ink-soft)", fontSize: "0.75rem" }}>{r.key_indicators || "\u2014"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Sub-sector groups */}
                {subSectorGroups.map((group) => (
                  <div key={group.label} style={{ marginTop: coreRisks.length > 0 ? 20 : 0 }}>
                    <h3 style={{
                      fontSize: "0.80rem", fontWeight: 700, color: "var(--accent)",
                      marginBottom: 8, paddingLeft: 8,
                    }}>
                      {group.label}
                      <span style={{ fontSize: "0.70rem", color: "var(--ink-soft)", fontWeight: 400, marginLeft: 8 }}>
                        ({group.risks.length} risk{group.risks.length !== 1 ? "s" : ""})
                      </span>
                    </h3>
                    <div className="jps-table-wrap">
                      <table className="jps-table" style={{ marginBottom: 0 }}>
                        <thead>
                          <tr>
                            <th style={{ ...th, width: "6rem" }}>Code</th>
                            <th style={th}>Risk</th>
                            <th style={th}>Description</th>
                            <th style={th}>Key Indicators</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.risks.map((r) => (
                            <tr key={r.risk_id}>
                              <td style={td}><code style={{ fontSize: "0.72rem", fontWeight: 600 }}>{r.risk_id}</code></td>
                              <td style={{ ...td, fontWeight: 600 }}>{r.risk_name}</td>
                              <td style={{ ...td, color: "var(--ink-soft)" }}>{r.description || "\u2014"}</td>
                              <td style={{ ...td, color: "var(--ink-soft)", fontSize: "0.75rem" }}>{r.key_indicators || "\u2014"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
