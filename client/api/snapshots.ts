import { fetchJson } from "./http";
import { getActiveViewer } from "../lib/server-viewer";

const baseUrl = process.env.API_URL ?? "http://localhost:4000";

export type DealSnapshotsResponse = {
  viewer: {
    displayName: string;
    teamName: string;
    roleNames: string[];
    permissions: {
      canCaptureSnapshots: boolean;
    };
  };
  dealSlug: string;
  dealName: string;
  snapshots: Array<{
    id: number;
    snapshotLabel: string;
    snapshotType: string;
    capturedAt: string;
    capturedBy: string;
    summary: string;
    snapshotData: Record<string, unknown>;
    financialPeriodId: number | null;
    payloadHash: string;
    triggerEventId: number | null;
    priorSnapshotId: number | null;
    provenance: Array<{
      id: number;
      provenanceKind: string;
      sourceEntityType: string;
      sourceEntityId: number | null;
      sourceLabel: string;
      sourceEventId: number | null;
      payload: Record<string, unknown>;
      createdAt: string;
    }>;
    recomputations: Array<{
      id: number;
      recomputedAt: string;
      recomputedBy: string;
      recomputationStatus: string;
      expectedHash: string;
      actualHash: string;
      divergenceSummary: string;
      diffPayload: Record<string, unknown>;
    }>;
  }>;
};

export async function getDealSnapshots(slug: string) {
  return fetchJson<DealSnapshotsResponse>(`/api/deals/${slug}/snapshots`);
}

export async function captureDealSnapshotRequest(
  slug: string,
  payload: {
    snapshotLabel: string;
    snapshotType: string;
    capturedBy: string;
    summary?: string;
  }
) {
  const viewer = await getActiveViewer();
  const params = new URLSearchParams();
  if (viewer) params.set("viewer", viewer);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  const response = await fetch(`${baseUrl}/api/deals/${slug}/snapshots${suffix}`, {
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

export async function recomputeDealSnapshotRequest(
  slug: string,
  snapshotId: number,
  payload: { recomputedBy: string }
) {
  const viewer = await getActiveViewer();
  const params = new URLSearchParams();
  if (viewer) params.set("viewer", viewer);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";

  const response = await fetch(
    `${baseUrl}/api/deals/${slug}/snapshots/${snapshotId}/recompute${suffix}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<{ status: string }>;
}
