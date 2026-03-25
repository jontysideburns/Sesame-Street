import { fetchJson } from "./http";

export type WorkTask = {
  id: number;
  sourceDomain: string;
  sourceEntityType: string;
  sourceEntityId: number;
  dealId: number | null;
  dealName: string | null;
  dealSlug: string | null;
  organisationId: number | null;
  organisationName: string | null;
  ownerId: number | null;
  ownerName: string | null;
  accountId: number | null;
  accountName: string | null;
  title: string;
  summary: string;
  taskStatus: string;
  priority: string;
  assigneeName: string;
  assigneeTeam: string;
  queueName: string;
  dueAt: string;
  slaDueAt: string;
  completedAt: string | null;
  escalationLevel: string;
  escalationStatus: string;
  blockedReason: string;
  deepLink: string;
  contextPayload: Record<string, unknown>;
};

export type WorkQueueResponse = {
  selectedAssignee: string;
  selectedTeam: string;
  summary: {
    openTasks: number;
    myOpenTasks: number;
    teamOpenTasks: number;
    overdueTasks: number;
    escalatedTasks: number;
    blockedTasks: number;
    dueToday: number;
  };
  assigneeOptions: string[];
  teamOptions: string[];
  myTasks: WorkTask[];
  teamTasks: WorkTask[];
  attentionTasks: WorkTask[];
  recentlyResolved: WorkTask[];
};

export async function getWorkQueue(filters?: { assignee?: string; team?: string }) {
  const params = new URLSearchParams();

  if (filters?.assignee) params.set("assignee", filters.assignee);
  if (filters?.team) params.set("team", filters.team);

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<WorkQueueResponse>(`/api/work-queue${suffix}`);
}
