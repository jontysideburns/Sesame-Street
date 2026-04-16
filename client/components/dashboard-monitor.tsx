"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { PortfolioCalendarResponse } from "../api/calendar";
import type { PortfolioResponse } from "../api/portfolio";
import type { PortfolioDealDrawerResponse } from "../lib/portfolio-deal-drawer";

type ViewMode = "hierarchy" | "deals";
type DashboardHoldingRow = PortfolioResponse["holdings"][number];
type DashboardDealRow = PortfolioResponse["deals"][number];

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
  dealSlug?: string;
  watchlist: boolean;
  children: HierarchyRow[];
};

type MetricTone = "good" | "warning" | "critical" | "neutral";

type KeyMetric = {
  label: string;
  value: string;
  tone: MetricTone;
  definition: string;
  healthSummary?: string;
  href?: string;
  onClick?: () => void;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatCompactMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatRatio(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)}x`;
}

function formatPct(value: number | null, digits = 1) {
  return value === null ? "—" : `${value.toFixed(digits)}%`;
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(`${value}T00:00:00`));
}

function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function buildPortfolioHref(
  basePath: string,
  selectedFilters: PortfolioResponse["selectedFilters"]
) {
  const params = new URLSearchParams();

  if (selectedFilters.organisation) params.set("organisation", selectedFilters.organisation);
  if (selectedFilters.owner) params.set("owner", selectedFilters.owner);
  if (selectedFilters.account) params.set("account", selectedFilters.account);
  if (selectedFilters.asAt) params.set("asAt", selectedFilters.asAt);
  if (selectedFilters.sector) params.set("sector", selectedFilters.sector);
  if (selectedFilters.region) params.set("region", selectedFilters.region);
  if (selectedFilters.dealType) params.set("dealType", selectedFilters.dealType);
  if (selectedFilters.phase) params.set("phase", selectedFilters.phase);
  if (selectedFilters.grade) params.set("grade", selectedFilters.grade);
  if (selectedFilters.watchlist && selectedFilters.watchlist !== "all") {
    params.set("watchlist", selectedFilters.watchlist);
  }
  if (selectedFilters.revenueRisk) params.set("revenueRisk", selectedFilters.revenueRisk);

  return params.size > 0 ? `${basePath}?${params.toString()}` : basePath;
}

function titleize(value: string | null) {
  if (!value) return "Not assessed";
  return value.replaceAll("_", " ");
}

function metricTooltip(metric: KeyMetric) {
  if (!metric.healthSummary) return metric.definition;
  return `${metric.definition}\nHealth: ${metric.healthSummary}`;
}

function dscrHealth(value: number): { tone: MetricTone; summary: string } {
  if (value >= 1.4) {
    return {
      tone: "good",
      summary: `Green because weighted DSCR is ${value.toFixed(2)}x, which indicates solid average portfolio coverage.`
    };
  }
  if (value >= 1.25) {
    return {
      tone: "warning",
      summary: `Yellow because weighted DSCR is ${value.toFixed(2)}x, which is serviceable but not comfortably above stress levels.`
    };
  }
  return {
    tone: "critical",
    summary: `Red because weighted DSCR is ${value.toFixed(2)}x, which implies the portfolio is running with thin average debt-service cushion.`
  };
}

function headroomHealth(value: number): { tone: MetricTone; summary: string } {
  if (value >= 70) {
    return {
      tone: "good",
      summary: `Green because average headroom is ${value.toFixed(1)}% of expected cushion — portfolio performing near management case.`
    };
  }
  if (value >= 30) {
    return {
      tone: "warning",
      summary: `Yellow because average headroom is ${value.toFixed(1)}% of expected cushion — some erosion from management case.`
    };
  }
  return {
    tone: "critical",
    summary: `Red because average headroom is ${value.toFixed(1)}% of expected cushion — significant erosion, approaching default thresholds.`
  };
}

function queueHealth(
  value: number,
  label: string,
  zeroSummary: string,
  warningCutoff: number
): { tone: MetricTone; summary: string } {
  if (value === 0) {
    return {
      tone: "good",
      summary: `Green because there are no ${label}. ${zeroSummary}`
    };
  }
  if (value <= warningCutoff) {
    return {
      tone: "warning",
      summary: `Yellow because there are ${value} ${label}, which is manageable but needs attention.`
    };
  }
  return {
    tone: "critical",
    summary: `Red because there are ${value} ${label}, indicating elevated operational pressure.`
  };
}

function exposureHealth(
  exposure: number,
  totalExposure: number,
  summaryLabel: string,
  goodSummary: string
): { tone: MetricTone; summary: string } {
  const share = totalExposure > 0 ? exposure / totalExposure : 0;
  if (exposure === 0) {
    return {
      tone: "good",
      summary: `Green because ${goodSummary}`
    };
  }
  if (share <= 0.15) {
    return {
      tone: "warning",
      summary: `Yellow because ${summaryLabel} affects ${formatPct(share * 100)} of scoped exposure, which is contained but material.`
    };
  }
  return {
    tone: "critical",
    summary: `Red because ${summaryLabel} affects ${formatPct(share * 100)} of scoped exposure, indicating concentrated portfolio stress.`
  };
}

function fulfilmentHealth(value: number): { tone: MetricTone; summary: string } {
  if (value >= 95) {
    return {
      tone: "good",
      summary: `Green because trailing fulfilment rate is ${value.toFixed(1)}%, indicating strong reporting and compliance discipline.`
    };
  }
  if (value >= 85) {
    return {
      tone: "warning",
      summary: `Yellow because trailing fulfilment rate is ${value.toFixed(1)}%, showing some slippage in obligations delivery.`
    };
  }
  return {
    tone: "critical",
    summary: `Red because trailing fulfilment rate is ${value.toFixed(1)}%, meaning obligations are being missed too often.`
  };
}

function dealIssueHealth(
  value: number,
  label: string,
  zeroSummary: string,
  warningCutoff: number
): { tone: MetricTone; summary: string } {
  if (value === 0) {
    return {
      tone: "good",
      summary: `Green because there are no ${label}. ${zeroSummary}`
    };
  }
  if (value <= warningCutoff) {
    return {
      tone: "warning",
      summary: `Yellow because there are ${value} ${label}, which remains contained but needs attention.`
    };
  }
  return {
    tone: "critical",
    summary: `Red because there are ${value} ${label}, which suggests the issue is spreading across the portfolio.`
  };
}

function formatExposureCountValue(exposure: number, count: number) {
  return `${formatCompactMoney(exposure)} · ${count}`;
}

function isAdverseCovenantStatus(status: string | null) {
  if (!status) return false;
  return ["lock", "trigger", "default", "breach"].some((token) => status.includes(token));
}

function isUnderperformingGrade(grade: string | null) {
  if (!grade) return false;
  return grade.startsWith("3") || grade.startsWith("4");
}

function shouldOpenDrawer(event: ReactMouseEvent<HTMLAnchorElement>) {
  return !(
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  );
}

function distributionTone(status: string | null) {
  if (status === "blocked") return "critical";
  if (status === "restricted" || status === "review_required") return "warning";
  if (status === "allowed") return "good";
  return "neutral";
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
                  dealSlug: holding.dealSlug,
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
  onToggle: (rowId: string) => void,
  onOpenDeal: (slug: string, event: ReactMouseEvent<HTMLAnchorElement>) => void
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
          {row.href && row.dealSlug ? (
            <Link href={row.href} onClick={(event) => onOpenDeal(row.dealSlug!, event)}>
              {row.label}
            </Link>
          ) : row.href ? (
            <Link href={row.href}>{row.label}</Link>
          ) : (
            <span>{row.label}</span>
          )}
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

function renderDealsRow(
  deal: DashboardDealRow,
  onOpenDeal: (slug: string, event: ReactMouseEvent<HTMLAnchorElement>) => void
) {
  return (
    <div className="dashboard-row-copy">
      <div className="dashboard-row-title">
        <Link href={`/deals/${deal.dealSlug}`} onClick={(event) => onOpenDeal(deal.dealSlug, event)}>
          {deal.dealName}
        </Link>
        {deal.watchlist ? <span className="badge critical">watchlist</span> : null}
      </div>
      <span className="dashboard-row-secondary">
        {deal.borrower} · {deal.organisations.join(", ")}
      </span>
    </div>
  );
}

export function DashboardMonitor({
  portfolio,
  calendar
}: {
  portfolio: PortfolioResponse;
  calendar: PortfolioCalendarResponse;
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("hierarchy");
  const [expandedRowIds, setExpandedRowIds] = useState<string[]>([]);
  const [selectedInsightPanel, setSelectedInsightPanel] = useState<"adverse-covenant-exposure" | null>(null);
  const [selectedDealSlug, setSelectedDealSlug] = useState<string | null>(null);
  const [drawerCache, setDrawerCache] = useState<Record<string, PortfolioDealDrawerResponse>>({});
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [loadingDealSlug, setLoadingDealSlug] = useState<string | null>(null);

  const expandedRows = new Set(expandedRowIds);
  const hierarchyRows = buildHierarchyRows(portfolio.holdings);
  const flattenedHierarchy = flattenHierarchyRows(hierarchyRows, expandedRows);
  const portfolioCalendarHref = buildPortfolioHref(
    "/portfolio/calendar",
    portfolio.selectedFilters
  );
  const portfolioPacksHref = buildPortfolioHref("/portfolio/packs", portfolio.selectedFilters);
  const clearFiltersHref = buildPortfolioHref("/portfolio", {
    organisation: portfolio.selectedFilters.organisation,
    owner: portfolio.selectedFilters.owner,
    account: portfolio.selectedFilters.account,
    asAt: portfolio.selectedFilters.asAt,
    sector: null,
    region: null,
    dealType: null,
    phase: null,
    grade: null,
    watchlist: null,
    revenueRisk: null
  });
  const advancedFiltersActive = Boolean(
    portfolio.selectedFilters.sector ||
      portfolio.selectedFilters.dealType ||
      portfolio.selectedFilters.phase ||
      portfolio.selectedFilters.revenueRisk
  );
  const activeFilterChips = [
    `As of ${formatDateLabel(portfolio.selectedFilters.asAt)}`,
    portfolio.selectedFilters.grade ? `Grade ${portfolio.selectedFilters.grade}` : null,
    portfolio.selectedFilters.watchlist && portfolio.selectedFilters.watchlist !== "all"
      ? `Watchlist ${portfolio.selectedFilters.watchlist}`
      : null,
    portfolio.selectedFilters.region ? `Region ${portfolio.selectedFilters.region}` : null,
    portfolio.selectedFilters.sector ? `Sector ${portfolio.selectedFilters.sector}` : null,
    portfolio.selectedFilters.dealType ? `Type ${portfolio.selectedFilters.dealType}` : null,
    portfolio.selectedFilters.phase ? `Phase ${portfolio.selectedFilters.phase}` : null,
    portfolio.selectedFilters.revenueRisk
      ? `Revenue risk ${portfolio.selectedFilters.revenueRisk}`
      : null
  ].filter((value): value is string => Boolean(value));
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(advancedFiltersActive);
  const dscrStatus = dscrHealth(portfolio.weightedAvgDscr);
  const headroomStatus = headroomHealth(portfolio.weightedAvgHeadroomPct);
  const overdueStatus = queueHealth(
    portfolio.overdueObligations,
    "overdue obligations",
    "Compliance delivery is currently clean.",
    1
  );
  const reviewStatus = queueHealth(
    portfolio.pendingReviews,
    "pending reviews",
    "No reviewer backlog is visible in the current slice.",
    2
  );
  const alertStatus = queueHealth(
    portfolio.recentAlerts.length,
    "recent alerts",
    "The portfolio has low current alert pressure.",
    2
  );
  const blockedCycleStatus = queueHealth(
    calendar.summary.blockedCycles,
    "blocked cycles",
    "No monitoring cycles are blocked in the current calendar view.",
    1
  );
  const dealHeadroomMap = new Map<string, { exposure: number; headroomPct: number | null }>();
  for (const holding of portfolio.holdings) {
    const existing = dealHeadroomMap.get(holding.dealSlug);
    if (existing) {
      existing.exposure += holding.exposure;
      if (existing.headroomPct === null && holding.headroomPct !== null) {
        existing.headroomPct = holding.headroomPct;
      }
      continue;
    }
    dealHeadroomMap.set(holding.dealSlug, {
      exposure: holding.exposure,
      headroomPct: holding.headroomPct
    });
  }

  const adverseDeals = portfolio.deals.filter((deal) => isAdverseCovenantStatus(deal.covenantStatus));
  const adverseCovenantExposure = adverseDeals.reduce((sum, deal) => sum + deal.exposure, 0);
  const nearThresholdDeals = Array.from(dealHeadroomMap.values()).filter(
    (deal) => deal.headroomPct !== null && deal.headroomPct < 5
  );
  const nearThresholdExposure = nearThresholdDeals.reduce((sum, deal) => sum + deal.exposure, 0);
  const watchlistUnderperformingDeals = portfolio.deals.filter(
    (deal) => deal.watchlist || isUnderperformingGrade(deal.grade)
  );
  const watchlistUnderperformingExposure = watchlistUnderperformingDeals.reduce(
    (sum, deal) => sum + deal.exposure,
    0
  );
  const restrictedBlockedDeals = portfolio.deals.filter((deal) =>
    ["restricted", "review_required", "blocked"].includes(deal.distributionStatus ?? "")
  );
  const restrictedBlockedExposure = restrictedBlockedDeals.reduce(
    (sum, deal) => sum + deal.exposure,
    0
  );

  const adverseStatus = exposureHealth(
    adverseCovenantExposure,
    portfolio.totalAum,
    "adverse covenant status",
    "no scoped exposure is in lock-up, trigger, breach, or default status."
  );
  const nearThresholdStatus = exposureHealth(
    nearThresholdExposure,
    portfolio.totalAum,
    "near-threshold covenant headroom",
    "no scoped exposure is sitting within 5% of an adverse covenant threshold."
  );
  const watchlistExposureStatus = exposureHealth(
    watchlistUnderperformingExposure,
    portfolio.totalAum,
    "watchlist or weak-grade exposure",
    "watchlist and weak-grade exposure is not present in the current slice."
  );
  const fulfilmentStatus = fulfilmentHealth(portfolio.healthInputs.fulfilmentRatePct);
  const riskStatus = dealIssueHealth(
    portfolio.healthInputs.highCriticalRiskCount,
    "high or critical open risks",
    "No severe open risks are recorded in scope.",
    2
  );
  const deteriorationStatus = dealIssueHealth(
    portfolio.healthInputs.deterioratingDealCount,
    "deteriorating deals",
    "No active downward trend flags are visible in the current slice.",
    2
  );

  const topHealthMetrics: KeyMetric[] = [
    {
      label: "Adverse covenant exposure",
      value: formatExposureCountValue(adverseCovenantExposure, adverseDeals.length),
      tone: adverseStatus.tone,
      definition:
        "Scoped exposure and deal count currently in lock-up, trigger, breach, or default-style covenant states.",
      healthSummary: adverseStatus.summary,
      onClick: openAdverseCovenantDrawer
    },
    {
      label: "Near-threshold exposure",
      value: formatExposureCountValue(nearThresholdExposure, nearThresholdDeals.length),
      tone: nearThresholdStatus.tone,
      definition:
        "Scoped exposure and deal count with less than 5% covenant headroom to the nearest adverse threshold.",
      healthSummary: nearThresholdStatus.summary
    },
    {
      label: "Watchlist / weak-grade exposure",
      value: formatExposureCountValue(
        watchlistUnderperformingExposure,
        watchlistUnderperformingDeals.length
      ),
      tone: watchlistExposureStatus.tone,
      definition:
        "Scoped exposure and deal count either on watchlist or carrying a weak performance grade.",
      healthSummary: watchlistExposureStatus.summary
    },
    {
      label: "Fulfilment rate",
      value: formatPct(portfolio.healthInputs.fulfilmentRatePct),
      tone: fulfilmentStatus.tone,
      definition:
        "Trailing 12-month rate of obligations fulfilled on time across the current portfolio slice.",
      healthSummary: fulfilmentStatus.summary
    }
  ];

  const contextMetrics: KeyMetric[] = [
    {
      label: "Scoped exposure",
      value: formatCompactMoney(portfolio.totalAum),
      tone: "neutral",
      definition:
        "Total exposure represented by the current scope, filters, and as-of date."
    },
    {
      label: "Distinct deals",
      value: String(portfolio.dealCount),
      tone: "neutral",
      definition:
        "Number of unique deals represented in the current portfolio slice."
    },
    {
      label: "Weighted avg. DSCR",
      value: formatRatio(portfolio.weightedAvgDscr),
      tone: dscrStatus.tone,
      definition:
        "Exposure-weighted average reported DSCR for the currently scoped portfolio slice.",
      healthSummary: dscrStatus.summary
    },
    {
      label: "Avg. headroom",
      value: formatPct(portfolio.weightedAvgHeadroomPct),
      tone: headroomStatus.tone,
      definition:
        "Exposure-weighted average covenant headroom across the deals in the current view.",
      healthSummary: headroomStatus.summary
    }
  ];

  const otherMetrics: KeyMetric[] = [
    {
      label: "Restricted / blocked exposure",
      value: formatExposureCountValue(restrictedBlockedExposure, restrictedBlockedDeals.length),
      tone: distributionTone(
        restrictedBlockedDeals.some((deal) => deal.distributionStatus === "blocked")
          ? "blocked"
          : restrictedBlockedDeals.length > 0
            ? "restricted"
            : "allowed"
      ),
      definition:
        "Scoped exposure and deal count currently subject to restricted, review-required, or blocked distributions."
    },
    {
      label: "Watchlist deals",
      value: String(portfolio.watchlistCount),
      tone: portfolio.watchlistCount > 0 ? "warning" : "neutral",
      definition:
        "Number of deals currently flagged on watchlist in the selected scope."
    },
    {
      label: "Ready for release",
      value: String(calendar.summary.readyForRelease),
      tone: calendar.summary.readyForRelease > 0 ? "good" : "neutral",
      definition:
        "Number of monitoring cycles currently complete enough to move toward release."
    }
  ];

  const actionMetrics: KeyMetric[] = [
    {
      label: "Overdue obligations",
      value: String(portfolio.overdueObligations),
      tone: overdueStatus.tone,
      definition:
        "Count of compliance or reporting obligations that are currently overdue in the selected slice.",
      healthSummary: overdueStatus.summary,
      href: "/compliance"
    },
    {
      label: "Pending reviews",
      value: String(portfolio.pendingReviews),
      tone: reviewStatus.tone,
      definition:
        "Count of review items still awaiting human review or approval in the selected slice.",
      healthSummary: reviewStatus.summary,
      href: "/review"
    },
    {
      label: "High / critical risks",
      value: String(portfolio.healthInputs.highCriticalRiskCount),
      tone: riskStatus.tone,
      definition:
        "Count of open risk register items with high or critical severity in the selected slice.",
      healthSummary: riskStatus.summary
    },
    {
      label: "Recent alerts",
      value: String(portfolio.recentAlerts.length),
      tone: alertStatus.tone,
      definition:
        "Number of recent portfolio alerts surfaced for the current scope and date context.",
      healthSummary: alertStatus.summary,
      href: "/notifications"
    },
    {
      label: "Open requests",
      value: String(portfolio.summary.openRequests),
      tone: portfolio.summary.openRequests > 0 ? "warning" : "neutral",
      definition:
        "Number of open borrower requests, consents, or waiver items in the current slice."
    },
    {
      label: "Deteriorating deals",
      value: String(portfolio.healthInputs.deterioratingDealCount),
      tone: deteriorationStatus.tone,
      definition:
        "Count of deals with active downward trend records as of the selected date.",
      healthSummary: deteriorationStatus.summary
    },
    {
      label: "Blocked cycles",
      value: String(calendar.summary.blockedCycles),
      tone: blockedCycleStatus.tone,
      definition:
        "Number of monitoring cycles currently blocked from progressing or releasing.",
      healthSummary: blockedCycleStatus.summary,
      href: portfolioCalendarHref
    }
  ];

  function toggleRow(rowId: string) {
    setExpandedRowIds((current) =>
      current.includes(rowId)
        ? current.filter((value) => value !== rowId)
        : [...current, rowId]
    );
  }

  function readDrawerSlugFromUrl() {
    if (typeof window === "undefined") return null;
    return new URL(window.location.href).searchParams.get("deal");
  }

  function writeDrawerSlugToUrl(slug: string | null, mode: "push" | "replace") {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (slug) {
      url.searchParams.set("deal", slug);
    } else {
      url.searchParams.delete("deal");
    }
    const nextHref = `${url.pathname}${url.search}${url.hash}`;
    const state = {
      ...(window.history.state ?? {}),
      portfolioDealOverlay: Boolean(slug),
      portfolioDealSlug: slug
    };

    if (mode === "push") {
      window.history.pushState(state, "", nextHref);
      return;
    }
    window.history.replaceState(state, "", nextHref);
  }

  function openDealDrawer(slug: string) {
    setSelectedInsightPanel(null);
    setDrawerError(null);
    setSelectedDealSlug(slug);
    if (readDrawerSlugFromUrl() !== slug) {
      writeDrawerSlugToUrl(slug, "push");
    }
  }

  function closeDealDrawer() {
    if (typeof window === "undefined") {
      setSelectedDealSlug(null);
      return;
    }
    if (window.history.state?.portfolioDealOverlay && readDrawerSlugFromUrl() === selectedDealSlug) {
      window.history.back();
      return;
    }
    setSelectedDealSlug(null);
    setDrawerError(null);
    writeDrawerSlugToUrl(null, "replace");
  }

  function handleDealLinkClick(
    slug: string,
    event: ReactMouseEvent<HTMLAnchorElement>
  ) {
    if (!shouldOpenDrawer(event)) {
      return;
    }
    event.preventDefault();
    openDealDrawer(slug);
  }

  function openAdverseCovenantDrawer() {
    setDrawerError(null);
    setSelectedDealSlug(null);
    writeDrawerSlugToUrl(null, "replace");
    setSelectedInsightPanel("adverse-covenant-exposure");
  }

  function closeInsightPanel() {
    setSelectedInsightPanel(null);
  }

  useEffect(() => {
    const syncDrawerFromUrl = () => {
      setDrawerError(null);
      setSelectedDealSlug(readDrawerSlugFromUrl());
    };

    syncDrawerFromUrl();
    window.addEventListener("popstate", syncDrawerFromUrl);
    return () => window.removeEventListener("popstate", syncDrawerFromUrl);
  }, []);

  useEffect(() => {
    if (!selectedDealSlug) {
      setLoadingDealSlug(null);
      return;
    }
    if (drawerCache[selectedDealSlug]) {
      setLoadingDealSlug(null);
      return;
    }

    const controller = new AbortController();
    setLoadingDealSlug(selectedDealSlug);
    setDrawerError(null);

    fetch(`/api/portfolio-deals/${selectedDealSlug}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ error: "Request failed" }));
          throw new Error(errorBody.error ?? `Request failed: ${response.status}`);
        }
        return response.json() as Promise<PortfolioDealDrawerResponse>;
      })
      .then((payload) => {
        setDrawerCache((current) => ({ ...current, [payload.slug]: payload }));
      })
      .catch((error) => {
        if (controller.signal.aborted) {
          return;
        }
        setDrawerError(error instanceof Error ? error.message : "Unable to load deal detail.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingDealSlug((current) => (current === selectedDealSlug ? null : current));
        }
      });

    return () => controller.abort();
  }, [drawerCache, selectedDealSlug]);

  useEffect(() => {
    if (!selectedDealSlug && !selectedInsightPanel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedDealSlug, selectedInsightPanel]);

  const selectedDeal = selectedDealSlug ? drawerCache[selectedDealSlug] ?? null : null;
  const adverseDealsByStatus = Array.from(
    adverseDeals.reduce((groups, deal) => {
      const key = deal.covenantStatus;
      const existing = groups.get(key) ?? { status: key, exposure: 0, count: 0 };
      existing.exposure += deal.exposure;
      existing.count += 1;
      groups.set(key, existing);
      return groups;
    }, new Map<string, { status: string; exposure: number; count: number }>())
      .values()
  ).sort((left, right) => right.exposure - left.exposure);
  const adverseRestrictedDeals = adverseDeals.filter((deal) =>
    ["restricted", "review_required", "blocked"].includes(deal.distributionStatus ?? "")
  );
  const adverseOverdueCount = adverseDeals.reduce((sum, deal) => sum + deal.overdueObligations, 0);
  const adversePendingReviews = adverseDeals.reduce((sum, deal) => sum + deal.pendingReviews, 0);
  const adverseOpenRequests = adverseDeals.reduce((sum, deal) => sum + deal.openRequests, 0);
  const adverseWatchlistDeals = adverseDeals.filter((deal) => deal.watchlist).length;

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Portfolio</p>
          <h1>{portfolio.currentScope.title}</h1>
          <p className="hero-copy">
            {portfolio.currentScope.subtitle}. Use hierarchy view to drill from
            organisation to deal, or switch to deals view for a flat monitoring
            list across the current scope.
          </p>
          <div className="hero-actions">
            <Link className="button secondary" href={portfolioCalendarHref}>
              Calendar
            </Link>
            <Link className="button secondary" href={portfolioPacksHref}>
              Committee packs
            </Link>
          </div>
          <div className="detail-copy">
            {portfolio.currentScope.breadcrumb.map((item) => (
              <span key={item.href}>
                {item.active ? (
                  <strong>{item.label}</strong>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
                {!item.active ? " / " : ""}
              </span>
            ))}
          </div>
        </div>
        <div className="hero-card emphasis-card">
          <p className="eyebrow">{portfolio.asOf.isHistorical ? "Historical view" : "Current view"}</p>
          <h2>{formatDateLabel(portfolio.asOf.effective)}</h2>
          <p>
            {portfolio.asOf.isHistorical
              ? `Portfolio metrics are rendered as at ${formatDateLabel(portfolio.asOf.effective)}.`
              : `Using the active demo date from ${portfolio.asOf.clockLabel}.`}
          </p>
          <div className="summary-stat-list">
            <div className="summary-stat">
              <span>Deals</span>
              <strong>{portfolio.summary.dealCount}</strong>
            </div>
            <div className="summary-stat">
              <span>Pending reviews</span>
              <strong>{portfolio.summary.pendingReviews}</strong>
            </div>
            <div className="summary-stat">
              <span>Open requests</span>
              <strong>{portfolio.summary.openRequests}</strong>
            </div>
            {portfolio.currentScope.benchmark ? (
              <div className="summary-stat">
                <span>Benchmark</span>
                <strong>{portfolio.currentScope.benchmark}</strong>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel section-panel portfolio-toolbar">
        <form action="/portfolio" className="portfolio-toolbar-form">
          <div className="portfolio-toolbar-row">
            <label className="portfolio-toolbar-field">
              <span>As of</span>
              <input type="date" name="asAt" defaultValue={portfolio.selectedFilters.asAt} />
            </label>
            <label className="portfolio-toolbar-field">
              <span>Grade</span>
              <select name="grade" defaultValue={portfolio.selectedFilters.grade ?? ""}>
                <option value="">All grades</option>
                {portfolio.availableFilters.grades.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="portfolio-toolbar-field">
              <span>Watchlist</span>
              <select name="watchlist" defaultValue={portfolio.selectedFilters.watchlist ?? "all"}>
                <option value="all">All states</option>
                <option value="watchlist">Watchlist only</option>
                <option value="clear">Clear only</option>
              </select>
            </label>
            <label className="portfolio-toolbar-field">
              <span>Region</span>
              <select name="region" defaultValue={portfolio.selectedFilters.region ?? ""}>
                <option value="">All regions</option>
                {portfolio.availableFilters.regions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="portfolio-toolbar-actions">
              <button className="button" type="submit">
                Apply
              </button>
              <Link className="button secondary" href={clearFiltersHref}>
                Clear
              </Link>
            </div>
          </div>

          <div className="insight-pill-row">
            {activeFilterChips.map((chip) => (
              <span key={chip} className="badge neutral">
                {chip}
              </span>
            ))}
          </div>

          <div className="portfolio-toolbar-advanced">
            <button
              type="button"
              className="portfolio-toolbar-disclosure"
              onClick={() => setShowAdvancedFilters((current) => !current)}
            >
              {showAdvancedFilters ? "Hide filters" : "More filters"}
            </button>
            {showAdvancedFilters ? (
            <div className="portfolio-toolbar-advanced-grid">
              <label className="field">
                <span>Organisation</span>
                <select name="organisation" defaultValue={portfolio.selectedFilters.organisation ?? ""}>
                  <option value="">All organisations</option>
                  {portfolio.hierarchy.organisations.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Owner</span>
                <select name="owner" defaultValue={portfolio.selectedFilters.owner ?? ""}>
                  <option value="">All owners</option>
                  {portfolio.hierarchy.owners.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Account</span>
                <select name="account" defaultValue={portfolio.selectedFilters.account ?? ""}>
                  <option value="">All accounts</option>
                  {portfolio.hierarchy.accounts.map((item) => (
                    <option key={item.id} value={String(item.id)}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Sector</span>
                <select name="sector" defaultValue={portfolio.selectedFilters.sector ?? ""}>
                  <option value="">All sectors</option>
                  {portfolio.availableFilters.sectors.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Deal type</span>
                <select name="dealType" defaultValue={portfolio.selectedFilters.dealType ?? ""}>
                  <option value="">All deal types</option>
                  {portfolio.availableFilters.dealTypes.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Phase</span>
                <select name="phase" defaultValue={portfolio.selectedFilters.phase ?? ""}>
                  <option value="">All phases</option>
                  {portfolio.availableFilters.phases.map((item) => (
                    <option key={item} value={item}>
                      {item.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Revenue risk</span>
                <select
                  name="revenueRisk"
                  defaultValue={portfolio.selectedFilters.revenueRisk ?? ""}
                >
                  <option value="">All revenue risk classes</option>
                  {portfolio.availableFilters.revenueRisks.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel section-panel dashboard-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Workbench</p>
            <h2>Portfolio workbench</h2>
          </div>
        </div>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Key Metrics</p>
            <h3>Portfolio metrics</h3>
          </div>
        </div>
        <div className="metric-groups">
          <section className="metric-group">
            <div className="metric-group-heading">
              <p className="eyebrow">Top Health Metrics</p>
            </div>
            <div className="metric-group-grid">
              {topHealthMetrics.map((metric) =>
                metric.href ? (
                  <Link
                    key={metric.label}
                    className={`key-metric-card ${metric.tone}`}
                    href={metric.href}
                    title={metricTooltip(metric)}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </Link>
                ) : metric.onClick ? (
                  <button
                    key={metric.label}
                    className={`key-metric-card ${metric.tone}`}
                    title={metricTooltip(metric)}
                    type="button"
                    onClick={metric.onClick}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </button>
                ) : (
                  <article
                    key={metric.label}
                    className={`key-metric-card ${metric.tone}`}
                    title={metricTooltip(metric)}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </article>
                )
              )}
            </div>
          </section>
          <section className="metric-group">
            <div className="metric-group-heading">
              <p className="eyebrow">Context Metrics</p>
            </div>
            <div className="metric-group-grid">
              {contextMetrics.map((metric) => (
                <article
                  key={metric.label}
                  className={`key-metric-card ${metric.tone}`}
                  title={metricTooltip(metric)}
                >
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </article>
              ))}
            </div>
          </section>
          <section className="metric-group">
            <div className="metric-group-heading">
              <p className="eyebrow">Other Metrics</p>
            </div>
            <div className="metric-group-grid">
              {otherMetrics.map((metric) =>
                metric.href ? (
                  <Link
                    key={metric.label}
                    className={`key-metric-card ${metric.tone}`}
                    href={metric.href}
                    title={metricTooltip(metric)}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </Link>
                ) : metric.onClick ? (
                  <button
                    key={metric.label}
                    className={`key-metric-card ${metric.tone}`}
                    title={metricTooltip(metric)}
                    type="button"
                    onClick={metric.onClick}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </button>
                ) : (
                  <article
                    key={metric.label}
                    className={`key-metric-card ${metric.tone}`}
                    title={metricTooltip(metric)}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </article>
                )
              )}
            </div>
          </section>
          <section className="metric-group">
            <div className="metric-group-heading">
              <p className="eyebrow">Actions</p>
            </div>
            <div className="metric-group-grid">
              {actionMetrics.map((metric) =>
                metric.href ? (
                  <Link
                    key={metric.label}
                    className={`key-metric-card ${metric.tone}`}
                    href={metric.href}
                    title={metricTooltip(metric)}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </Link>
                ) : metric.onClick ? (
                  <button
                    key={metric.label}
                    className={`key-metric-card ${metric.tone}`}
                    title={metricTooltip(metric)}
                    type="button"
                    onClick={metric.onClick}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </button>
                ) : (
                  <article
                    key={metric.label}
                    className={`key-metric-card ${metric.tone}`}
                    title={metricTooltip(metric)}
                  >
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </article>
                )
              )}
            </div>
          </section>
        </div>
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Hierarchy</p>
            <h3>Hierarchy and deal monitoring</h3>
          </div>
          <div className="dashboard-view-toggle" role="tablist" aria-label="Portfolio views">
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
          Hover over any metric for its definition. Health metrics explain why
          the current value is green, yellow, or red.
        </p>

        <div className="dashboard-table-wrap">
          <table className="dashboard-table">
            <colgroup>
              <col style={{ width: "22%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "9%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "8%" }} />
            </colgroup>
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
                      <th>{renderRowLabel(row, expandedRows, toggleRow, handleDealLinkClick)}</th>
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
                : portfolio.deals.map((deal) => (
                    <tr key={deal.dealSlug}>
                      <th>{renderDealsRow(deal, handleDealLinkClick)}</th>
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

      {selectedInsightPanel === "adverse-covenant-exposure" ? (
        <div className="portfolio-deal-overlay" onClick={closeInsightPanel}>
          <aside
            aria-labelledby="portfolio-insight-drawer-title"
            aria-modal="true"
            className="portfolio-deal-drawer"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="portfolio-deal-drawer-header">
              <div>
                <p className="eyebrow">Portfolio Insight</p>
                <h2 id="portfolio-insight-drawer-title">Adverse covenant exposure</h2>
                <p className="detail-copy">
                  Deals currently in lock-up, trigger, breach, or default-style covenant states for
                  the active portfolio scope.
                </p>
              </div>
              <div className="portfolio-deal-drawer-actions">
                <button className="button secondary" type="button" onClick={closeInsightPanel}>
                  Close
                </button>
              </div>
            </div>
            <div className="portfolio-deal-drawer-body">
              <section className="panel portfolio-deal-summary-panel">
                <div className="portfolio-deal-stat-grid">
                  <div className="mini-card">
                    <strong>Scoped exposure</strong>
                    <p>{formatMoney(adverseCovenantExposure)}</p>
                  </div>
                  <div className="mini-card">
                    <strong>Affected deals</strong>
                    <p>{adverseDeals.length}</p>
                  </div>
                  <div className="mini-card">
                    <strong>Share of scope</strong>
                    <p>{formatPct(portfolio.totalAum > 0 ? (adverseCovenantExposure / portfolio.totalAum) * 100 : 0)}</p>
                  </div>
                  <div className="mini-card">
                    <strong>Watchlist deals</strong>
                    <p>{adverseWatchlistDeals}</p>
                  </div>
                  <div className="mini-card">
                    <strong>Overdue obligations</strong>
                    <p>{adverseOverdueCount}</p>
                  </div>
                  <div className="mini-card">
                    <strong>Pending reviews</strong>
                    <p>{adversePendingReviews}</p>
                  </div>
                  <div className="mini-card">
                    <strong>Open requests</strong>
                    <p>{adverseOpenRequests}</p>
                  </div>
                  <div className="mini-card">
                    <strong>Restricted / blocked</strong>
                    <p>{adverseRestrictedDeals.length}</p>
                  </div>
                </div>
              </section>

              <section className="portfolio-deal-grid">
                <article className="panel">
                  <strong>Status concentration</strong>
                  <div className="stack compact-stack">
                    {adverseDealsByStatus.map((item) => (
                      <div key={item.status} className="mini-card">
                        <div className="status-row">
                          <strong>{titleize(item.status)}</strong>
                          <span className={`badge ${badgeTone(item.status)}`}>{item.count} deals</span>
                        </div>
                        <p>{formatMoney(item.exposure)}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="panel">
                  <strong>What this panel shows</strong>
                  <div className="stack compact-stack">
                    <div className="mini-card">
                      <p>
                        This drawer isolates the deals driving the adverse covenant metric so you
                        can assess severity, operational pressure, and deal-specific follow-up
                        without leaving the portfolio screen.
                      </p>
                    </div>
                    <div className="mini-card">
                      <p>
                        Click any affected deal below to open its deal summary drawer, or use
                        `Open full page` from there if you need the full deal workspace.
                      </p>
                    </div>
                  </div>
                </article>
              </section>

              <section className="panel">
                <div className="status-row">
                  <strong>Affected deals</strong>
                  <span className="badge critical">{adverseDeals.length}</span>
                </div>
                {adverseDeals.length ? (
                  <div className="stack compact-stack">
                    {adverseDeals.map((deal) => (
                      <button
                        key={deal.dealSlug}
                        type="button"
                        className="portfolio-insight-row"
                        onClick={() => openDealDrawer(deal.dealSlug)}
                      >
                        <div className="portfolio-insight-row-copy">
                          <div className="status-row">
                            <strong>{deal.dealName}</strong>
                            <span className={`badge ${badgeTone(deal.covenantStatus)}`}>
                              {titleize(deal.covenantStatus)}
                            </span>
                            {deal.watchlist ? <span className="badge critical">watchlist</span> : null}
                          </div>
                          <p>
                            {deal.borrower} · {deal.grade} · {titleize(deal.distributionStatus)}
                          </p>
                          <p className="meta-note">
                            DSCR {formatRatio(deal.reportedDscr)} · overdue {deal.overdueObligations} ·
                            reviews {deal.pendingReviews} · requests {deal.openRequests}
                          </p>
                        </div>
                        <div className="portfolio-insight-row-metrics">
                          <strong>{formatMoney(deal.exposure)}</strong>
                          <span>
                            {deal.forecastedDscr !== null
                              ? `Forecast ${formatRatio(deal.forecastedDscr)}`
                              : "No forecast"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p>No deals are currently in an adverse covenant state for this portfolio view.</p>
                )}
              </section>
            </div>
          </aside>
        </div>
      ) : null}

      {selectedDealSlug ? (
        <div className="portfolio-deal-overlay" onClick={closeDealDrawer}>
          <aside
            aria-labelledby="portfolio-deal-drawer-title"
            aria-modal="true"
            className="portfolio-deal-drawer"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="portfolio-deal-drawer-header">
              <div>
                <p className="eyebrow">Deal Summary</p>
                <h2 id="portfolio-deal-drawer-title">
                  {selectedDeal?.name ?? loadingDealSlug ?? "Loading deal"}
                </h2>
                {selectedDeal ? (
                  <p className="detail-copy">
                    {selectedDeal.borrower} · {selectedDeal.dealType} · {selectedDeal.region}
                  </p>
                ) : null}
              </div>
              <div className="portfolio-deal-drawer-actions">
                {selectedDealSlug ? (
                  <Link className="button secondary" href={`/deals/${selectedDealSlug}`}>
                    Open full page
                  </Link>
                ) : null}
                <button className="button secondary" type="button" onClick={closeDealDrawer}>
                  Close
                </button>
              </div>
            </div>
            <div className="portfolio-deal-drawer-body">
              {loadingDealSlug === selectedDealSlug && !selectedDeal ? (
                <section className="panel">
                  <p>Loading deal detail…</p>
                </section>
              ) : null}
              {drawerError ? (
                <section className="panel">
                  <p>{drawerError}</p>
                </section>
              ) : null}
              {selectedDeal ? (
                <>
                  <section className="panel portfolio-deal-summary-panel">
                    <div className="portfolio-deal-badges">
                      <span className="badge neutral">{selectedDeal.grade}</span>
                      <span className={`badge ${badgeTone(selectedDeal.status)}`}>
                        {titleize(selectedDeal.status)}
                      </span>
                      <span className="badge neutral">{selectedDeal.revenueRisk}</span>
                      {selectedDeal.watchlist ? <span className="badge critical">watchlist</span> : null}
                    </div>
                    <p className="detail-copy">{selectedDeal.summary}</p>
                    <div className="portfolio-deal-stat-grid">
                      <div className="mini-card">
                        <strong>Exposure</strong>
                        <p>{formatMoney(selectedDeal.exposure)}</p>
                      </div>
                      <div className="mini-card">
                        <strong>Facility</strong>
                        <p>{formatMoney(selectedDeal.facilityAmount)}</p>
                      </div>
                      <div className="mini-card">
                        <strong>Senior DSCR</strong>
                        <p>{formatRatio(selectedDeal.covenant.currentValue)}</p>
                      </div>
                      <div className="mini-card">
                        <strong>Headroom</strong>
                        <p>{formatPct(selectedDeal.covenant.headroomPct)}</p>
                      </div>
                      <div className="mini-card">
                        <strong>Latest period</strong>
                        <p>{selectedDeal.latestPeriodLabel}</p>
                      </div>
                      <div className="mini-card">
                        <strong>Next test</strong>
                        <p>{selectedDeal.nextTestDate}</p>
                      </div>
                    </div>
                  </section>

                  <section className="portfolio-deal-grid">
                    <article className="panel">
                      <div className="status-row">
                        <strong>Assessment</strong>
                        <span className={`badge ${badgeTone(selectedDeal.assessment.escalationLevel)}`}>
                          {titleize(selectedDeal.assessment.escalationLevel)}
                        </span>
                      </div>
                      <p>{selectedDeal.assessment.summary}</p>
                      <p className="meta-note">
                        Score {selectedDeal.assessment.overallScore.toFixed(1)} · recommendation{" "}
                        {titleize(selectedDeal.assessment.watchlistRecommendation)}
                      </p>
                    </article>
                    <article className="panel">
                      <div className="status-row">
                        <strong>Distribution</strong>
                        {selectedDeal.distributionAssessment ? (
                          <span
                            className={`badge ${distributionTone(selectedDeal.distributionAssessment.status)}`}
                          >
                            {titleize(selectedDeal.distributionAssessment.status)}
                          </span>
                        ) : (
                          <span className="badge neutral">not assessed</span>
                        )}
                      </div>
                      <p>
                        {selectedDeal.distributionAssessment?.summary ??
                          "No distribution assessment is currently available for this deal."}
                      </p>
                      <p className="meta-note">
                        {selectedDeal.distributionAssessment
                          ? `${selectedDeal.distributionAssessment.periodLabel} · blockers ${selectedDeal.distributionAssessment.blockerCount}`
                          : `Last reported ${formatDateTimeLabel(selectedDeal.latestReportedAt)}`}
                      </p>
                    </article>
                  </section>

                  <section className="portfolio-deal-grid">
                    <article className="panel">
                      <div className="status-row">
                        <strong>Overdue obligations</strong>
                        <span
                          className={`badge ${badgeTone(
                            selectedDeal.overdueObligations.length ? "overdue" : "clear"
                          )}`}
                        >
                          {selectedDeal.overdueObligations.length}
                        </span>
                      </div>
                      {selectedDeal.overdueObligations.length ? (
                        <div className="stack compact-stack">
                          {selectedDeal.overdueObligations.map((item) => (
                            <div key={item.id} className="mini-card">
                              <strong>{item.title}</strong>
                              <p>{item.daysOverdue} days overdue</p>
                              <p className="meta-note">Due {item.dueDate}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>All currently scheduled obligations are up to date.</p>
                      )}
                    </article>
                    <article className="panel">
                      <div className="status-row">
                        <strong>Open risks</strong>
                        <span
                          className={`badge ${badgeTone(
                            selectedDeal.riskSnapshot.highSeverityCount ? "high" : "clear"
                          )}`}
                        >
                          {selectedDeal.riskSnapshot.openCount} open
                        </span>
                      </div>
                      {selectedDeal.riskSnapshot.entries.length ? (
                        <div className="stack compact-stack">
                          {selectedDeal.riskSnapshot.entries.map((entry) => (
                            <div key={entry.id} className="mini-card">
                              <div className="status-row">
                                <strong>{entry.title}</strong>
                                <span className={`badge ${badgeTone(entry.severity)}`}>
                                  {entry.severity}
                                </span>
                              </div>
                              <p>{entry.summary}</p>
                              <p className="meta-note">
                                {entry.ownerName} · review {entry.nextReviewDate}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No open risks are currently recorded.</p>
                      )}
                    </article>
                  </section>

                  <section className="portfolio-deal-grid">
                    <article className="panel">
                      <div className="status-row">
                        <strong>Borrower requests</strong>
                        <span
                          className={`badge ${badgeTone(
                            selectedDeal.borrowerRequests.length ? "open" : "clear"
                          )}`}
                        >
                          {selectedDeal.borrowerRequests.length}
                        </span>
                      </div>
                      {selectedDeal.borrowerRequests.length ? (
                        <div className="stack compact-stack">
                          {selectedDeal.borrowerRequests.map((request) => (
                            <div key={request.id} className="mini-card">
                              <div className="status-row">
                                <strong>{request.title}</strong>
                                <span className={`badge ${badgeTone(request.priority)}`}>
                                  {request.priority}
                                </span>
                              </div>
                              <p>{request.summary}</p>
                              <p className="meta-note">
                                Due {request.dueDate} · votes {request.totalVotes} · oppose{" "}
                                {request.opposeVotes}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No borrower requests are currently open.</p>
                      )}
                    </article>
                    <article className="panel">
                      <div className="status-row">
                        <strong>Trend detection</strong>
                        <span
                          className={`badge ${badgeTone(
                            selectedDeal.activeTrends.length ? "watchlist" : "clear"
                          )}`}
                        >
                          {selectedDeal.activeTrends.length}
                        </span>
                      </div>
                      {selectedDeal.activeTrends.length ? (
                        <div className="stack compact-stack">
                          {selectedDeal.activeTrends.map((trend) => (
                            <div key={trend.id} className="mini-card">
                              <div className="status-row">
                                <strong>{trend.metricLabel}</strong>
                                <span className={`badge ${badgeTone(trend.severity)}`}>
                                  {trend.severity}
                                </span>
                              </div>
                              <p>{trend.summary}</p>
                              <p className="meta-note">{trend.periodsObserved} periods observed</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No active deterioration trends are currently flagged.</p>
                      )}
                    </article>
                  </section>

                  <section className="panel">
                    <strong>Latest period summary</strong>
                    <p>{selectedDeal.latestPeriodSummary}</p>
                  </section>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

    </main>
  );
}
