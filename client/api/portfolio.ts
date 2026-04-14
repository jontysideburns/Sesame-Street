import { fetchJson } from "./http";

type PortfolioHolding = {
  id: number;
  organisationId: number;
  organisationName: string;
  ownerId: number;
  ownerName: string;
  accountId: number;
  accountName: string;
  benchmark: string | null;
  currentAmount: number;
  nativeCurrentAmount?: number;
  nativeCurrency?: string | null;
  acquisitionDate: string;
  status: string;
  dealId: number;
  dealSlug: string;
  dealName: string;
  borrower: string;
  sector: string;
  dealType: string;
  revenueRisk: string;
  grade: string;
  watchlist: boolean;
  phase: string;
  region: string;
  exposure: number;
  reportedDscr: number | null;
  covenantStatus: string;
  headroomPct: number | null;
  distributionStatus: string | null;
  distributionBlockerCount: number;
  overdueObligations: number;
  deliverablesUpToDate: boolean;
  pendingReviews: number;
  reviewStatus: string;
  performanceScore: number | null;
  performanceSummary: string | null;
  watchlistRecommendation: string | null;
  escalationLevel: string | null;
  forecastedDscr: number | null;
  forecastCaseCount: number;
  forecastSummary: string | null;
  openRequests: number;
  highPriorityRequests: number;
  requestsWithOpposition: number;
  governanceSummary: string;
};

type PortfolioDeal = {
  dealId: number;
  dealSlug: string;
  dealName: string;
  borrower: string;
  sector: string;
  dealType: string;
  revenueRisk: string;
  grade: string;
  watchlist: boolean;
  exposure: number;
  nativeExposure?: number;
  nativeCurrency?: string | null;
  reportedDscr: number | null;
  covenantStatus: string;
  distributionStatus: string | null;
  distributionBlockerCount: number;
  overdueObligations: number;
  deliverablesUpToDate: boolean;
  pendingReviews: number;
  reviewStatus: string;
  performanceScore: number | null;
  performanceSummary: string | null;
  watchlistRecommendation: string | null;
  escalationLevel: string | null;
  forecastedDscr: number | null;
  forecastCaseCount: number;
  forecastSummary: string | null;
  openRequests: number;
  highPriorityRequests: number;
  requestsWithOpposition: number;
  governanceSummary: string;
  organisations: string[];
  owners: string[];
  accounts: string[];
};

