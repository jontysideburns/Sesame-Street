import { fetchJson } from "./http";

const baseUrl = process.env.API_URL ?? "http://localhost:4000";

export type OnboardingResponse = {
  summary: {
    activeWorkflows: number;
    pendingTasks: number;
    newDealPackets: number;
  };
  workflows: Array<{
    id: number;
    workflowType: string;
    workflowStatus: string;
    organisationId: number | null;
    ownerId: number | null;
    accountId: number | null;
    dealId: number | null;
    holdingId: number | null;
    organisationName: string;
    ownerDisplayName: string;
    accountName: string;
    dealName: string;
    proposedOrganisationName: string;
    proposedOwnerName: string;
    proposedAccountName: string;
    proposedDealName: string;
    proposedHoldingAmount: number | null;
    ownerName: string;
    targetGoLiveDate: string;
    summary: string;
    createdAt: string;
    completedAt: string | null;
    tasks: Array<{
      id: number;
      taskType: string;
      title: string;
      status: string;
      ownerName: string;
      dueDate: string;
      notes: string;
    }>;
    activationHistory: Array<{
      id: number;
      activationStatus: string;
      activatedBy: string;
      summary: string;
      organisationId: number | null;
      ownerId: number | null;
      accountId: number | null;
      dealId: number | null;
      holdingId: number | null;
      activatedAt: string;
    }>;
  }>;
  referenceData: {
    organisations: Array<{ id: number; name: string }>;
    owners: Array<{ id: number; name: string; organisationName: string }>;
    accounts: Array<{ id: number; name: string; ownerName: string }>;
    deals: Array<{ id: number; name: string; slug: string }>;
  };
};

export async function getOnboarding() {
  return fetchJson<OnboardingResponse>("/api/onboarding");
}

export async function createOnboardingWorkflowRequest(payload: {
  workflowType: string;
  workflowStatus: string;
  organisationId?: number;
  ownerId?: number;
  accountId?: number;
  dealId?: number;
  holdingId?: number;
  proposedOrganisationName?: string;
  proposedOwnerName?: string;
  proposedAccountName?: string;
  proposedDealName?: string;
  proposedHoldingAmount?: number;
  ownerName: string;
  targetGoLiveDate: string;
  summary: string;
}) {
  const response = await fetch(`${baseUrl}/api/onboarding`, {
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

export async function activateOnboardingWorkflowRequest(workflowId: number) {
  const response = await fetch(`${baseUrl}/api/onboarding/${workflowId}/activate`, {
    method: "POST",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<{
    id: number;
    organisationId: number;
    ownerId: number;
    accountId: number;
    dealId: number;
    holdingId: number;
  }>;
}
