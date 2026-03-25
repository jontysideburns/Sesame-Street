"use server";

import { revalidatePath } from "next/cache";
import { getActiveViewer } from "../../lib/server-viewer";
import { activateForecastVersionRequest } from "../../api/forecasts";
import { createDealPackRequest } from "../../api/packs";
import { createDealReportRequest } from "../../api/reports";
import {
  approveReportExportRequest,
  releaseReportExportRequest,
  reviewReportExportRequest
} from "../../api/reports";
import { decideBorrowerRequestRequest } from "../../api/requests";
import { captureDealSnapshotRequest, recomputeDealSnapshotRequest } from "../../api/snapshots";

export async function decideBorrowerRequest(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const requestId = Number(formData.get("requestId"));
  const dealSlug = String(formData.get("dealSlug"));
  const decisionStatus = String(formData.get("decisionStatus"));

  const defaultSummary =
    decisionStatus === "approved"
      ? "Approved."
      : decisionStatus === "approved_with_conditions"
        ? "Approved with conditions."
        : "Declined.";

  await decideBorrowerRequestRequest(requestId, {
    decisionStatus,
    decisionSummary: String(formData.get("decisionSummary") || defaultSummary),
    decisionRationale: String(
      formData.get("decisionRationale") || "Decision recorded from the deal workspace."
    ),
    decidedBy: String(formData.get("decidedBy") || activeViewer || "PM - Infrastructure Committee"),
    effectiveFrom: String(formData.get("effectiveFrom") || new Date().toISOString().slice(0, 10)),
    expiresOn:
      typeof formData.get("expiresOn") === "string" && String(formData.get("expiresOn")).length > 0
        ? String(formData.get("expiresOn"))
        : undefined
  });

  revalidatePath(`/deals/${dealSlug}`);
  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath(`/deals/${dealSlug}/amendments`);
  revalidatePath(`/deals/${dealSlug}/requests`);
  revalidatePath(`/deals/${dealSlug}/distribution`);
  revalidatePath(`/deals/${dealSlug}/assessment`);
  revalidatePath(`/deals/${dealSlug}/snapshots`);
  revalidatePath("/portfolio");
  revalidatePath("/work");
  revalidatePath("/notifications");
  revalidatePath("/activity");
}

export async function captureDealSnapshot(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const dealSlug = String(formData.get("dealSlug"));
  await captureDealSnapshotRequest(dealSlug, {
    snapshotLabel: String(formData.get("snapshotLabel") || "Manual TopSheet snapshot"),
    snapshotType: String(formData.get("snapshotType") || "manual"),
    capturedBy: String(formData.get("capturedBy") || activeViewer || "HAM workspace"),
    summary:
      typeof formData.get("summary") === "string" && String(formData.get("summary")).length > 0
        ? String(formData.get("summary"))
        : undefined
  });

  revalidatePath(`/deals/${dealSlug}`);
  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath(`/deals/${dealSlug}/snapshots`);
  revalidatePath("/activity");
}

export async function recomputeDealSnapshot(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const dealSlug = String(formData.get("dealSlug"));
  const snapshotId = Number(formData.get("snapshotId"));

  await recomputeDealSnapshotRequest(dealSlug, snapshotId, {
    recomputedBy: String(formData.get("recomputedBy") || activeViewer || "Audit workspace")
  });

  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath(`/deals/${dealSlug}/snapshots`);
  revalidatePath("/activity");
}

export async function activateForecastVersion(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const dealSlug = String(formData.get("dealSlug"));
  const versionId = Number(formData.get("versionId"));

  await activateForecastVersionRequest(versionId, {
    activatedBy: String(formData.get("activatedBy") || activeViewer || "PM - Forecast Workspace")
  });

  revalidatePath(`/deals/${dealSlug}`);
  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath(`/deals/${dealSlug}/forecasts`);
  revalidatePath(`/deals/${dealSlug}/assessment`);
  revalidatePath(`/deals/${dealSlug}/distribution`);
  revalidatePath(`/deals/${dealSlug}/risk`);
  revalidatePath(`/deals/${dealSlug}/periods/latest`);
  revalidatePath("/portfolio");
  revalidatePath("/work");
  revalidatePath("/notifications");
  revalidatePath("/activity");
}

export async function generateDealCommitteePack(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const dealSlug = String(formData.get("dealSlug"));

  await createDealPackRequest(dealSlug, {
    packKind: "deal_committee",
    generatedBy: String(formData.get("generatedBy") || activeViewer || "Credit Committee Workspace")
  });

  revalidatePath(`/deals/${dealSlug}`);
  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath(`/deals/${dealSlug}/packs`);
  revalidatePath("/activity");
}

export async function generateBorrowerRequestPack(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const dealSlug = String(formData.get("dealSlug"));
  const borrowerRequestId = Number(formData.get("borrowerRequestId"));

  await createDealPackRequest(dealSlug, {
    packKind: "borrower_request_decision",
    generatedBy: String(formData.get("generatedBy") || activeViewer || "Borrower Request Workspace"),
    borrowerRequestId
  });

  revalidatePath(`/deals/${dealSlug}`);
  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath(`/deals/${dealSlug}/packs`);
  revalidatePath(`/deals/${dealSlug}/requests`);
  revalidatePath("/activity");
}

export async function generateDealMonitoringReport(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const dealSlug = String(formData.get("dealSlug"));

  await createDealReportRequest(dealSlug, {
    reportKind: "deal_monitoring",
    generatedBy: String(formData.get("generatedBy") || activeViewer || "Reporting Workspace")
  });

  revalidatePath(`/deals/${dealSlug}`);
  revalidatePath(`/deals/${dealSlug}/reports`);
  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath("/reports");
  revalidatePath("/activity");
}

export async function generateDealActivityAuditReport(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const dealSlug = String(formData.get("dealSlug"));

  await createDealReportRequest(dealSlug, {
    reportKind: "activity_audit",
    generatedBy: String(formData.get("generatedBy") || activeViewer || "Reporting Workspace")
  });

  revalidatePath(`/deals/${dealSlug}/reports`);
  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath("/reports");
  revalidatePath("/activity");
}

export async function reviewDealReportExport(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const dealSlug = String(formData.get("dealSlug"));
  await reviewReportExportRequest(Number(formData.get("exportId")), {
    actorName: String(formData.get("actorName") || activeViewer || "Portfolio Reporting Review")
  });
  revalidatePath(`/deals/${dealSlug}/reports`);
  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath("/reports");
  revalidatePath("/activity");
}

export async function approveDealReportExport(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const dealSlug = String(formData.get("dealSlug"));
  await approveReportExportRequest(Number(formData.get("exportId")), {
    actorName: String(formData.get("actorName") || activeViewer || "Head of Portfolio Reporting")
  });
  revalidatePath(`/deals/${dealSlug}/reports`);
  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath("/reports");
  revalidatePath("/activity");
}

export async function releaseDealReportExport(formData: FormData) {
  const activeViewer = await getActiveViewer();
  const dealSlug = String(formData.get("dealSlug"));
  await releaseReportExportRequest(Number(formData.get("exportId")), {
    actorName: String(formData.get("actorName") || activeViewer || "Distribution Ops")
  });
  revalidatePath(`/deals/${dealSlug}/reports`);
  revalidatePath(`/deals/${dealSlug}/activity`);
  revalidatePath("/reports");
  revalidatePath("/activity");
}
