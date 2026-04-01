"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

/* ── Types ───────────────────────────────────────────────────────────── */

type Deal = {
  dealSlug: string;
  dealName: string;
  borrower: string;
  sector: string;
  grade: string;
  watchlist: boolean;
  exposure: number;
  reportedDscr: number | null;
  covenantStatus: string;
  performanceScore: number | null;
  headroomPct: number | null;
  latestPeriodEnd: string | null;
  latestPeriodLabel: string | null;
  pendingReviews: number;
  overdueObligations: number;
  openRequests: number;
  organisations: string[];
  owners: string[];
};

type HierarchyOrg = { id: number; name: string; dealCount: number };
type HierarchyOwner = { id: number; name: string; organisationName: string; dealCount: number };

type Filters = {
  organisation: string;
  owner: string;
  sector: string;
  grade: string;
  watchlist: string;
  search: string;
};

const EMPTY: Filters = { organisation: "", owner: "", sector: "", grade: "", watchlist: "", search: "" };

/* ── Helpers ─────────────────────────────────────────────────────────── */

function gradeTone(grade: string) {
  if (grade.startsWith("1") || grade.startsWith("2")) return "good";
  if (grade.startsWith("3")) return "warning";
  return "critical";
}

function tierTone(status: string) {
  if (status === "event_of_default" || status === "trigger_event") return "critical";
  if (status === "distribution_lockup") return "warning";
  return "good";
}

function scoreTone(score: number | null) {
  if (score == null) return "neutral";
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  return "critical";
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0,
  }).format(n);
}

/* ── Shared styles ───────────────────────────────────────────────────── */

const sel: React.CSSProperties = {
  padding: "0.58rem 0.7rem",
  borderRadius: 12,
  border: "1px solid var(--line-strong)",
  background: "var(--panel-strong)",
  color: "var(--ink)",
  fontSize: "0.82rem",
};

const th: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 700,
  fontSize: "0.76rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "var(--accent)",
  borderBottom: "2px solid var(--line)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "12px 12px",
  fontSize: "0.86rem",
  borderBottom: "1px solid var(--line)",
  verticalAlign: "middle",
};

/* ── Component ───────────────────────────────────────────────────────── */

