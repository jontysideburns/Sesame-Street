import { fetchJson } from "./http";

export type ReviewItemResponse = {
  id: number;
  dealName: string;
  dealSlug: string;
  incomingDocumentId: number | null;
  proposalType: string;
  fieldName: string;
  proposedValue: string;
  confidence: number;
  priorValue: string;
  status: string;
  reason: string;
  ownerName: string;
  dueAt: string;
  slaDueAt: string;
  documentName: string;
  pageNumber: number;
  snippet: string;
  mimeType: string | null;
};

export async function getReviewQueue() {
  return fetchJson<ReviewItemResponse[]>("/api/review-queue");
}

export async function approveReviewItemRequest(id: number) {
  await fetchJson<{ ok: boolean }>(`/api/review-queue/${id}/approve`, {
    method: "POST"
  });
}