export type PortfolioResponse = {
  viewer: {
    displayName: string;
    teamName: string;
    roleNames: string[];
    permissionKeys: string[];
    permissions: {
      canViewPortfolio: boolean;
      canViewDeal: boolean;
      canViewReports: boolean;
      canViewActivity: boolean;
      canGenerateReports: boolean;
      canReviewReports: boolean;
      canApproveReports: boolean;
      canReleaseReports: boolean;
      canDecideRequests: boolean;
      canCaptureSnapshots: boolean;
    };
    entitlementSummaries: string[];
  };
  platformClient: {
    id: number;
    name: string;
    clientType: string;
  };
  asOf: {
    requested: string | null;
    effective: string;
    default: string;
    clockLabel: string;
    isHistorical: boolean;
  };
  reportingCurrency: "GBP" | "USD" | "EUR";
  fxSnapshot: {
    reportingCurrency: string;
    asOf: string;
    baseCurrency: string;
    rates: Record<string, number>;
    crossRates: Record<string, number>;
    source: string | null;
  };
  currentScope: {
    level: string;
    title: string;
    subtitle: string;
    benchmark: string | null;
    breadcrumb: Array<{
      label: string;
      href: string;
      active: boolean;
    }>;
  };
  hierarchy: {
    organisations: Array<{
      id: number;
      name: string;
      type: string;
      dealCount: number;
      watchlistCount: number;
      exposure: number;
      active: boolean;
      href: string;
    }>;
    owners: Array<{
      id: number;
      name: string;
      type: string;
      organisationId: number;
      organisationName: string;
      dealCount: number;
      watchlistCount: number;
      exposure: number;
      active: boolean;
      href: string;
    }>;
    accounts: Array<{
      id: number;
      name: string;
      type: string;
      ownerId: number;
      ownerName: string;
      organisationId: number;
      organisationName: string;
      benchmark: string;
      dealCount: number;
      watchlistCount: number;
      exposure: number;
      active: boolean;
      href: string;
    }>;
  };
  scopeFilters: {
    organisation?: string | null;
    owner?: string | null;
    account?: string | null;
  };
  selectedFilters: {
    organisation?: string | null;
    owner?: string | null;
    account?: string | null;
    asAt: string;
    sector?: string | null;
    region?: string | null;
    dealType?: string | null;
    phase?: string | null;
    grade?: string | null;
    watchlist?: string | null;
    revenueRisk?: string | null;
  };
  availableFilters: {
    sectors: string[];
    regions: string[];
    dealTypes: string[];
    phases: string[];
    grades: string[];
    revenueRisks: string[];
    watchlistStates: string[];
  };
  summary: {
    totalExposure: number;
    dealCount: number;
    organisationCount: number;
    ownerCount: number;
    accountCount: number;
    pendingReviews: number;
    overdueObligations: number;
    openRequests: number;
    watchlistCount: number;
    restrictedDealCount: number;
    blockedDealCount: number;
  };
  holdings: PortfolioHolding[];
  deals: PortfolioDeal[];
  totalAum: number;
  dealCount: number;
  weightedAvgDscr: number;
  weightedAvgHeadroomPct: number;
  overdueObligations: number;
  pendingReviews: number;
  watchlistCount: number;
  healthInputs: {
    fulfilmentRatePct: number;
    highCriticalRiskCount: number;
    deterioratingDealCount: number;
  };
  gradeDistribution: Array<{ grade: string; count: number; exposure: number }>;
  distributionSummary: Array<{ status: string; count: number; exposure: number }>;
  covenantHeatmap: Array<{
    slug: string;
    name: string;
    covenantCode: string;
    covenantName: string;
    status: string;
    headroomPct: number;
  }>;
  recentAlerts: Array<{
    id: string;
    priority: string;
    title: string;
    description: string;
    dealSlug: string;
    createdAt: string;
  }>;
  deterioratingTrends: Array<{
    id: number;
    dealSlug: string;
    dealName: string;
    grade: string;
    watchlist: boolean;
    metricLabel: string;
    severity: string;
    periodsObserved: number;
    summary: string;
  }>;
  watchlistActions: Array<{
    id: number;
    dealSlug: string;
    dealName: string;
    statusTo: string;
    recommendation: string;
    escalationLevel: string;
    ownerName: string;
    nextReviewDate: string;
    rationale: string;
  }>;
  overdueItems: Array<{
    id: string;
    dealSlug: string;
    dealName: string;
    title: string;
    dueDate: string;
    daysOverdue: number;
    graceStatus: string;
  }>;
  topRisks: Array<{
    id: number;
    riskCategory: string;
    severity: string;
    status: string;
    title: string;
    summary: string;
    nextReviewDate: string;
    dealSlug: string;
    dealName: string;
    scopedExposure: number;
  }>;
  borrowerRequests: Array<{
    id: number;
    requestType: string;
    requestStatus: string;
    priority: string;
    title: string;
    summary: string;
    dueDate: string;
    dealSlug: string;
    dealName: string;
    totalVotes: number;
    opposeVotes: number;
  }>;
};

export async function getPortfolio(scope?: {
  organisation?: string;
  owner?: string;
  account?: string;
  asAt?: string;
  sector?: string;
  region?: string;
  dealType?: string;
  phase?: string;
  grade?: string;
  watchlist?: string;
  revenueRisk?: string;
  reportingCurrency?: string;
}) {
  const params = new URLSearchParams();

  if (scope?.organisation) params.set("organisation", scope.organisation);
  if (scope?.owner) params.set("owner", scope.owner);
  if (scope?.account) params.set("account", scope.account);
  if (scope?.asAt) params.set("as_at", scope.asAt);
  if (scope?.sector) params.set("sector", scope.sector);
  if (scope?.region) params.set("region", scope.region);
  if (scope?.dealType) params.set("deal_type", scope.dealType);
  if (scope?.phase) params.set("phase", scope.phase);
  if (scope?.grade) params.set("grade", scope.grade);
  if (scope?.watchlist) params.set("watchlist", scope.watchlist);
  if (scope?.revenueRisk) params.set("revenue_risk", scope.revenueRisk);
  if (scope?.reportingCurrency) params.set("reporting_currency", scope.reportingCurrency);

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<PortfolioResponse>(`/api/portfolio${suffix}`);
}