export default function JpsFilterGrid({
  deals,
  organisations,
  owners,
  sectors,
  grades,
}: {
  deals: Deal[];
  organisations: HierarchyOrg[];
  owners: HierarchyOwner[];
  sectors: string[];
  grades: string[];
}) {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const set = (partial: Partial<Filters>) => setFilters((prev) => ({ ...prev, ...partial }));

  const filteredOwners = filters.organisation
    ? owners.filter((o) => o.organisationName === filters.organisation)
    : owners;

  const filtered = useMemo(() => {
    let r = deals;
    const { organisation, owner, sector, grade, watchlist, search } = filters;
    if (organisation) r = r.filter((d) => d.organisations?.includes(organisation));
    if (owner) r = r.filter((d) => d.owners?.includes(owner));
    if (sector) r = r.filter((d) => d.sector === sector);
    if (grade) r = r.filter((d) => d.grade === grade);
    if (watchlist === "true") r = r.filter((d) => d.watchlist);
    else if (watchlist === "false") r = r.filter((d) => !d.watchlist);
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((d) =>
        d.dealName.toLowerCase().includes(q) ||
        d.borrower.toLowerCase().includes(q) ||
        d.sector.toLowerCase().includes(q) ||
        d.dealSlug.toLowerCase().includes(q)
      );
    }
    return r;
  }, [deals, filters]);

  const hasFilters = Object.values(filters).some((v) => v !== "");

  return (
    <>
      {/* ── Filter bar ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
          padding: "14px 18px", marginBottom: 16,
          background: "var(--accent-soft)", borderRadius: "var(--radius-card)",
          border: "1px solid var(--line)",
        }}
      >
        <input
          type="text"
          placeholder="Search deals…"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          style={{ ...sel, flex: "1 1 140px", minWidth: 120 }}
        />

        <select value={filters.organisation} onChange={(e) => set({ organisation: e.target.value, owner: "" })} style={sel}>
          <option value="">All organisations</option>
          {organisations.map((o) => <option key={o.id} value={o.name}>{o.name} ({o.dealCount})</option>)}
        </select>

        <select value={filters.owner} onChange={(e) => set({ owner: e.target.value })} style={sel}>
          <option value="">All owners</option>
          {filteredOwners.map((o) => <option key={o.id} value={o.name}>{o.name} ({o.dealCount})</option>)}
        </select>

        <select value={filters.sector} onChange={(e) => set({ sector: e.target.value })} style={sel}>
          <option value="">All sectors</option>
          {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={filters.grade} onChange={(e) => set({ grade: e.target.value })} style={sel}>
          <option value="">All grades</option>
          {grades.map((g) => <option key={g} value={g}>Grade {g}</option>)}
        </select>

        <select value={filters.watchlist} onChange={(e) => set({ watchlist: e.target.value })} style={sel}>
          <option value="">All deals</option>
          <option value="true">On watchlist</option>
          <option value="false">Standard only</option>
        </select>

        {hasFilters && (
          <button onClick={() => setFilters(EMPTY)} className="mini-button subtle" style={{ whiteSpace: "nowrap" }}>
            Clear filters
          </button>
        )}
        <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginLeft: "auto", whiteSpace: "nowrap" }}>
          Showing <strong style={{ color: "var(--ink)" }}>{filtered.length}</strong> of {deals.length} deals
        </span>
      </div>

      {/* ── Deal table ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <article className="topsheet-note topsheet-note-info">
          <strong>No deals match</strong>
          <p>Try adjusting your filters or clearing them to see all deals.</p>
        </article>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid var(--line)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--accent-soft)" }}>
                <th style={th}>Deal</th>
                <th style={th}>Sector</th>
                <th style={{ ...th, textAlign: "right" }}>Exposure</th>
                <th style={{ ...th, textAlign: "center" }}>Credit Score</th>
                <th style={{ ...th, textAlign: "center" }}>Grade</th>
                <th style={{ ...th, textAlign: "center" }}>Covenant</th>
                <th style={{ ...th, textAlign: "center" }}>Last Financials</th>
                <th style={{ ...th, textAlign: "right" }}>DSCR</th>
                <th style={{ ...th, textAlign: "right" }}>Headroom</th>
                <th style={{ ...th, textAlign: "center" }}>To-do&apos;s</th>
                <th style={{ ...th, textAlign: "center" }}>Watchlist</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((deal) => {
                const todos = (deal.pendingReviews ?? 0) + (deal.overdueObligations ?? 0) + (deal.openRequests ?? 0);
                return (
                  <tr
                    key={deal.dealSlug}
                    style={{ cursor: "pointer" }}
                    onClick={() => { window.location.href = `/jps/${deal.dealSlug}`; }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--accent-soft)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                  >
                    {/* Deal name */}
                    <td style={td}>
                      <Link href={`/jps/${deal.dealSlug}`} style={{ color: "var(--ink)", textDecoration: "none" }}>
                        <strong style={{ display: "block", fontSize: "0.88rem" }}>{deal.dealName}</strong>
                        <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>{deal.borrower}</span>
                      </Link>
                    </td>

                    {/* Sector */}
                    <td style={{ ...td, fontSize: "0.84rem", color: "var(--ink-soft)" }}>
                      {deal.sector}
                    </td>

                    {/* Exposure */}
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                      {fmt(deal.exposure)}
                    </td>

                    {/* Credit score */}
                    <td style={{ ...td, textAlign: "center" }}>
                      {deal.performanceScore != null ? (
                        <span className={`badge ${scoreTone(deal.performanceScore)} badge-sm`}>
                          {deal.performanceScore}
                        </span>
                      ) : (
                        <span style={{ color: "var(--ink-soft)" }}>—</span>
                      )}
                    </td>

                    {/* Performance grade */}
                    <td style={{ ...td, textAlign: "center" }}>
                      <span className={`badge ${gradeTone(deal.grade)} badge-sm`}>
                        {deal.grade}
                      </span>
                    </td>

                    {/* Covenant performance */}
                    <td style={{ ...td, textAlign: "center" }}>
                      <span className={`badge ${tierTone(deal.covenantStatus)} badge-sm`}>
                        {deal.covenantStatus.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Last Financials */}
                    <td style={{ ...td, textAlign: "center", fontSize: "0.84rem" }}>
                      {deal.latestPeriodEnd ? (
                        new Date(deal.latestPeriodEnd).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      ) : "—"}
                    </td>

                    {/* DSCR */}
                    <td style={{ ...td, textAlign: "right", fontFamily: "monospace", fontWeight: 600 }}>
                      {deal.reportedDscr != null ? `${deal.reportedDscr.toFixed(2)}x` : "—"}
                    </td>

                    {/* Headroom (collateral ratio proxy) */}
                    <td style={{ ...td, textAlign: "right", fontFamily: "monospace" }}>
                      {deal.headroomPct != null ? `${deal.headroomPct.toFixed(1)}%` : "—"}
                    </td>

                    {/* To-do's outstanding */}
                    <td style={{ ...td, textAlign: "center" }}>
                      {todos > 0 ? (
                        <span className={`badge ${todos >= 5 ? "critical" : todos >= 2 ? "warning" : "neutral"} badge-sm`}>
                          {todos}
                        </span>
                      ) : (
                        <span className="badge good badge-sm">0</span>
                      )}
                    </td>

                    {/* Watchlist */}
                    <td style={{ ...td, textAlign: "center" }}>
                      {deal.watchlist ? (
                        <span className="badge warning badge-sm">Yes</span>
                      ) : (
                        <span style={{ color: "var(--ink-soft)", fontSize: "0.82rem" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
