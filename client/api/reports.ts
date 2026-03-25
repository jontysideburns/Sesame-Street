import { fetchJson } from "./http";
import { getActiveViewer } from "../lib/server-viewer";

const baseUrl = process.env.API_URL ?? "http://localhost:4000";

export type ReportExport = {
  id: number;
  exportScope: string;
  reportKind: string;
  exportStatus: string;
  reviewStatus: string;
  releaseStatus: string;
  exportFormat: string;
  title: string;
  summary: string;
  dealId: number | null;
  dealSlug: string | null;
  dealName: string | null;
  financialPeriodId: number | null;
  assessmentId: number | null;
  snapshotId: number | null;
  organisationId: number | null;
  organisationName: string | null;
  ownerId: number | null;
  ownerName: string | null;
  accountId: number | null;
  accountName: string | null;
  activitySourceDomain: string | null;
  reportScheduleId: number | null;
  reviewedBy: string | null;
  approvedBy: string | null;
  releasedBy: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  releasedAt: string | null;
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

export type ReportSchedule = {
  id: number;
  scheduleScope: string;
  reportKind: string;
  cadence: string;
  scheduleStatus: string;
  scheduleLabel: string;
  ownerName: string;
  reviewerName: string;
  approverName: string;
  releaseChannel: string;
  distributionMode: string;
  dealId: number | null;
  dealName: string | null;
  dealSlug: string | null;
  organisationId: number | null;
  organisationName: string | null;
  ownerId: number | null;
  ownerDisplayName: string | null;
  accountId: number | null;
  accountName: string | null;
  activitySourceDomain: string | null;
  nextRunAt: string;
  lastRunAt: string | null;
  staleAfterDays: number;
  notes: string;
  recipients: Array<{
    id: number;
    recipientName: string;
    recipientType: string;
    deliveryChannel: string;
    destination: string;
    active: boolean;
  }>;
};

export type ReportGenerationRun = {
  id: number;
  reportScheduleId: number | null;
  reportExportId: number | null;
  runStatus: string;
  triggerMode: string;
  triggerSummary: string;
  startedAt: string;
  completedAt: string | null;
  reviewStatus: string;
  releaseStatus: string;
};

export type ReportDeliveryLog = {
  id: number;
  reportExportId: number;
  reportScheduleId: number | null;
  recipientName: string;
  recipientType: string;
  deliveryChannel: string;
  destination: string;
  deliveryStatus: string;
  deliveredAt: string | null;
  openedAt: string | null;
  acknowledgedAt: string | null;
  failureReason: string | null;
  title: string;
};

export type ReportDeliveryException = {
  id: number;
  reportScheduleId: number | null;
  reportExportId: number | null;
  exceptionType: string;
  severity: string;
  status: string;
  title: string;
  summary: string;
  ownerName: string;
  raisedAt: string;
  resolvedAt: string | null;
};

export type ReportsResponse = {
  viewer: {
    displayName: string;
    teamName: string;
    roleNames: string[];
    permissions: {
      canViewReports: boolean;
      canGenerateReports: boolean;
      canReviewReports: boolean;
      canApproveReports: boolean;
      canReleaseReports: boolean;
    };
  };
  scope: {
    level: string;
    title: string;
    subtitle: string;
  };
  summary: {
    exportCount: number;
    dueSchedules: number;
    pendingApproval: number;
    openExceptions: number;
  };
  selectedSourceDomain: string;
  sourceDomainOptions: string[];
  exports: ReportExport[];
  schedules: ReportSchedule[];
  generationRuns: ReportGenerationRun[];
  deliveryLogs: ReportDeliveryLog[];
  deliveryExceptions: ReportDeliveryException[];
};

export type DealReportsResponse = {
  viewer: {
    displayName: string;
    teamName: string;
    roleNames: string[];
    permissions: {
      canViewReports: boolean;
      canGenerateReports: boolean;
      canReviewReports: boolean;
      canApproveReports: boolean;
      canReleaseReports: boolean;
    };
  };
  dealSlug: string;
  dealName: string;
  dealGrade: string;
  exports: ReportExport[];
  schedules: ReportSchedule[];
  generationRuns: ReportGenerationRun[];
  deliveryLogs: ReportDeliveryLog[];
  deliveryExceptions: ReportDeliveryException[];
};

export async function getReports(filters?: {
  organisation?: string;
  owner?: string;
  account?: string;
  sourceDomain?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.organisation) params.set("organisation", filters.organisation);
  if (filters?.owner) params.set("owner", filters.owner);
  if (filters?.account) params.set("account", filters.account);
  if (filters?.sourceDomain && filters.sourceDomain !== "All domains") {
    params.set("sourceDomain", filters.sourceDomain);
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<ReportsResponse>(`/api/reports${suffix}`);
}

export async function getDealReports(slug: string) {
  return fetchJson<DealReportsResponse>(`/api/deals/${slug}/reports`);
}

export async function createReportRequest(
  payload: {
    reportKind: string;
    generatedBy: string;
    sourceDomain?: string;
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
  const viewer = await getActiveViewer();
  const params = new URLSearchParams();
  if (scope?.organisation) params.set("organisation", scope.organisation);
  if (scope?.owner) params.set("owner", scope.owner);
  if (scope?.account) params.set("account", scope.account);
  if (viewer) params.set("viewer", viewer);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  const response = await fetch(`${baseUrl}/api/reports${suffix}`, {
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

export async function createDealReportRequest(
  slug: string,
  payload: {
    reportKind: string;
    generatedBy: string;
  }
) {
  const viewer = await getActiveViewer();
  const params = new URLSearchParams();
  if (viewer) params.set("viewer", viewer);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  const response = await fetch(`${baseUrl}/api/deals/${slug}/reports${suffix}`, {
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

export async function runDueReportSchedulesRequest(payload: { triggeredBy: string }) {
  const viewer = await getActiveViewer();
  const params = new URLSearchParams();
  if (viewer) params.set("viewer", viewer);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  const response = await fetch(`${baseUrl}/api/report-schedules/run-due${suffix}`, {
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

  return response.json() as Promise<{ generatedIds: number[] }>;
}

async function postWorkflow(path: string, payload: { actorName: string; note?: string }) {
  const viewer = await getActiveViewer();
  const url = new URL(`${baseUrl}${path}`);
  if (viewer) {
    url.searchParams.set("viewer", viewer);
  }

  const response = await fetch(url, {
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

  return response.json() as Promise<{ ok: boolean }>;
}

export function reviewReportExportRequest(exportId: number, payload: { actorName: string; note?: string }) {
  return postWorkflow(`/api/report-exports/${exportId}/review`, payload);
}

export function approveReportExportRequest(exportId: number, payload: { actorName: string; note?: string }) {
  return postWorkflow(`/api/report-exports/${exportId}/approve`, payload);
}

export function releaseReportExportRequest(exportId: number, payload: { actorName: string; note?: string }) {
  return postWorkflow(`/api/report-exports/${exportId}/release`, payload);
}
