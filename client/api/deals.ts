import { fetchJson } from "./http";
import type { MemoPack } from "./packs";

export type DealAmendment = {
  id: number;
  borrowerRequestId: number | null;
  borrowerRequestDecisionId: number | null;
  amendmentType: string;
  amendmentStatus: string;
  title: string;
  summary: string;
  sourceDomain: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string;
  createdAt: string;
  ruleVersions: Array<{
    id: number;
    ruleDomain: string;
    ruleType: string;
    targetEntityType: string;
    targetEntityId: number | null;
    targetLabel: string;
    versionLabel: string;
    changeSummary: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    isActive: boolean;
    previousValue: Record<string, unknown>;
    updatedValue: Record<string, unknown>;
  }>;
  changeImpacts: Array<{
    id: number;
    impactType: string;
    targetEntityType: string;
    targetEntityId: number | null;
    targetLabel: string;
    impactSummary: string;
    beforeState: Record<string, unknown>;
    afterState: Record<string, unknown>;
    recomputedAt: string;
  }>;
};

export type DealResponse = {
  viewer: {
    displayName: string;
    teamName: string;
    roleNames: string[];
    permissions: {
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
  };
  slug: string;
  name: string;
  borrower: string;
  sector: string;
  dealType: string;
  region: string;
  currency: string;
  facilityAmount: number;
  exposure: number;
  grade: string;
  baseGrade: string;
  watchlist: boolean;
  status: string;
  revenueRisk: string;
  moodysRating: string | null;
  moodysOutlook: string | null;
  spRating: string | null;
  spOutlook: string | null;
  fitchRating: string | null;
  fitchOutlook: string | null;
  internalCreditScore: string | null;
  summary: string;
  phase: string;
  dealOverview: string;
  latestPeriodLabel: string;
  latestPeriodEnd: string;
  latestReportedAt: string;
  nextTestDate: string;
  metrics: Record<string, number>;
  distributionAssessment: {
    id: number;
    periodKey: string;
    periodLabel: string;
    periodEnd: string;
    assessedAt: string;
    status: string;
    lockupState: string;
    blockerCount: number;
    distributionCapacity: number | null;
    cashTrapAmount: number | null;
    summary: string;
    rationale: string;
    failedConditions: Array<{
      code: string;
      label: string;
      status: string;
      detail: string;
    }>;
    requiredActions: Array<{
      label: string;
      owner: string;
    }>;
  } | null;
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
  riskSnapshot: {
    openCount: number;
    highSeverityCount: number;
    nextReviewDate: string | null;
    entries: Array<{
      id: number;
      riskCategory: string;
      severity: string;
      probability: string;
      impact: string;
      status: string;
      ownerName: string;
      title: string;
      summary: string;
      generatedNarrative: string | null;
      mitigant: string;
      nextReviewDate: string;
      openedAt: string;
      closedAt: string | null;
      trendRecordId: number | null;
      complianceCaseId: number | null;
      ratioReconciliationId: number | null;
      sourceDocument: {
        id: number;
        documentName: string;
        documentType: string;
      } | null;
    }>;
  };
  borrowerRequests: Array<{
    id: number;
    requestType: string;
    requestStatus: string;
    priority: string;
    title: string;
    summary: string;
    requestedAction: string;
    borrowerContact: string;
    submittedAt: string;
    dueDate: string;
    decisionSummary: string;
    relatedCovenantId: number | null;
    relatedDistributionAssessmentId: number | null;
    relatedRiskEntryId: number | null;
    votes: Array<{
      id: number;
      accountId: number;
      accountName: string;
      voteStatus: string;
      voterName: string;
      rationale: string;
      decidedAt: string;
    }>;
    voteSummary: {
      support: number;
      supportWithConditions: number;
      oppose: number;
      abstain: number;
      total: number;
    };
    currentDecision: {
      id: number;
      decisionStatus: string;
      decisionSummary: string;
      decisionRationale: string;
      decidedBy: string;
      effectiveFrom: string;
      expiresOn: string | null;
      relatedGradeOverrideId: number | null;
      activatedDistributionStatus: string | null;
      decisionOutcome: string;
      decidedAt: string;
    } | null;
    decisionHistory: Array<{
      id: number;
      decisionStatus: string;
      decisionSummary: string;
      decisionRationale: string;
      decidedBy: string;
      effectiveFrom: string;
      expiresOn: string | null;
      relatedGradeOverrideId: number | null;
      activatedDistributionStatus: string | null;
      decisionOutcome: string;
      decidedAt: string;
    }>;
  }>;
  amendmentHistory: DealAmendment[];
  memoPacks: MemoPack[];
  forecastSummary: {
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
  riskRegister?: Array<Record<string, unknown>>;
  snapshotHistory: Array<{
    id: number;
    snapshotLabel: string;
    snapshotType: string;
    capturedAt: string;
    capturedBy: string;
    summary: string;
    snapshotData: Record<string, unknown>;
    financialPeriodId: number | null;
  }>;
  covenant: {
    id: number;
    code: string;
    name: string;
    compositionTag: string;
    currentValue: number;
    thresholdLockup: number;
    thresholdTrigger: number;
    headroomPct: number;
    status: string;
    rationale: string;
    numeratorLabel: string;
    numeratorValue: number;
    denominatorLabel: string;
    denominatorValue: number;
    evidencePage: number;
    evidenceSnippet: string;
  };
  history: Array<{ periodLabel: string; dscr: number; expectedDscr: number }>;
  obligations: Array<{
    id: string;
    code: string;
    title: string;
    dueDate: string;
    status: string;
    daysOverdue: number;
    graceDays: number;
    phase: string;
  }>;
  documents: Array<{
    id: string;
    documentType: string;
    documentName: string;
    periodLabel: string;
    status: string;
    receivedAt: string;
    evidencePage: number;
    snippet: string;
  }>;
};

export type CovenantDetailResponse = {
  dealName: string;
  dealSlug: string;
  code: string;
  name: string;
  compositionTag: string;
  currentValue: number;
  thresholdLockup: number;
  thresholdTrigger: number;
  headroomPct: number;
  status: string;
  rationale: string;
  numeratorLabel: string;
  numeratorValue: number;
  denominatorLabel: string;
  denominatorValue: number;
  evidencePage: number;
  evidenceSnippet: string;
  history: Array<{ periodLabel: string; value: number; expectedValue: number }>;
};

export type FinancialPeriodResponse = {
  dealName: string;
  dealSlug: string;
  borrower: string;
  grade: string;
  periodKey: string;
  periodLabel: string;
  periodEnd: string;
  status: string;
  summary: string;
  reportedMetrics: Record<string, number>;
  expectedMetrics: Record<string, number>;
  variances: Array<{
    metricKey: string;
    metricLabel: string;
    reportedValue: number;
    expectedValue: number;
    varianceValue: number;
    variancePct: number;
    direction: string;
    materiality: string;
    commentary: string;
  }>;
  sourceDocument: {
    id: string;
    documentType: string;
    documentName: string;
    periodLabel: string;
    status: string;
    receivedAt: string;
    evidencePage: number;
    snippet: string;
  } | null;
  ratioReconciliations: Array<{
    id: number;
    metricKey: string;
    metricLabel: string;
    borrowerReportedValue: number;
    platformComputedValue: number;
    varianceValue: number;
    variancePct: number;
    tolerancePct: number;
    status: string;
    explanation: string;
    reviewItemId: number | null;
  }>;
  sourceSupersessions: Array<{
    id: number;
    periodLabel: string;
    supersessionReason: string;
    impactSummary: string;
    affectedObjects: string[];
    downstreamRecomputed: boolean;
    effectiveAt: string;
    supersededDocument: {
      id: number;
      documentName: string;
      documentType: string;
    };
    supersedingDocument: {
      id: number;
      documentName: string;
      documentType: string;
    };
  }>;
  scenarioComparison: {
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
  availablePeriods: Array<{
    periodKey: string;
    periodLabel: string;
    periodEnd: string;
    status: string;
    isLatest: boolean;
  }>;
  covenant: {
    id: number;
    code: string;
    name: string;
    currentValue: number;
    thresholdLockup: number;
    headroomPct: number;
    status: string;
  };
};

export function reviewFieldToMetricKey(fieldName: string) {
  if (fieldName === "senior_dscr") return "seniorDscr";
  return fieldName;
}

export async function getDeal(slug: string) {
  return fetchJson<DealResponse>(`/api/deals/${slug}`);
}

export async function getCovenantDetail(slug: string, covenantId: string) {
  return fetchJson<CovenantDetailResponse>(
    `/api/deals/${slug}/covenants/${covenantId}`
  );
}

export async function getDealFinancialPeriod(slug: string, periodKey: string) {
  return fetchJson<FinancialPeriodResponse>(`/api/deals/${slug}/periods/${periodKey}`);
}

export async function getDeals() {
  return fetchJson<
    Array<{
      slug: string;
      name: string;
      summary: string;
      grade: string;
      exposure: number;
      watchlist: boolean;
    }>
  >("/api/deals");
}
