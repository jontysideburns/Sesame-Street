import { fetchJson } from "./http";

export type IntakeDocumentProposal = {
  id: number;
  proposalType: string;
  fieldKey: string | null;
  fieldLabel: string;
  proposedValue: string;
  confidence: number | null;
  citationReference: string | null;
  proposalStatus: string;
  targetEntityType: string;
  targetMetricKey: string | null;
  targetPeriodKey: string | null;
  validationStatus: string;
  validationSummary: string;
  validationMessages: Array<Record<string, unknown>>;
  routingDecision: string;
  commitAction: string;
  committedEntityType: string | null;
  committedEntityId: number | null;
  committedAt: string | null;
  committedBy: string | null;
  impactPreview: Array<{
    label: string;
    beforeValue: string;
    afterValue: string;
    impactSummary: string;
  }>;
  createdBy: string;
  createdAt: string;
};

export type IntakeStageEvent = {
  id: number;
  stageName: string;
  stageStatus: string;
  processorType: string;
  startedAt: string;
  completedAt: string | null;
  confidence: number | null;
  summary: string;
};

export type IntakeAiAuditLog = {
  id: number;
  processingRunId: number | null;
  proposalId: number | null;
  aiStage: string;
  actorLabel: string;
  modelName: string;
  modelVersion: string;
  promptTemplate: string;
  retrievedContext: Array<Record<string, unknown>>;
  toolCalls: Array<Record<string, unknown>>;
  confidence: number | null;
  summary: string;
  createdAt: string;
};

export type IntakeEvidenceCitation = {
  id: number;
  incomingDocumentId: number | null;
  canonicalDocumentId: number | null;
  proposalId: number | null;
  reviewItemId: number | null;
  citationLabel: string;
  citationKind: string;
  pageNumber: number | null;
  tableLabel: string | null;
  cellReference: string | null;
  boundingBox: Record<string, unknown>;
  fieldKey: string | null;
  textSnippet: string;
  createdAt: string;
};

export type IntakeResponse = {
  watcher: {
    directory: string;
    pollSeconds: number;
    lastScanAt: string | null;
    lastError: string | null;
    trackedFiles: number;
    newFilesInLastScan: number;
    directoryFileCount: number;
    directoryFiles: string[];
  };
  summary: {
    trackedDocuments: number;
    committedDocuments: number;
    reviewDocuments: number;
    exceptionDocuments: number;
    triageDocuments: number;
  };
  referenceData: {
    deals: Array<{
      id: number;
      slug: string;
      name: string;
    }>;
    documentTypes: Array<{
      key: string;
      label: string;
      description: string;
    }>;
  };
  stageCounts: Array<{
    stage: string;
    count: number;
  }>;
  documents: Array<{
    id: string;
    dealName: string | null;
    dealSlug: string | null;
    obligationTitle: string | null;
    canonicalDocumentId: number | null;
    intakeSourcePath: string;
    rawStorageStatus: string;
    directoryObservedAt: string;
    fingerprintedAt: string | null;
    sourceChannel: string;
    sender: string;
    subject: string;
    fileName: string;
    fileSizeBytes: number;
    mimeType: string;
    periodLabel: string | null;
    documentType: string | null;
    classificationStatus: string;
    processingStatus: string;
    currentStage: string;
    normalizedStage: string;
    reviewTier: string;
    confidence: number | null;
    receivedAt: string;
    lastUpdatedAt: string;
    notes: string;
    stageTimeline: IntakeStageEvent[];
    proposals: IntakeDocumentProposal[];
    aiAuditLogs: IntakeAiAuditLog[];
    citations: IntakeEvidenceCitation[];
  }>;
  recentProcessingRuns: Array<{
    id: number;
    incomingDocumentId: number;
    stageName: string;
    stageStatus: string;
    processorType: string;
    startedAt: string;
    completedAt: string | null;
    confidence: number | null;
    summary: string;
  }>;
};

export async function getIntake() {
  return fetchJson<IntakeResponse>("/api/intake");
}

export async function updateIntakeProposalRequest(
  proposalId: number,
  payload: {
    proposedValue?: string;
    targetPeriodKey?: string;
    dealSlug?: string;
    updatedBy: string;
  }
) {
  return fetchJson<{ ok: boolean }>(`/api/intake/proposals/${proposalId}/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function approveIntakeDocumentBatchRequest(
  documentId: string,
  payload: { approvedBy: string }
) {
  return fetchJson<{ ok: boolean }>(`/api/intake/documents/${documentId}/approve-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

export async function invokeIntakeExceptionAssistRequest(
  documentId: string,
  payload: { invokedBy: string }
) {
  return fetchJson<{ ok: boolean }>(`/api/intake/documents/${documentId}/invoke-exception-assist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}
