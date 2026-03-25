import { fetchJson } from "./http";

const baseUrl = process.env.API_URL ?? "http://localhost:4000";

export type MemoPack = {
  id: number;
  packScope: string;
  packKind: string;
  packStatus: string;
  title: string;
  summary: string;
  dealId: number | null;
  dealSlug: string | null;
  dealName: string | null;
  borrowerRequestId: number | null;
  borrowerRequestTitle: string | null;
  financialPeriodId: number | null;
  assessmentId: number | null;
  distributionAssessmentId: number | null;
  snapshotId: number | null;
  organisationId: number | null;
  organisationName: string | null;
  ownerId: number | null;
  ownerName: string | null;
  accountId: number | null;
  accountName: string | null;
  generatedBy: string;
  generatedAt: string;
  sections: Array<{
    id: number;
    sectionKey: string;
    sectionTitle: string;
    displayOrder: number;
    summary: string;
    sectionPayload: Record<string, unknown>;
  }>;
};

export type DealPacksResponse = {
  dealSlug: string;
  dealName: string;
  dealGrade: string;
  packs: MemoPack[];
};

export type PortfolioPacksResponse = {
  scope: {
    level: string;
    title: string;
    subtitle: string;
  };
  packs: MemoPack[];
};

export async function getDealPacks(slug: string) {
  return fetchJson<DealPacksResponse>(`/api/deals/${slug}/packs`);
}

export async function getPortfolioPacks(scope?: {
  organisation?: string;
  owner?: string;
  account?: string;
}) {
  const params = new URLSearchParams();
  if (scope?.organisation) params.set("organisation", scope.organisation);
  if (scope?.owner) params.set("owner", scope.owner);
  if (scope?.account) params.set("account", scope.account);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<PortfolioPacksResponse>(`/api/portfolio/packs${suffix}`);
}

export async function createDealPackRequest(
  slug: string,
  payload: {
    packKind: string;
    generatedBy: string;
    borrowerRequestId?: number;
  }
) {
  const response = await fetch(`${baseUrl}/api/deals/${slug}/packs`, {
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

export async function createPortfolioPackRequest(
  payload: {
    packKind: string;
    generatedBy: string;
    organisationId?: number;
    ownerId?: number;
    accountId?: number;
  },
  scope?: {
    organisation?: string;
    owner?: string;
    account?: string;
  }
) {
  const params = new URLSearchParams();
  if (scope?.organisation) params.set("organisation", scope.organisation);
  if (scope?.owner) params.set("owner", scope.owner);
  if (scope?.account) params.set("account", scope.account);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const response = await fetch(`${baseUrl}/api/portfolio/packs${suffix}`, {
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
