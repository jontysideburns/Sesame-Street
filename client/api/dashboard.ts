import { fetchJson } from "./http";
import type { DashboardResponse } from "../lib/dashboard-types";

export async function getDashboard() {
  return fetchJson<DashboardResponse>("/api/dashboard");
}
