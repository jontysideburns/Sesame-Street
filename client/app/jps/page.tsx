"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

/* ── Types (subset of PortfolioResponse) ─────────────────────────────── */

type Deal = {
  dealId: number;
  dealSlug: string;
  dealName: string;
  borrower: string;
  sector: string;
  dealType: string;
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

type PortfolioData = {
  deals: Deal[];
  hierarchy: {
    organisations: HierarchyOrg[];
    owners: HierarchyOwner[];
  };
  availableFilters: {
    sectors: string[];
    grades: string[];
    watchlistStates: string[];
  };
};

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
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 0,
  }).format(n);
}

/* ── Filter bar ──────────────────────────────────────────────────────── */

type Filters = {
  organisation: string;
  owner: string;
  sector: string;
  grade: string;
  watchlist: string;
  search: string;
};

const EMPTY_FILTERS: Filters = {
  organisation: "",
  owner: "",
  sector: "",
  grade: "",
  watchlist: "",
  search: "",
};

function FilterBar({
  filters,
  onChange,
  onClear,
  organisations,
  owners,
  sectors,
  grades,
  activeCount,
  totalCount,
}: {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  onClear: () => void;
  organisations: HierarchyOrg[];
  owners: HierarchyOwner[];
  sectors: string[];
  grades: string[];
  activeCount: number;
  totalCount: number;
}) {
  // When an org is selected, only show owners that belong to that org
  const filteredOwners = filters.organisation
    ? owners.filter((o) => o.organisationName === filters.organisation)
    : owners;

  const hasFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
        padding: "14px 18px",
        marginBottom: 16,
        background: "var(--accent-soft)",
        borderRadius: "var(--radius-card)",
        border: "1px solid var(--line)",
      }}
    >
      {/* Search */}
      <div className="portfolio-toolbar-field" style={{ flex: "1 1 180px", minWidth: 160 }}>
        <input
          type="text"
          placeholder="Search deals…"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          style={{
            width: "100%",
            padding: "0.68rem 0.9rem",
            borderRadius: 14,
            border: "1px solid var(--line-strong)",
            background: "var(--panel-strong)",
            color: "var(--ink)",
            fontSize: "0.86rem",
          }}
        />
      </div>

      {/* Organisation */}
      <select
        value={filters.organisation}
        onChange={(e) => onChange({ organisation: e.target.value, owner: "" })}
        style={{
          padding: "0.68rem 0.9rem",
          borderRadius: 14,
          border: "1px solid var(--line-strong)",
          background: "var(--panel-strong)",
          color: "var(--ink)",
          fontSize: "0.86rem",
          minWidth: 140,
        }}
      >
        <option value="">All organisations</option>
        {organisations.map((o) => (
          <option key={o.id} value={o.name}>
            {o.name} ({o.dealCount})
          </option>
        ))}
      </select>

      {/* Owner */}
      <select
        value={filters.owner}
        onChange={(e) => onChange({ owner: e.target.value })}
        style={{
          padding: "0.68rem 0.9rem",
          borderRadius: 14,
          border: "1px solid var(--line-strong)",
          background: "var(--panel-strong)",
          color: "var(--ink)",
          fontSize: "0.86rem",
          minWidth: 140,
        }}
      >
        <option value="">All owners</option>
        {filteredOwners.map((o) => (
          <option key={o.id} value={o.name}>
            {o.name} ({o.dealCount})
          </option>
        ))}
      </select>

      {/* Sector */}
      <select
        value={filters.sector}
        onChange={(e) => onChange({ sector: e.target.value })}
        style={{
          padding: "0.68rem 0.9rem",
          borderRadius: 14,
          border: "1px solid var(--line-strong)",
          background: "var(--panel-strong)",
          color: "var(--ink)",
          fontSize: "0.86rem",
          minWidth: 120,
        }}
      >
        <option value="">All sectors</option>
        {sectors.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Grade */}
      <select
        value={filters.grade}
        onChange={(e) => onChange({ grade: e.target.value })}
        style={{
          padding: "0.68rem 0.9rem",
          borderRadius: 14,
          border: "1px solid var(--line-strong)",
          background: "var(--panel-strong)",
          color: "var(--ink)",
          fontSize: "0.86rem",
          minWidth: 100,
        }}
      >
        <option value="">All grades</option>
        {grades.map((g) => (
          <option key={g} value={g}>
            Grade {g}
          </option>
        ))}
      </select>

      {/* Watchlist */}
      <select
        value={filters.watchlist}
        onChange={(e) => onChange({ watchlist: e.target.value })}
        style={{
          padding: "0.68rem 0.9rem",
          borderRadius: 14,
          border: "1px solid var(--line-strong)",
          background: "var(--panel-strong)",
          color: "var(--ink)",
          fontSize: "0.86rem",
          minWidth: 120,
        }}
      >
        <option value="">All deals</option>
        <option value="true">On watchlist</option>
        <option value="false">Standard only</option>
      </select>

      {/* Clear + count */}
      {hasFilters && (
        <button
          onClick={onClear}
          className="mini-button subtle"
          style={{ whiteSpace: "nowrap" }}
        >
          Clear filters
        </button>
      )}
      <span
        style={{
          fontSize: "0.82rem",
          color: "var(--ink-soft)",
          marginLeft: "auto",
          whiteSpace: "nowrap",
        }}
      >
        Showing <strong style={{ color: "var(--ink)" }}>{activeCount}</strong> of{" "}
        {totalCount} deals
      </span>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────── */

