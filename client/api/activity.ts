import { fetchJson } from "./http";

export type ActivityEvent = {
  id: number;
  sourceDomain: string;
  eventFamily: string;
  eventType: string;
  entityType: string;
  entityId: number | null;
  sourceEventId: number | null;
  dealId: number | null;
  dealName: string | null;
  dealSlug: string | null;
  organisationId: number | null;
  organisationName: string | null;
  ownerId: number | null;
  ownerName: string | null;
  accountId: number | null;
  accountName: string | null;
  actorName: string;
  actorType: string;
  auditHow: string;
  aiAuditLogId: number | null;
  title: string;
  summary: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  deepLink: string;
  createdAt: string;
};

export type ActivityFeedResponse = {
  viewer: {
    displayName: string;
    teamName: string;
    roleNames: string[];
    permissions: {
      canViewActivity: boolean;
    };
  };
  selectedSourceDomain: string;
  sourceDomainOptions: string[];
  summary: {
    eventCount: number;
    dealEvents: number;
    platformEvents: number;
    actors: number;
  };
  events: ActivityEvent[];
};

export type DealActivityResponse = {
  viewer: {
    displayName: string;
    teamName: string;
    roleNames: string[];
    permissions: {
      canViewActivity: boolean;
    };
  };
  dealSlug: string;
  dealName: string;
  dealGrade: string;
  watchlist: boolean;
  summary: {
    eventCount: number;
    actors: number;
    domains: number;
  };
  events: ActivityEvent[];
};

export async function getActivity(filters?: { sourceDomain?: string }) {
  const params = new URLSearchParams();
  if (filters?.sourceDomain && filters.sourceDomain !== "All domains") {
    params.set("sourceDomain", filters.sourceDomain);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<ActivityFeedResponse>(`/api/activity${suffix}`);
}

export async function getDealActivity(slug: string) {
  return fetchJson<DealActivityResponse>(`/api/deals/${slug}/activity`);
}
