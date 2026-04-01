import { fetchJson } from "./http";

const baseUrl = process.env.API_URL ?? "http://localhost:4000";

export type DealForecastsResponse = {
  dealSlug: string;
  dealName: string;
  dealGrade: string;
  summary: {
    activeMonitoringCaseName: string;
    activeMonitoringVersionLabel: string;
    scenarioCount: number;
    latestRefreshAt: string | null;
    scenarios: Array<{
      caseName: string;
      caseType: string;
      versionLabel: string;
      isMonitoring: boolean;
      scenarioSummary: string;
      metrics: Record<string, number>;
      deltaToMonitoring: Record<string, number>;
    }>;
  } | null;
  cases: Array<{
    id: number;
    caseKey: string;
    caseName: string;
    caseType: string;
    drivesMonitoring: boolean;
    ownerName: string;
    summary: string;
    createdAt: string;
    versions: Array<{
      id: number;
      versionNumber: number;
      versionLabel: string;
      versionStatus: string;
      sourceDomain: string;
      summary: string;
      effectiveFrom: string;
      activatedAt: string | null;
      isActive: boolean;
      periods: Array<{
        id: number;
        financialPeriodId: number | null;
        periodKey: string;
        periodLabel: string;
        scenarioMetrics: Record<string, number>;
        scenarioSummary: string;
      }>;
      refreshImpacts: Array<{
        id: number;
        impactType: string;
        targetEntityType: string;
        targetEntityId: number | null;
        impactSummary: string;
        beforeState: Record<string, unknown>;
        afterState: Record<string, unknown>;
        recomputedAt: string;
      }>;
    }>;
  }>;
};

export async function getDealForecasts(slug: string) {
  return fetchJson<DealForecastsResponse>(`/api/deals/${slug}/forecasts`);
}

export type ForecastCaseDetail = {
  dealSlug: string;
  caseId: number;
  caseName: string;
  caseType: string;
  comparisonPriority: number;
  drivesMonitoring: boolean;
  ownerName: string;
  summary: string;
  versionLabel: string | null;
  versionStatus: string | null;
  periodSeries: Array<{
    periodKey: string;
    periodLabel: string;
    forecast: Record<string, number> | null;
    actuals: Record<string, number> | null;
  }>;
};

export async function getForecastCaseDetail(slug: string, caseId: number) {
  return fetchJson<ForecastCaseDetail>(`/api/deals/${slug}/forecasts/${caseId}`);
}

export async function activateForecastVersionRequest(
  versionId: number,
  payload: { activatedBy: string }
) {
  const response = await fetch(`${baseUrl}/api/forecast-case-versions/${versionId}/activate`, {
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
