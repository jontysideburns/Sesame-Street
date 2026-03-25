import { fetchJson } from "./http";
import { getActiveViewer } from "../lib/server-viewer";

export type DealBorrowerRequestsResponse = {
  viewer: {
    displayName: string;
    teamName: string;
    roleNames: string[];
    permissions: {
      canDecideRequests: boolean;
    };
  };
  dealSlug: string;
  dealName: string;
  dealGrade: string;
  summary: {
    openRequests: number;
    highPriorityRequests: number;
    requestsWithOpposition: number;
  };
  requests: Array<{
    id: number;
    requestType: string;
    requestStatus: string;
    priority: string;
    title: string;
    summary: string;
    requestedAction: string;
    borrowerContact: string;
    ownerName: string;
    submittedAt: string;
    dueDate: string;
    slaDueAt: string;
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
};

export async function getDealBorrowerRequests(slug: string) {
  return fetchJson<DealBorrowerRequestsResponse>(`/api/deals/${slug}/requests`);
}

const baseUrl = process.env.API_URL ?? "http://localhost:4000";

export async function decideBorrowerRequestRequest(
  requestId: number,
  payload: {
    decisionStatus: string;
    decisionSummary: string;
    decisionRationale: string;
    decidedBy: string;
    effectiveFrom: string;
    expiresOn?: string;
  }
) {
  const viewer = await getActiveViewer();
  const params = new URLSearchParams();
  if (viewer) params.set("viewer", viewer);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  const response = await fetch(`${baseUrl}/api/borrower-requests/${requestId}/decide${suffix}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<{ id: number }>;
}
