import { fetchJson } from "./http";

const baseUrl = process.env.API_URL ?? "http://localhost:4000";

export type DemoClock = {
  id: number;
  currentDemoDate: string;
  clockLabel: string;
  updatedBy: string;
  updatedAt: string;
};

export type MonitoringCycleEvent = {
  id: number;
  eventKey: string;
  eventLabel: string;
  stageKey: string;
  status: string;
  scheduledFor: string;
  completedAt: string | null;
  ownerName: string;
  dependencyKey: string;
  sourceEntityType: string | null;
  sourceEntityId: number | null;
  detailText: string;
};

export type MonitoringCycle = {
  id: number;
  dealId: number;
  dealSlug: string;
  dealName: string;
  dealGrade: string;
  watchlist: boolean;
  cycleKey: string;
  cycleLabel: string;
  cycleType: string;
  cycleStatus: string;
  ownerName: string;
  startDate: string;
  packageDueDate: string;
  internalReviewDueDate: string;
  committeeDate: string;
  reportReleaseDate: string;
  summary: string;
  completedAt: string | null;
  readiness: {
    hasPackage: boolean;
    pendingReviews: number;
    openRequests: number;
    openHighPriorityRequests: number;
    openHighRisks: number;
    openCases: number;
    overdueTasks: number;
    snapshotsCaptured: number;
    releasedReports: number;
    reviewReady: boolean;
    committeeReady: boolean;
    releaseReady: boolean;
  };
  events: MonitoringCycleEvent[];
};

export type CycleAlert = {
  id: string;
  dealSlug: string;
  dealName: string;
  priority: string;
  title: string;
  summary: string;
  status: string;
  scheduledFor: string;
};

export type PortfolioCalendarResponse = {
  viewer: {
    displayName: string;
    teamName: string;
  };
  demoClock: DemoClock;
  scope: {
    level: string;
    title: string;
    subtitle: string;
  };
  summary: {
    activeCycles: number;
    blockedCycles: number;
    readyForRelease: number;
    milestonesThisWeek: number;
  };
  cycleAlerts: CycleAlert[];
  upcomingEvents: Array<
    {
      cycleId: number;
      dealSlug: string;
      dealName: string;
    } & MonitoringCycleEvent
  >;
  cycles: MonitoringCycle[];
};

export type DealCalendarResponse = {
  viewer: {
    displayName: string;
    teamName: string;
  };
  demoClock: DemoClock;
  dealSlug: string;
  dealName: string;
  dealGrade: string;
  watchlist: boolean;
  summary: {
    cycleCount: number;
    blockedCycles: number;
    readyForRelease: number;
    alertCount: number;
  };
  cycleAlerts: CycleAlert[];
  cycles: MonitoringCycle[];
};

export async function getPortfolioCalendar(scope?: {
  organisation?: string;
  owner?: string;
  account?: string;
}) {
  const params = new URLSearchParams();

  if (scope?.organisation) params.set("organisation", scope.organisation);
  if (scope?.owner) params.set("owner", scope.owner);
  if (scope?.account) params.set("account", scope.account);

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<PortfolioCalendarResponse>(`/api/calendar${suffix}`);
}

export async function getDealCalendar(slug: string) {
  return fetchJson<DealCalendarResponse>(`/api/deals/${slug}/calendar`);
}

export async function updateDemoClockRequest(payload: {
  currentDemoDate: string;
  updatedBy: string;
  clockLabel?: string;
}) {
  const response = await fetch(`${baseUrl}/api/demo-clock`, {
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

  return response.json() as Promise<DemoClock>;
}
