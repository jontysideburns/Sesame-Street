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

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0,
  }).format(n);
}

/* ── Select style (shared) ───────────────────────────────────────────── */

const sel: React.CSSProperties = {
  padding: "0.58rem 0.7rem",
  borderRadius: 12,
  border: "1px solid var(--line-strong)",
  background: "var(--panel-strong)",
  color: "var(--ink)",
  fontSize: "0.82rem",
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

      {/* ── Deal grid ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <article className="topsheet-note topsheet-note-info">
          <strong>No deals match</strong>
          <p>Try adjusting your filters or clearing them to see all deals.</p>
        </article>
      ) : (
        <div className="jps-deal-grid">
          {filtered.map((deal) => (
            <Link key={deal.dealSlug} href={`/jps/${deal.dealSlug}`} className="jps-deal-card">
              <div className="jps-deal-card-header">
                <strong className="jps-deal-name">{deal.dealName}</strong>
                <span className={`badge ${gradeTone(deal.grade)}`}>{deal.grade}</span>
              </div>
              <p className="jps-deal-borrower">{deal.borrower}</p>
              <dl className="jps-deal-meta">
                <div><dt>Sector</dt><dd>{deal.sector}</dd></div>
                <div><dt>Exposure</dt><dd>{fmt(deal.exposure)}</dd></div>
                <div><dt>DSCR</dt><dd>{deal.reportedDscr != null ? `${deal.reportedDscr.toFixed(2)}x` : "—"}</dd></div>
                <div>
                  <dt>Covenant</dt>
                  <dd><span className={`badge ${tierTone(deal.covenantStatus)} badge-sm`}>{deal.covenantStatus.replace(/_/g, " ")}</span></dd>
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
      )}
    </>
  );
}
