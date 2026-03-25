import { fetchJson } from "./http";

export type DealDistributionResponse = {
  dealSlug: string;
  dealName: string;
  borrower: string;
  dealGrade: string;
  dealStatus: string;
  watchlist: boolean;
  dealSummary: string;
  distribution: {
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
  };
  covenant: {
    id: number;
    code: string;
    name: string;
    currentValue: number;
    thresholdLockup: number;
    thresholdTrigger: number;
    headroomPct: number;
    status: string;
  };
  openObligations: Array<{
    title: string;
    dueDate: string;
    status: string;
    daysOverdue: number;
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
};

export async function getDealDistribution(slug: string) {
  return fetchJson<DealDistributionResponse>(`/api/deals/${slug}/distribution`);
}
