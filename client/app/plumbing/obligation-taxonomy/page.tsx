import Link from "next/link";
import { fetchJson } from "../../../api/http";

type Obligation = {
  item_id: string;
  category_number: number;
  category_name: string;
  sub_category: string | null;
  title: string;
  description: string | null;
  typical_frequency: string | null;
  typical_deadline: string | null;
  typical_severity: string | null;
  typical_phase: string | null;
  sector_applicability: string | null;
};

type Category = {
  number: number;
  name: string;
  items: Obligation[];
  subCategories: string[];
};

function severityTone(s: string | null) {
  if (s === "event_of_default") return "critical";
  if (s === "potential_default") return "warning";
  return "neutral";
}

export default async function ObligationTaxonomyPage() {
  let categories: Category[] = [];
  let totalItems = 0;
  let loadError = false;

  try {
    const data = await fetchJson<{ obligations: Obligation[] }>("/api/obligation-taxonomy");
    const items = data.obligations ?? [];
    totalItems = items.length;

    const catMap = new Map<number, Category>();
    for (const o of items) {
      if (!catMap.has(o.category_number)) {
        catMap.set(o.category_number, { number: o.category_number, name: o.category_name, items: [], subCategories: [] });
      }
      const cat = catMap.get(o.category_number)!;
      cat.items.push(o);
      if (o.sub_category && !cat.subCategories.includes(o.sub_category)) cat.subCategories.push(o.sub_category);
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
          <h1 className="hero-title" style={{ whiteSpace: "nowrap" }}>Obligation & Covenant Taxonomy</h1>
          <p className="hero-sub">
            {totalItems} deliverables, covenants, and monitoring items across {categories.length} categories.
            The master register from which each deal&apos;s compliance schedule is drawn.
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
            <p>Obligation taxonomy will appear here once the server is running.</p>
          </article>
        </section>
      ) : (
        <>
          <section className="panel section-panel">
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {categories.map((cat) => (
                <a key={cat.number} href={`#cat-${cat.number}`} style={{
                  flex: "1 1 180px", padding: "12px 16px", borderRadius: 14,
                  border: "1px solid var(--line)", background: "var(--panel)",
                  textDecoration: "none", color: "var(--ink)",
                }}>
                  <div style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)", marginBottom: 4 }}>
                    Category {cat.number}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 2 }}>{cat.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
                    {cat.items.length} item{cat.items.length !== 1 ? "s" : ""}
                    {cat.subCategories.length > 0 ? ` (${cat.subCategories.join(", ")})` : ""}
                  </div>
                </a>
              ))}
            </div>
          </section>

          {categories.map((cat) => {
            const hasSubCats = cat.subCategories.length > 0;
            const coreItems = cat.items.filter((o) => !o.sub_category);
            const subGroups = hasSubCats
              ? cat.subCategories.map((sc) => ({ label: sc, items: cat.items.filter((o) => o.sub_category === sc) }))
              : [];

            const renderTable = (items: Obligation[]) => (
              <div className="jps-table-wrap">
                <table className="jps-table" style={{ marginBottom: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, width: "6rem" }}>ID</th>
                      <th style={th}>Obligation</th>
                      <th style={th}>Frequency</th>
                      <th style={th}>Deadline</th>
                      <th style={th}>Severity</th>
                      <th style={th}>Phase</th>
                      <th style={th}>Sectors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((o) => (
                      <tr key={o.item_id}>
                        <td style={td}><code style={{ fontSize: "0.72rem", fontWeight: 600 }}>{o.item_id}</code></td>
                        <td style={td}>
                          <strong>{o.title}</strong>
                          {o.description && <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)", marginTop: 2, lineHeight: 1.4 }}>{o.description}</div>}
                        </td>
                        <td style={{ ...td, whiteSpace: "nowrap" }}>{o.typical_frequency?.replace(/_/g, " ") ?? "\u2014"}</td>
                        <td style={td}>{o.typical_deadline ?? "\u2014"}</td>
                        <td style={td}>
                          {o.typical_severity ? (
                            <span className={`badge ${severityTone(o.typical_severity)} badge-sm`}>{o.typical_severity.replace(/_/g, " ")}</span>
                          ) : "\u2014"}
                        </td>
                        <td style={td}>{o.typical_phase ?? "\u2014"}</td>
                        <td style={{ ...td, fontSize: "0.72rem", color: "var(--ink-soft)" }}>{o.sector_applicability ?? "all"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

            return (
              <section key={cat.number} id={`cat-${cat.number}`} className="panel section-panel">
                <header className="panel-heading">
                  <p className="panel-eyebrow">Category {cat.number}</p>
                  <h2 className="panel-title">{cat.name}</h2>
                </header>
                {coreItems.length > 0 && renderTable(coreItems)}
                {subGroups.map((group) => (
                  <div key={group.label} style={{ marginTop: coreItems.length > 0 ? 20 : 0 }}>
                    <h3 style={{ fontSize: "0.80rem", fontWeight: 700, color: "var(--accent)", marginBottom: 8, paddingLeft: 8 }}>
                      {group.label} <span style={{ fontSize: "0.70rem", color: "var(--ink-soft)", fontWeight: 400 }}>({group.items.length})</span>
                    </h3>
                    {renderTable(group.items)}
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
