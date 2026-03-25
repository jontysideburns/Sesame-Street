import { fetchJson } from "./http";

export type DealRiskResponse = {
  dealSlug: string;
  dealName: string;
  dealGrade: string;
  summary: {
    totalRisks: number;
    openRisks: number;
    highSeverityRisks: number;
    nextReviewDate: string | null;
  };
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

export async function getDealRisk(slug: string) {
  return fetchJson<DealRiskResponse>(`/api/deals/${slug}/risk`);
}
