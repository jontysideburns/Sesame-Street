import { fetchJson } from "./http";

export type DealAssessmentResponse = {
  viewer: {
    displayName: string;
    teamName: string;
    roleNames: string[];
    permissions: {
      canViewDeal: boolean;
    };
  };
  dealName: string;
  dealSlug: string;
  borrower: string;
  dealGrade: string;
  effectiveGrade: string;
  dealStatus: string;
  watchlist: boolean;
  revenueRisk: string;
  assessment: {
    assessmentDate: string;
    periodKey: string;
    periodLabel: string;
    periodEnd: string;
    grade: string;
    overallScore: number;
    watchlistStatus: string;
    watchlistRecommendation: string;
    escalationLevel: string;
    summary: string;
    components: Array<{
      key: string;
      label: string;
      score: number;
      weight: number;
      weightedPoints: number;
      status: string;
      summary: string;
    }>;
  };
  activeGradeOverride: {
    id: number;
    previousGrade: string;
    overrideGrade: string;
    status: string;
    rationale: string;
    ownerName: string;
    expiresOn: string;
    decidedAt: string;
    impactSummary: string;
  } | null;
  gradeOverrideHistory: Array<{
    id: number;
    previousGrade: string;
    overrideGrade: string;
    status: string;
    rationale: string;
    ownerName: string;
    expiresOn: string;
    decidedAt: string;
    impactSummary: string;
  }>;
  activeTrends: Array<{
    id: number;
    metricKey: string;
    metricLabel: string;
    trendType: string;
    direction: string;
    periodsObserved: number;
    severity: string;
    totalChangePct: number;
    status: string;
    summary: string;
  }>;
  forecastContext: {
    activeMonitoringCaseName: string;
    activeMonitoringVersionLabel: string;
    scenarioCount: number;
    latestRefreshAt: string | null;
    scenarios: Array<{
      caseName: string;
      caseType: string;
      versionLabel: string;
      isMonitoring: boolean;
      scenarioSummary: string;
      metrics: Record<string, number>;
      deltaToMonitoring: Record<string, number>;
    }>;
  } | null;
  watchlistHistory: Array<{
    id: number;
    statusFrom: string;
    statusTo: string;
    recommendation: string;
    escalationLevel: string;
    ownerName: string;
    rationale: string;
    decidedAt: string;
    nextReviewDate: string;
  }>;
};

export async function getDealAssessment(slug: string) {
  return fetchJson<DealAssessmentResponse>(`/api/deals/${slug}/assessment`);
}
