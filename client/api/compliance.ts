import { fetchJson } from "./http";

export type ComplianceResponse = {
  summary: {
    activeObligations: number;
    overdueObligations: number;
    withinGrace: number;
    approaching: number;
    inboxAttention: number;
    pendingReview: number;
    openCases: number;
    activeAlerts: number;
  };
  stageCounts: Array<{
    stage: string;
    count: number;
  }>;
  obligations: Array<{
    id: string;
    dealName: string;
    dealSlug: string;
    code: string;
    title: string;
    dueDate: string;
    status: string;
    daysOverdue: number;
    graceDays: number;
    phase: string;
  }>;
  incomingDocuments: Array<{
    id: string;
    dealName: string | null;
    dealSlug: string | null;
    obligationTitle: string | null;
    sourceChannel: string;
    sender: string;
    subject: string;
    fileName: string;
    periodLabel: string | null;
    documentType: string | null;
    classificationStatus: string;
    processingStatus: string;
    currentStage: string;
    reviewTier: string;
    confidence: number | null;
    receivedAt: string;
    lastUpdatedAt: string;
    notes: string;
  }>;
  processingRuns: Array<{
    id: number;
    fileName: string;
    dealName: string | null;
    stageName: string;
    stageStatus: string;
    processorType: string;
    startedAt: string;
    completedAt: string | null;
    confidence: number | null;
    summary: string;
  }>;
  fulfilments: Array<{
    id: number;
    dealName: string;
    dealSlug: string;
    obligationTitle: string;
    dueDate: string;
    receivedAt: string | null;
    status: string;
    daysLate: number;
    matchedBy: string;
    notes: string;
    fileName: string | null;
  }>;
  cases: Array<{
    id: number;
    dealName: string | null;
    dealSlug: string | null;
    caseType: string;
    severity: string;
    status: string;
    ownerName: string;
    title: string;
    summary: string;
    openedAt: string;
    slaDueAt: string;
    closedAt: string | null;
    resolutionNote: string;
    fileName: string | null;
  }>;
  alerts: Array<{
    id: number;
    dealName: string | null;
    dealSlug: string | null;
    priority: string;
    status: string;
    channel: string;
    title: string;
    description: string;
    triggeredAt: string;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
  }>;
};

export async function getCompliance() {
  return fetchJson<ComplianceResponse>("/api/compliance");
}

export async function triageIncomingDocumentRequest(
  id: string,
  payload: { action: string; dealSlug?: string }
) {
  await fetchJson<{ ok: boolean }>(`/api/compliance/incoming-documents/${id}/triage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}
