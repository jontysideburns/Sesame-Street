import { fetchJson } from "./http";
import type { DashboardResponse } from "../lib/dashboard-types";

export async function getDashboard(scope?: {
  organisation?: string;
  owner?: string;
  account?: string;
}) {
  const params = new URLSearchParams();

  if (scope?.organisation) params.set("organisation", scope.organisation);
  if (scope?.owner) params.set("owner", scope.owner);
  if (scope?.account) params.set("account", scope.account);

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<DashboardResponse>(`/api/dashboard${suffix}`);
}
