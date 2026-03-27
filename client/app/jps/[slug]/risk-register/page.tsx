import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeal } from "../../../../api/deals";
import { getRiskRegister, type RiskRegisterEntry } from "../../../../api/risk-register";

const LEVEL_TONE: Record<string, string> = {
  low: "good",
  moderate: "warning",
  high: "critical",
  critical: "critical",
  fatal: "critical",
};

const LEVEL_ORDER = ["low", "moderate", "high", "critical", "fatal"];

const LIKELIHOOD_LABELS = ["", "Remote", "Unlikely", "Possible", "Likely", "Almost Certain"];
const SEVERITY_LABELS = ["", "Negligible", "Minor", "Moderate", "Major", "Critical", "Fatal"];

const PARTY_LABELS: Record<string, string> = {
  M1_none: "M1 None",
  M2_reputational: "M2 Reputational",
  M3_contractual: "M3 Contractual",
  M4_direct_economic: "M4 Direct economic",
  M5_rated_sovereign: "M5 Rated sovereign",
};

const CAPITAL_LABELS: Record<string, string> = {
  C1_none: "C1 None",
  C2_comfort: "C2 Comfort",
  C3_contractual_backstop: "C3 Contractual",
  C4_funded_reserve: "C4 Funded reserve",
  C5_unconditional_guarantee: "C5 Guarantee",
};

const TREND_ICONS: Record<string, string> = {
  improving: "↑",
  stable: "→",
  deteriorating: "↓",
  new: "★",
};

const STATUS_ICONS: Record<string, string> = {
  assessed: "✓",
  not_applicable: "✗",
  not_yet_assessed: "?",
};

function scoreBg(score: number | null) {
  if (score == null) return "";
  if (score >= 25) return "var(--critical, #dc2626)";
  if (score >= 16) return "var(--critical, #ef4444)";
  if (score >= 10) return "#f97316";
  if (score >= 5) return "var(--warning, #d97706)";
  return "var(--good, #16a34a)";
}

type Filters = {
  showAll: boolean;
  levelFilter: string;
  categoryFilter: string;
};

function applyFilters(risks: RiskRegisterEntry[], filters: Filters) {
  return risks.filter((r) => {
    if (!filters.showAll && r.status === "not_yet_assessed") return false;
    if (filters.levelFilter && r.riskLevel !== filters.levelFilter) return false;
    if (filters.categoryFilter && r.categoryCode !== filters.categoryFilter) return false;
    return true;
  });
}