export default function JpsPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API ?? "http://localhost:8000"}/api/portfolio`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setError(true));
  }, []);

  const deals = data?.deals ?? [];
  const organisations = data?.hierarchy?.organisations ?? [];
  const owners = data?.hierarchy?.owners ?? [];
  const sectors = data?.availableFilters?.sectors ?? [];
  const grades = data?.availableFilters?.grades ?? [];

  const filteredDeals = useMemo(() => {
    let result = deals;
    const { organisation, owner, sector, grade, watchlist, search } = filters;

    if (organisation) {
      result = result.filter((d) => d.organisations?.includes(organisation));
    }
    if (owner) {
      result = result.filter((d) => d.owners?.includes(owner));
    }
    if (sector) {
      result = result.filter((d) => d.sector === sector);
    }
    if (grade) {
      result = result.filter((d) => d.grade === grade);
    }
    if (watchlist === "true") {
      result = result.filter((d) => d.watchlist);
    } else if (watchlist === "false") {
      result = result.filter((d) => !d.watchlist);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.dealName.toLowerCase().includes(q) ||
          d.borrower.toLowerCase().includes(q) ||
          d.sector.toLowerCase().includes(q) ||
          d.dealSlug.toLowerCase().includes(q)
      );
    }

    return result;
  }, [deals, filters]);

  const handleFilterChange = (partial: Partial<Filters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  };

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

        {error ? (
          <article className="topsheet-note topsheet-note-info">
            <strong>Backend unavailable</strong>
            <p>Deals will appear here once the server is running.</p>
          </article>
        ) : !data ? (
          <p style={{ padding: 20, color: "var(--ink-soft)" }}>Loading…</p>
        ) : (
          <>
            <FilterBar
              filters={filters}
              onChange={handleFilterChange}
              onClear={() => setFilters(EMPTY_FILTERS)}
              organisations={organisations}
              owners={owners}
              sectors={sectors}
              grades={grades}
              activeCount={filteredDeals.length}
              totalCount={deals.length}
            />

            {filteredDeals.length === 0 ? (
              <article className="topsheet-note topsheet-note-info">
                <strong>No deals match</strong>
                <p>Try adjusting your filters or clearing them to see all deals.</p>
              </article>
            ) : (
              <div className="jps-deal-grid">
                {filteredDeals.map((deal) => (
                  <Link
                    key={deal.dealSlug}
                    href={`/jps/${deal.dealSlug}`}
                    className="jps-deal-card"
                  >
                    <div className="jps-deal-card-header">
                      <strong className="jps-deal-name">{deal.dealName}</strong>
                      <span className={`badge ${gradeTone(deal.grade)}`}>
                        {deal.grade}
                      </span>
                    </div>
                    <p className="jps-deal-borrower">{deal.borrower}</p>
                    <dl className="jps-deal-meta">
                      <div>
                        <dt>Sector</dt>
                        <dd>{deal.sector}</dd>
                      </div>
                      <div>
                        <dt>Exposure</dt>
                        <dd>{fmt(deal.exposure)}</dd>
                      </div>
                      <div>
                        <dt>DSCR</dt>
                        <dd>
                          {deal.reportedDscr != null
                            ? `${deal.reportedDscr.toFixed(2)}x`
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt>Covenant</dt>
                        <dd>
                          <span
                            className={`badge ${tierTone(deal.covenantStatus)} badge-sm`}
                          >
                            {deal.covenantStatus.replace(/_/g, " ")}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt>Watchlist</dt>
                        <dd>
                          {deal.watchlist ? (
                            <span className="badge warning badge-sm">
                              On watchlist
                            </span>
                          ) : (
                            <span className="badge good badge-sm">Standard</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                    <p className="jps-deal-cta">View analytics →</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
