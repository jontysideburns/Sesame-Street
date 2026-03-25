"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  DashboardDealRow,
  DashboardHoldingRow,
  DashboardResponse
} from "../lib/dashboard-types";

type ViewMode = "hierarchy" | "deals";

type RowAggregate = {
  exposure: number;
  dealCount: number;
  grade: string;
  deliverablesText: string;
  reportedDscr: number | null;
  performanceText: string;
  financialComplianceText: string;
  reviewText: string;
  predictedDscr: number | null;
  forecastText: string;
  governanceText: string;
};

type HierarchyRow = RowAggregate & {
  id: string;
  level: "organisation" | "owner" | "account" | "deal";
  label: string;
  secondary: string;
  href?: string;
  watchlist: boolean;
  children: HierarchyRow[];
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatRatio(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)}x`;
}

function titleize(value: string | null) {
  if (!value) return "Not assessed";
  return value.replaceAll("_", " ");
}

function badgeTone(status: string | null) {
  if (!status) return "neutral";
  if (["blocked", "trigger", "default", "overdue", "pending"].some((token) => status.includes(token))) {
    return "critical";
  }
  if (
    [
      "restricted",
      "review_required",
      "lock",
      "warning",
      "concern",
      "watch",
      "monitor"
    ].some((token) => status.includes(token))
  ) {
    return "warning";
  }
  if (["allowed", "clear", "stable", "good"].some((token) => status.includes(token))) {
    return "good";
  }
  return "neutral";
}

function buildAggregate(rows: DashboardHoldingRow[]): RowAggregate {
  const deals = new Map<
    string,
    {
      exposure: number;
      row: DashboardHoldingRow;
    }
  >();

  for (const row of rows) {
    const existing = deals.get(row.dealSlug);
    if (existing) {
      existing.exposure += row.exposure;
      continue;
    }
    deals.set(row.dealSlug, { exposure: row.exposure, row });
  }

  const dealEntries = Array.from(deals.values());
  const totalExposure = dealEntries.reduce((sum, entry) => sum + entry.exposure, 0);
  const reportedExposure = dealEntries.reduce(
    (sum, entry) => (entry.row.reportedDscr === null ? sum : sum + entry.exposure),
    0
  );
  const predictedExposure = dealEntries.reduce(
    (sum, entry) => (entry.row.forecastedDscr === null ? sum : sum + entry.exposure),
    0
  );
  const performanceExposure = dealEntries.reduce(
    (sum, entry) => (entry.row.performanceScore === null ? sum : sum + entry.exposure),
    0
  );
  const weightedReportedDscr =
    reportedExposure > 0
      ? dealEntries.reduce((sum, entry) => {
          if (entry.row.reportedDscr === null) return sum;
          return sum + entry.row.reportedDscr * entry.exposure;
        }, 0) / reportedExposure
      : null;
  const weightedPredictedDscr =
    predictedExposure > 0
      ? dealEntries.reduce((sum, entry) => {
          if (entry.row.forecastedDscr === null) return sum;
          return sum + entry.row.forecastedDscr * entry.exposure;
        }, 0) / predictedExposure
      : null;
  const weightedPerformanceScore =
    performanceExposure > 0
      ? dealEntries.reduce((sum, entry) => {
          if (entry.row.performanceScore === null) return sum;
          return sum + entry.row.performanceScore * entry.exposure;
        }, 0) / performanceExposure
      : null;

  const grades = new Set(dealEntries.map((entry) => entry.row.grade));
  const watchlistCount = dealEntries.filter((entry) => entry.row.watchlist).length;
  const upToDateCount = dealEntries.filter((entry) => entry.row.deliverablesUpToDate).length;
  const blockedCount = dealEntries.filter(
    (entry) => entry.row.distributionStatus === "blocked"
  ).length;
  const restrictedCount = dealEntries.filter((entry) =>
    ["restricted", "review_required"].includes(entry.row.distributionStatus ?? "")
  ).length;
  const pendingReviews = dealEntries.reduce(
    (sum, entry) => sum + entry.row.pendingReviews,
    0
  );
  const openRequests = dealEntries.reduce((sum, entry) => sum + entry.row.openRequests, 0);
  const opposedRequests = dealEntries.reduce(
    (sum, entry) => sum + entry.row.requestsWithOpposition,
    0
  );
  const forecastModeledCount = dealEntries.filter(
    (entry) => entry.row.forecastedDscr !== null
  ).length;

  return {
    exposure: totalExposure,
    dealCount: dealEntries.length,
    grade: grades.size === 1 ? (dealEntries[0]?.row.grade ?? "—") : "Mixed",
    deliverablesText: `${upToDateCount}/${dealEntries.length} current`,
    reportedDscr: weightedReportedDscr,
    performanceText:
      weightedPerformanceScore === null
        ? `${watchlistCount} watchlist`
        : `Avg ${weightedPerformanceScore.toFixed(1)} · ${watchlistCount} watchlist`,
    financialComplianceText:
      blockedCount || restrictedCount
        ? `${blockedCount} blocked · ${restrictedCount} restricted`
        : "Clear",
    reviewText: pendingReviews ? `${pendingReviews} pending` : "Clear",
    predictedDscr: weightedPredictedDscr,
    forecastText: forecastModeledCount
      ? `${forecastModeledCount}/${dealEntries.length} modeled`
      : "No active forecast",
    governanceText: openRequests
      ? `${openRequests} open · ${opposedRequests} opposed`
      : "None"
  };
}

function buildHierarchyRows(holdings: DashboardHoldingRow[]): HierarchyRow[] {
  const organisations = new Map<number, DashboardHoldingRow[]>();
  for (const row of holdings) {
    const bucket = organisations.get(row.organisationId) ?? [];
    bucket.push(row);
    organisations.set(row.organisationId, bucket);
  }

  return Array.from(organisations.entries())
    .sort((a, b) => {
      const aggregateA = buildAggregate(a[1]);
      const aggregateB = buildAggregate(b[1]);
      return aggregateB.exposure - aggregateA.exposure;
    })
    .map(([organisationId, organisationRows]) => {
      const owners = new Map<number, DashboardHoldingRow[]>();
      for (const row of organisationRows) {
        const bucket = owners.get(row.ownerId) ?? [];
        bucket.push(row);
        owners.set(row.ownerId, bucket);
      }

      const ownerRows = Array.from(owners.entries())
        .sort((a, b) => buildAggregate(b[1]).exposure - buildAggregate(a[1]).exposure)
        .map(([ownerId, ownerHoldings]) => {
          const accounts = new Map<number, DashboardHoldingRow[]>();
          for (const row of ownerHoldings) {
            const bucket = accounts.get(row.accountId) ?? [];
            bucket.push(row);
            accounts.set(row.accountId, bucket);
          }

          const accountRows = Array.from(accounts.entries())
            .sort((a, b) => buildAggregate(b[1]).exposure - buildAggregate(a[1]).exposure)
            .map(([accountId, accountHoldings]) => {
              const aggregate = buildAggregate(accountHoldings);
              const dealRows = [...accountHoldings]
                .sort((a, b) => b.exposure - a.exposure)
                .map((holding) => ({
                  id: `deal-${holding.accountId}-${holding.dealSlug}`,
                  level: "deal" as const,
                  label: holding.dealName,
                  secondary: `${holding.borrower} · ${holding.accountName}`,
                  href: `/deals/${holding.dealSlug}`,
                  watchlist: holding.watchlist,
                  children: [],
                  exposure: holding.exposure,
                  dealCount: 1,
                  grade: holding.grade,
                  deliverablesText: holding.deliverablesUpToDate
                    ? "Up to date"
                    : `${holding.overdueObligations} overdue`,
                  reportedDscr: holding.reportedDscr,
                  performanceText:
                    holding.performanceScore === null
                      ? holding.watchlist
                        ? "Watchlist"
                        : "No active score"
                      : `Score ${holding.performanceScore.toFixed(1)}${
                          holding.watchlistRecommendation
                            ? ` · ${titleize(holding.watchlistRecommendation)}`
                            : ""
                        }`,
                  financialComplianceText: `${titleize(
                    holding.covenantStatus
                  )} · ${titleize(holding.distributionStatus)}`,
                  reviewText:
                    holding.pendingReviews > 0
                      ? `${holding.pendingReviews} pending`
                      : "Clear",
                  predictedDscr: holding.forecastedDscr,
                  forecastText: holding.forecastSummary ?? "No active forecast",
                  governanceText: holding.governanceSummary
                }));

              return {
                id: `account-${accountId}`,
                level: "account" as const,
                label: accountHoldings[0].accountName,
                secondary: `${accountHoldings[0].ownerName} · ${accountHoldings[0].benchmark ?? "No benchmark"}`,
                watchlist: dealRows.some((row) => row.watchlist),
                children: dealRows,
                ...aggregate
              };
            });

          const aggregate = buildAggregate(ownerHoldings);
          return {
            id: `owner-${ownerId}`,
            level: "owner" as const,
            label: ownerHoldings[0].ownerName,
            secondary: `${ownerHoldings[0].organisationName} · ${aggregate.dealCount} deals`,
            watchlist: accountRows.some((row) => row.watchlist),
            children: accountRows,
            ...aggregate
          };
        });

      const aggregate = buildAggregate(organisationRows);
      return {
        id: `organisation-${organisationId}`,
        level: "organisation" as const,
        label: organisationRows[0].organisationName,
        secondary: `${aggregate.dealCount} deals · ${ownerRows.length} owners`,
        watchlist: ownerRows.some((row) => row.watchlist),
        children: ownerRows,
        ...aggregate
      };
    });
}

function flattenHierarchyRows(
  rows: HierarchyRow[],
  expandedRows: Set<string>,
  depth = 0
): Array<HierarchyRow & { depth: number }> {
  const flattened: Array<HierarchyRow & { depth: number }> = [];

  for (const row of rows) {
    flattened.push({ ...row, depth });
    if (row.children.length > 0 && expandedRows.has(row.id)) {
      flattened.push(...flattenHierarchyRows(row.children, expandedRows, depth + 1));
    }
  }

  return flattened;
}

function renderRowLabel(
  row: HierarchyRow & { depth: number },
  expandedRows: Set<string>,
  onToggle: (rowId: string) => void
) {
  const isExpanded = expandedRows.has(row.id);

  return (
    <div
      className={`dashboard-row-label dashboard-row-label-${row.level}`}
      style={{ paddingLeft: `${row.depth * 18}px` }}
    >
      {row.children.length > 0 ? (
        <button
          type="button"
          className="dashboard-row-toggle"
          aria-label={isExpanded ? "Collapse row" : "Expand row"}
          onClick={() => onToggle(row.id)}
        >
          {isExpanded ? "−" : "+"}
        </button>
      ) : (
        <span className="dashboard-row-toggle dashboard-row-toggle-static" aria-hidden="true">
          ·
        </span>
      )}
      <div className="dashboard-row-copy">
        <div className="dashboard-row-title">
          {row.href ? <Link href={row.href}>{row.label}</Link> : <span>{row.label}</span>}
          <span className={`badge ${badgeTone(row.watchlist ? "watchlist" : "clear")}`}>
            {row.level}
          </span>
          {row.watchlist ? <span className="badge critical">watchlist</span> : null}
        </div>
        <span className="dashboard-row-secondary">{row.secondary}</span>
      </div>
    </div>
  );
}

function renderDealsRow(deal: DashboardDealRow) {
  return (
    <div className="dashboard-row-copy">
      <div className="dashboard-row-title">
        <Link href={`/deals/${deal.dealSlug}`}>{deal.dealName}</Link>
        {deal.watchlist ? <span className="badge critical">watchlist</span> : null}
      </div>
      <span className="dashboard-row-secondary">
        {deal.borrower} · {deal.organisations.join(", ")}
      </span>
    </div>
  );
}

export function DashboardMonitor({
  dashboard
}: {
  dashboard: DashboardResponse;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("hierarchy");
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);

  const expandedRows = new Set(expandedRowIds);
  const hierarchyRows = buildHierarchyRows(dashboard.holdings);
  const flattenedHierarchy = flattenHierarchyRows(hierarchyRows, expandedRows);

  function toggleRow(rowId: string) {
    setExpandedRowIds((current) =>
      current.includes(rowId)
        ? current.filter((value) => value !== rowId)
        : [...current, rowId]
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>{dashboard.platformClient.name}</h1>
          <p className="hero-copy">
            A wide monitoring view built only from fields already modeled in the
            platform. Use the hierarchy tab for client drilldown, or switch to
            the flat deals view for a direct monitoring list.
          </p>
        </div>
        <div className="hero-card emphasis-card">
          <p className="eyebrow">Coverage</p>
          <h2>{dashboard.summary.dealCount}</h2>
          <p>Deals currently visible to {dashboard.viewer.displayName}.</p>
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>Exposure</span>
              <strong>{formatMoney(dashboard.summary.totalExposure)}</strong>
            </div>
            <div className="summary-stat">
              <span>Pending reviews</span>
              <strong>{dashboard.summary.pendingReviews}</strong>
            </div>
            <div className="summary-stat">
              <span>Open requests</span>
              <strong>{dashboard.summary.openRequests}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Organisations</span>
          <strong>{dashboard.summary.organisationCount}</strong>
        </article>
        <article className="metric-card">
          <span>Owners</span>
          <strong>{dashboard.summary.ownerCount}</strong>
        </article>
        <article className="metric-card">
          <span>Accounts</span>
          <strong>{dashboard.summary.accountCount}</strong>
        </article>
        <article className="metric-card">
          <span>Watchlist deals</span>
          <strong>{dashboard.summary.watchlistCount}</strong>
        </article>
        <article className="metric-card">
          <span>Restricted deals</span>
          <strong>{dashboard.summary.restrictedDealCount}</strong>
        </article>
        <article className="metric-card">
          <span>Blocked deals</span>
          <strong>{dashboard.summary.blockedDealCount}</strong>
        </article>
      </section>

      <section className="panel section-panel dashboard-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Views</p>
            <h2>Portfolio monitoring table</h2>
          </div>
          <div className="dashboard-view-toggle" role="tablist" aria-label="Dashboard views">
            <button
              type="button"
              className={viewMode === "hierarchy" ? "active" : ""}
              onClick={() => setViewMode("hierarchy")}
            >
              Hierarchy view
            </button>
            <button
              type="button"
              className={viewMode === "deals" ? "active" : ""}
              onClick={() => setViewMode("deals")}
            >
              Deals view
            </button>
          </div>
        </div>
        <p className="dashboard-note">
          Only currently modeled fields are shown. The existing Portfolio page
          remains unchanged; this page is a dedicated analytical surface.
        </p>

        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>{viewMode === "hierarchy" ? "Client / deal" : "Deal"}</th>
                <th>Credit grade</th>
                <th>Exposure</th>
                <th>Deliverables</th>
                <th>Reported DSCR</th>
                <th>Performance</th>
                <th>Financial compliance</th>
                <th>Review</th>
                <th>Predicted DSCR</th>
                <th>Forecast</th>
                <th>Governance</th>
              </tr>
            </thead>
            <tbody>
              {viewMode === "hierarchy"
                ? flattenedHierarchy.map((row) => (
                    <tr key={row.id}>
                      <th>{renderRowLabel(row, expandedRows, toggleRow)}</th>
                      <td>{row.grade}</td>
                      <td>{formatMoney(row.exposure)}</td>
                      <td>{row.deliverablesText}</td>
                      <td>{formatRatio(row.reportedDscr)}</td>
                      <td>{row.performanceText}</td>
                      <td>{row.financialComplianceText}</td>
                      <td>{row.reviewText}</td>
                      <td>{formatRatio(row.predictedDscr)}</td>
                      <td>{row.forecastText}</td>
                      <td>{row.governanceText}</td>
                    </tr>
                  ))
                : dashboard.deals.map((deal) => (
                    <tr key={deal.dealSlug}>
                      <th>{renderDealsRow(deal)}</th>
                      <td>{deal.grade}</td>
                      <td>{formatMoney(deal.exposure)}</td>
                      <td>
                        {deal.deliverablesUpToDate
                          ? "Up to date"
                          : `${deal.overdueObligations} overdue`}
                      </td>
                      <td>{formatRatio(deal.reportedDscr)}</td>
                      <td>
                        {deal.performanceScore === null
                          ? "No active score"
                          : `Score ${deal.performanceScore.toFixed(1)}${
                              deal.watchlistRecommendation
                                ? ` · ${titleize(deal.watchlistRecommendation)}`
                                : ""
                            }`}
                      </td>
                      <td>{`${titleize(deal.covenantStatus)} · ${titleize(deal.distributionStatus)}`}</td>
                      <td>
                        {deal.pendingReviews > 0
                          ? `${deal.pendingReviews} pending`
                          : "Clear"}
                      </td>
                      <td>{formatRatio(deal.forecastedDscr)}</td>
                      <td>{deal.forecastSummary ?? "No active forecast"}</td>
                      <td>{deal.governanceSummary}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