export default async function RiskRegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ showAll?: string; level?: string; category?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const filters: Filters = {
    showAll: sp.showAll === "1",
    levelFilter: sp.level ?? "",
    categoryFilter: sp.category ?? "",
  };

  try {
    const [deal, register] = await Promise.all([
      getDeal(slug),
      getRiskRegister(slug, { sectorFilter: true }).catch(() => null),
    ]);

    const risks = register?.risks ?? [];
    const visible = applyFilters(risks, filters);

    // Summary counts
    const assessed = risks.filter((r) => r.status === "assessed");
    const highPlus = assessed.filter((r) =>
      ["high", "critical", "fatal"].includes(r.riskLevel ?? "")
    );

    // Category list for filter
    const categories = Array.from(
      new Map(risks.map((r) => [r.categoryCode, r.categoryName])).entries()
    ).sort((a, b) => a[1].localeCompare(b[1]));

    const baseUrl = `/jps/${slug}/risk-register`;

    function filterLink(overrides: Partial<{ showAll: string; level: string; category: string }>) {
      const p = new URLSearchParams();
      const merged = {
        showAll: sp.showAll ?? "",
        level: sp.level ?? "",
        category: sp.category ?? "",
        ...overrides,
      };
      if (merged.showAll) p.set("showAll", merged.showAll);
      if (merged.level) p.set("level", merged.level);
      if (merged.category) p.set("category", merged.category);
      const qs = p.toString();
      return `${baseUrl}${qs ? `?${qs}` : ""}`;
    }

    return (
      <main className="shell">
        {/* Header */}
        <section className="hero">
          <div className="hero-body">
            <p className="section-eyebrow">
              <Link href="/jps">JPS</Link> ·{" "}
              <Link href={`/jps/${slug}`}>{deal.name}</Link> · Risk Register
            </p>
            <h1 className="hero-title">Risk register</h1>
            <p className="hero-sub">
              {deal.borrower} · {deal.sector}
              {register?.sectorSubsector && (
                <> · <span style={{ color: "var(--ink-soft)" }}>{register.sectorSubsector}</span></>
              )}
            </p>
          </div>
        </section>

        {/* Summary stats */}
        <section className="panel section-panel">
          <div className="jps-metrics-grid">
            <dl className="jps-metric-card">
              <dt>Total risks</dt>
              <dd>{risks.length}</dd>
            </dl>
            <dl className="jps-metric-card">
              <dt>Assessed</dt>
              <dd>{assessed.length}</dd>
            </dl>
            <dl className="jps-metric-card">
              <dt>High / Critical / Fatal</dt>
              <dd style={{ color: highPlus.length > 0 ? "var(--critical)" : undefined }}>
                {highPlus.length}
              </dd>
            </dl>
            <dl className="jps-metric-card">
              <dt>Not yet assessed</dt>
              <dd>{risks.filter((r) => r.status === "not_yet_assessed").length}</dd>
            </dl>
            <dl className="jps-metric-card">
              <dt>Not applicable</dt>
              <dd>{risks.filter((r) => r.status === "not_applicable").length}</dd>
            </dl>
            <dl className="jps-metric-card">
              <dt>Sensitised</dt>
              <dd>{risks.filter((r) => r.sensitisedAtOrigination).length}</dd>
            </dl>
          </div>
        </section>

        {/* Filters */}
        <section className="panel section-panel" style={{ padding: "12px 20px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600 }}>
              Show:
            </span>
            <Link
              href={filterLink({ showAll: filters.showAll ? "" : "1" })}
              className={`badge ${filters.showAll ? "good" : "neutral"} badge-sm`}
            >
              {filters.showAll ? "All 226 risks" : "Assessed only"}
            </Link>

            <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600, marginLeft: 8 }}>
              Level:
            </span>
            {LEVEL_ORDER.map((l) => (
              <Link
                key={l}
                href={filterLink({ level: filters.levelFilter === l ? "" : l })}
                className={`badge ${filters.levelFilter === l ? LEVEL_TONE[l] : "neutral"} badge-sm`}
              >
                {l}
              </Link>
            ))}

            <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", fontWeight: 600, marginLeft: 8 }}>
              Category:
            </span>
            {categories.map(([code, name]) => (
              <Link
                key={code}
                href={filterLink({ category: filters.categoryFilter === code ? "" : code })}
                className={`badge ${filters.categoryFilter === code ? "good" : "neutral"} badge-sm`}
                title={name}
              >
                {code}
              </Link>
            ))}
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: "var(--ink-soft)" }}>
            Showing {visible.length} of {risks.length} risks
          </p>
        </section>

        {/* Register table */}
        <section className="panel section-panel">
          {!register ? (
            <article className="topsheet-note topsheet-note-info">
              <strong>Backend unavailable</strong>
              <p>The risk register will be available once the server is running.</p>
            </article>
          ) : visible.length === 0 ? (
            <article className="topsheet-note topsheet-note-info">
              <strong>No risks match current filters</strong>
              <p>
                <Link href={baseUrl} style={{ color: "var(--accent)" }}>Clear all filters</Link>
              </p>
            </article>
          ) : (
            <div className="jps-table-wrap">
              <table className="jps-table" style={{ fontSize: "0.82rem" }}>
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>St.</th>
                    <th style={{ width: 110 }}>Risk ID</th>
                    <th>Risk</th>
                    <th style={{ width: 90 }}>L</th>
                    <th style={{ width: 90 }}>S</th>
                    <th style={{ width: 56, textAlign: "center" }}>Score</th>
                    <th style={{ width: 90 }}>Party</th>
                    <th style={{ width: 90 }}>Capital</th>
                    <th style={{ width: 40, textAlign: "center" }}>Sens.</th>
                    <th style={{ width: 36, textAlign: "center" }}>Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr
                      key={r.id}
                      style={{
                        opacity: r.status === "not_applicable" ? 0.45 : 1,
                        color: r.categoryNumber === 7 && r.subSector !== register.sectorSubsector && r.status !== "assessed"
                          ? "var(--ink-soft)" : undefined,
                      }}
                    >
                      <td
                        style={{ textAlign: "center", fontWeight: 700, fontSize: "0.9rem" }}
                        title={r.status.replace(/_/g, " ")}
                      >
                        {STATUS_ICONS[r.status] ?? "?"}
                      </td>
                      <td>
                        <code className="jps-code" style={{ fontSize: "0.75rem" }}>
                          {r.riskId}
                        </code>
                      </td>
                      <td>
                        <strong style={{ display: "block", fontSize: "0.83rem" }}>{r.riskName}</strong>
                        <span style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
                          {r.categoryName}
                          {r.subSector ? ` · ${r.subSector.replace(/^\d+[A-Z]: /, "")}` : ""}
                        </span>
                        {r.commentary && (
                          <p style={{ margin: "4px 0 0", fontSize: "0.76rem", color: "var(--ink-soft)", lineHeight: 1.4 }}>
                            {r.commentary.length > 120 ? r.commentary.slice(0, 120) + "…" : r.commentary}
                          </p>
                        )}
                      </td>
                      <td style={{ fontSize: "0.78rem" }}>
                        {r.likelihood != null ? (
                          <span>
                            <strong>{r.likelihood}</strong>
                            <span style={{ color: "var(--ink-soft)", marginLeft: 3 }}>
                              {LIKELIHOOD_LABELS[r.likelihood]}
                            </span>
                          </span>
                        ) : <span className="jps-blank">—</span>}
                      </td>
                      <td style={{ fontSize: "0.78rem" }}>
                        {r.severity != null ? (
                          <span>
                            <strong>{r.severity}</strong>
                            <span style={{ color: "var(--ink-soft)", marginLeft: 3 }}>
                              {SEVERITY_LABELS[r.severity]}
                            </span>
                          </span>
                        ) : <span className="jps-blank">—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {r.riskScore != null ? (
                          <span
                            style={{
                              display: "inline-block",
                              minWidth: 28,
                              padding: "2px 5px",
                              borderRadius: 4,
                              background: scoreBg(r.riskScore),
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                              textAlign: "center",
                            }}
                          >
                            {r.riskScore}
                          </span>
                        ) : <span className="jps-blank">—</span>}
                      </td>
                      <td style={{ fontSize: "0.76rem" }}>
                        {r.mitigationPartyScore ? (
                          <span title={r.mitigationPartyName ?? undefined}>
                            <code className="jps-code" style={{ fontSize: "0.72rem" }}>
                              {r.mitigationPartyScore.split("_")[0]}
                            </code>
                          </span>
                        ) : <span className="jps-blank">—</span>}
                      </td>
                      <td style={{ fontSize: "0.76rem" }}>
                        {r.mitigationCapitalScore ? (
                          <code className="jps-code" style={{ fontSize: "0.72rem" }}>
                            {r.mitigationCapitalScore.split("_")[0]}
                          </code>
                        ) : <span className="jps-blank">—</span>}
                      </td>
                      <td style={{ textAlign: "center", fontSize: "0.85rem" }}>
                        {r.sensitisedAtOrigination ? "✓" : <span className="jps-blank">—</span>}
                      </td>
                      <td style={{ textAlign: "center", fontSize: "1rem" }}>
                        <span title={r.trend}>
                          {TREND_ICONS[r.trend] ?? "?"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Legend */}
        <section className="panel section-panel">
          <header className="panel-heading">
            <p className="panel-eyebrow">Key</p>
            <h2 className="panel-title">Scoring legend</h2>
          </header>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.85rem" }}>Status</p>
              {Object.entries(STATUS_ICONS).map(([k, v]) => (
                <p key={k} style={{ fontSize: "0.82rem", margin: "3px 0" }}>
                  <strong>{v}</strong> — {k.replace(/_/g, " ")}
                </p>
              ))}
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.85rem" }}>Likelihood (L)</p>
              {LIKELIHOOD_LABELS.slice(1).map((l, i) => (
                <p key={i} style={{ fontSize: "0.82rem", margin: "3px 0" }}>
                  <strong>{i + 1}</strong> — {l}
                </p>
              ))}
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.85rem" }}>Severity (S)</p>
              {SEVERITY_LABELS.slice(1).map((s, i) => (
                <p key={i} style={{ fontSize: "0.82rem", margin: "3px 0" }}>
                  <strong>{i + 1}</strong> — {s}
                </p>
              ))}
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.85rem" }}>Mitigation — Motivated Party (M)</p>
              {Object.entries(PARTY_LABELS).map(([k, v]) => (
                <p key={k} style={{ fontSize: "0.82rem", margin: "3px 0" }}>{v}</p>
              ))}
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.85rem" }}>Mitigation — Capital at Risk (C)</p>
              {Object.entries(CAPITAL_LABELS).map(([k, v]) => (
                <p key={k} style={{ fontSize: "0.82rem", margin: "3px 0" }}>{v}</p>
              ))}
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.85rem" }}>Score bands</p>
              {[
                ["1–4", "Low", "var(--good)"],
                ["5–9", "Moderate", "var(--warning)"],
                ["10–15", "High", "#f97316"],
                ["16–24", "Critical", "var(--critical)"],
                ["25–30", "Fatal", "#7f1d1d"],
              ].map(([range, label, color]) => (
                <p key={range} style={{ fontSize: "0.82rem", margin: "3px 0", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ display: "inline-block", width: 32, background: color, color: "#fff", borderRadius: 3, textAlign: "center", fontWeight: 700, fontSize: "0.75rem", padding: "1px 0" }}>
                    {range}
                  </span>
                  {label}
                </p>
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  } catch {
    notFound();
  }
}
