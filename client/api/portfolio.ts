import { fetchJson } from "./http";

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
  holdings: Array<{
    id: number;
    organisationId: number;
    organisationName: string;
    ownerId: number;
    ownerName: string;
    accountId: number;
    accountName: string;
    benchmark: string;
    currentAmount: number;
    acquisitionDate: string;
    status: string;
    dealSlug: string;
    dealName: string;
    grade: string;
    watchlist: boolean;
    phase: string;
    region: string;
    covenantStatus: string;
    headroomPct: number;
    distributionStatus: string | null;
    distributionBlockerCount: number;
  }>;
  totalAum: number;
  dealCount: number;
  weightedAvgDscr: number;
  weightedAvgHeadroomPct: number;
  overdueObligations: number;
  pendingReviews: number;
  watchlistCount: number;
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
}) {
  const params = new URLSearchParams();

  if (scope?.organisation) params.set("organisation", scope.organisation);
  if (scope?.owner) params.set("owner", scope.owner);
  if (scope?.account) params.set("account", scope.account);

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<PortfolioResponse>(`/api/portfolio${suffix}`);
}
