import { fetchJson } from "./http";
import type { ViewerSummary } from "../lib/viewer";

export type ViewerDirectoryResponse = {
  defaultViewerName: string;
  activeViewer: {
    displayName: string;
    teamName: string;
    roleNames: string[];
    permissionKeys: string[];
    permissions: {
      canViewPortfolio: boolean;
      canViewDeal: boolean;
      canViewReports: boolean;
      canViewActivity: boolean;
      canGenerateReports: boolean;
      canReviewReports: boolean;
      canApproveReports: boolean;
      canReleaseReports: boolean;
      canDecideRequests: boolean;
      canCaptureSnapshots: boolean;
    };
    entitlementSummaries: string[];
  };
  viewers: ViewerSummary[];
};

export async function getViewerDirectory() {
  return fetchJson<ViewerDirectoryResponse>("/api/entitlements/viewers");
}
