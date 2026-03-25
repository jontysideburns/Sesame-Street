export type PortfolioDealDrawerResponse = {
  slug: string;
  name: string;
  borrower: string;
  dealType: string;
  region: string;
  phase: string;
  grade: string;
  watchlist: boolean;
  revenueRisk: string;
  status: string;
  summary: string;
  exposure: number;
  facilityAmount: number;
  latestPeriodLabel: string;
  latestReportedAt: string;
  nextTestDate: string;
  covenant: {
    name: string;
    currentValue: number;
    headroomPct: number;
    status: string;
  };
  distributionAssessment: {
    status: string;
    periodLabel: string;
    blockerCount: number;
    summary: string;
  } | null;
  assessment: {
    overallScore: number;
    escalationLevel: string;
    watchlistRecommendation: string;
    summary: string;
  };
  latestPeriodSummary: string;
  riskSnapshot: {
    openCount: number;
    highSeverityCount: number;
    nextReviewDate: string | null;
    entries: Array<{
      id: number;
      title: string;
      severity: string;
      status: string;
      ownerName: string;
      nextReviewDate: string;
      summary: string;
    }>;
  };
  borrowerRequests: Array<{
    id: number;
    title: string;
    priority: string;
    requestStatus: string;
    dueDate: string;
    summary: string;
    totalVotes: number;
    opposeVotes: number;
  }>;
  overdueObligations: Array<{
    id: string;
    title: string;
    dueDate: string;
    daysOverdue: number;
    status: string;
  }>;
  activeTrends: Array<{
    id: number;
    metricLabel: string;
    severity: string;
    periodsObserved: number;
    summary: string;
  }>;
};
