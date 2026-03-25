"use server";

import { revalidatePath } from "next/cache";
import { getActiveViewer } from "../../lib/server-viewer";
import {
  approveReportExportRequest,
  createReportRequest,
  releaseReportExportRequest,
  reviewReportExportRequest,
  runDueReportSchedulesRequest
} from "../../api/reports";

function buildScope(scope: {
  organisation?: string;
  owner?: string;
  account?: string;
}) {
  const params = new URLSearchParams();
  if (scope.organisation) params.set("organisation", scope.organisation);
  if (scope.owner) params.set("owner", scope.owner);
  if (scope.account) params.set("account", scope.account);
  return params.size > 0 ? `?${params.toString()}` : "";
}

function revalidateReports(scope: { organisation?: string; owner?: string; account?: string }) {
  const suffix = buildScope(scope);
  revalidatePath("/reports");
  revalidatePath(`/reports${suffix}`);
  revalidatePath("/activity");
  revalidatePath("/portfolio");
}

function revalidateGlobalReports() {
  revalidatePath("/reports");
  revalidatePath("/activity");
  revalidatePath("/portfolio");
}

export async function generatePortfolioMonitoringReport(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const scope = {
    organisation:
      typeof formData.get("organisation") === "string" && String(formData.get("organisation"))
        ? String(formData.get("organisation"))
        : undefined,
    owner:
      typeof formData.get("owner") === "string" && String(formData.get("owner"))
        ? String(formData.get("owner"))
        : undefined,
    account:
      typeof formData.get("account") === "string" && String(formData.get("account"))
        ? String(formData.get("account"))
        : undefined
  };

  await createReportRequest(
    {
      reportKind: "portfolio_monitoring",
      generatedBy: String(formData.get("generatedBy") || activeViewer || "Reporting Workspace"),
      organisationId:
        typeof formData.get("organisationId") === "string" && String(formData.get("organisationId"))
          ? Number(formData.get("organisationId"))
          : undefined,
      ownerId:
        typeof formData.get("ownerId") === "string" && String(formData.get("ownerId"))
          ? Number(formData.get("ownerId"))
          : undefined,
      accountId:
        typeof formData.get("accountId") === "string" && String(formData.get("accountId"))
          ? Number(formData.get("accountId"))
          : undefined
    },
    scope
  );

  revalidateReports(scope);
}

export async function generateActivityAuditReport(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const scope = {
    organisation:
      typeof formData.get("organisation") === "string" && String(formData.get("organisation"))
        ? String(formData.get("organisation"))
        : undefined,
    owner:
      typeof formData.get("owner") === "string" && String(formData.get("owner"))
        ? String(formData.get("owner"))
        : undefined,
    account:
      typeof formData.get("account") === "string" && String(formData.get("account"))
        ? String(formData.get("account"))
        : undefined
  };

  await createReportRequest(
    {
      reportKind: "activity_audit",
      generatedBy: String(formData.get("generatedBy") || activeViewer || "Reporting Workspace"),
      sourceDomain:
        typeof formData.get("sourceDomain") === "string" && String(formData.get("sourceDomain"))
          ? String(formData.get("sourceDomain"))
          : undefined,
      organisationId:
        typeof formData.get("organisationId") === "string" && String(formData.get("organisationId"))
          ? Number(formData.get("organisationId"))
          : undefined,
      ownerId:
        typeof formData.get("ownerId") === "string" && String(formData.get("ownerId"))
          ? Number(formData.get("ownerId"))
          : undefined,
      accountId:
        typeof formData.get("accountId") === "string" && String(formData.get("accountId"))
          ? Number(formData.get("accountId"))
          : undefined
    },
    scope
  );

  revalidateReports(scope);
}

export async function runDueReportSchedules(formData: FormData) {
  const activeViewer = await getActiveViewer();
  await runDueReportSchedulesRequest({
    triggeredBy: String(formData.get("triggeredBy") || activeViewer || "Reporting Scheduler")
  });
  revalidateGlobalReports();
}

export async function reviewReportExport(formData: FormData) {
  const activeViewer = await getActiveViewer();
  await reviewReportExportRequest(Number(formData.get("exportId")), {
    actorName: String(formData.get("actorName") || activeViewer || "Portfolio Reporting Review"),
    note:
      typeof formData.get("note") === "string" && String(formData.get("note")).length > 0
        ? String(formData.get("note"))
        : undefined
  });
  revalidateGlobalReports();
}

export async function approveReportExport(formData: FormData) {
  const activeViewer = await getActiveViewer();
  await approveReportExportRequest(Number(formData.get("exportId")), {
    actorName: String(formData.get("actorName") || activeViewer || "Head of Portfolio Reporting"),
    note:
      typeof formData.get("note") === "string" && String(formData.get("note")).length > 0
        ? String(formData.get("note"))
        : undefined
  });
  revalidateGlobalReports();
}

export async function releaseReportExport(formData: FormData) {
  const activeViewer = await getActiveViewer();
  await releaseReportExportRequest(Number(formData.get("exportId")), {
    actorName: String(formData.get("actorName") || activeViewer || "Distribution Ops"),
    note:
      typeof formData.get("note") === "string" && String(formData.get("note")).length > 0
        ? String(formData.get("note"))
        : undefined
  });
  revalidateGlobalReports();
}
