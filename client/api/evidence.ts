import { fetchJson } from "./http";

export type EvidenceResponse = {
  summary: {
    documentsReceived: number;
    pendingReviews: number;
    approvedDocuments: number;
    supersessions: number;
  };
  documents: Array<{
    id: string;
    dealName: string;
    dealSlug: string;
    documentType: string;
    documentName: string;
    periodLabel: string;
    status: string;
    receivedAt: string;
    evidencePage: number;
    snippet: string;
  }>;
  reviewItems: Array<{
    id: number;
    dealName: string;
    dealSlug: string;
    proposalType: string;
    fieldName: string;
    proposedValue: string;
    confidence: number;
    priorValue: string;
    status: string;
    reason: string;
    documentName: string;
    pageNumber: number;
    snippet: string;
  }>;
  supersessions: Array<{
    id: number;
    dealName: string;
    dealSlug: string;
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
};

export async function getEvidence() {
  return fetchJson<EvidenceResponse>("/api/evidence");
}
