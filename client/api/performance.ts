import { fetchJson } from "./http";

/* ── Types ─────────────────────────────────────────────────────── */

export type HeadroomAssessment = {
  metric: string;
  metricSource?: string;
  direction?: string;
  managementCase: number | null;
  defaultLevel: number | null;
  lockupLevel: number | null;
  actual: number | null;
  expectedHeadroom: number | null;
  actualHeadroom: number | null;
  erosionAbs: number | null;
  erosionPct: number | null;
  componentGrade: number | null;
};

export type TrendDetail = {
  erosionSeries: number[] | null;
  delta1: number | null;
  delta2: number | null;
  persistentDrift: boolean | null;
  trend: string | null;
};

export type PerformanceAssessment = {
  id: number;
  dealId: number;
  financialPeriodId: number | null;
  assessmentPeriod: string;

  // Grade
  performanceGrade: number;
  gradeLabel: string;
  priorGrade: number | null;
  gradeChanged: boolean;
  gradeDirection: string | null;

  // DSCR assessment
  dscrMetric: string;
  dscrMetricSource: string | null;
  dscrManagementCase: number | null;
  dscrDefaultLevel: number | null;
  dscrLockupLevel: number | null;
  dscrActual: number | null;
  dscrExpectedHeadroom: number | null;
  dscrActualHeadroom: number | null;
  dscrErosionAbs: number | null;
  dscrErosionPct: number | null;
  dscrComponentGrade: number | null;

  // Collateral assessment
  collMetric: string;
  collDirection: string;
  collManagementCase: number | null;
  collDefaultLevel: number | null;
  collLockupLevel: number | null;
  collActual: number | null;
  collExpectedHeadroom: number | null;
  collActualHeadroom: number | null;
  collErosionAbs: number | null;
  collErosionPct: number | null;
  collComponentGrade: number | null;

  // Trend
  performanceTrend: string | null;
  trendLabel: string | null;
  trendPeriods: string[] | null;
  dscrErosionSeries: number[] | null;
  dscrDelta1: number | null;
  dscrDelta2: number | null;
  dscrPersistentDrift: boolean | null;
  dscrTrend: string | null;
  collErosionSeries: number[] | null;
  collDelta1: number | null;
  collDelta2: number | null;
  collPersistentDrift: boolean | null;
  collTrend: string | null;

  // Override
  overrideActive: boolean;
  overrideGrade: number | null;
  overrideRationale: string | null;
  overrideBy: string | null;
  overrideAt: string | null;
  overrideExpiry: string | null;

  // Config
  dscrThresholdPct: number;
  collThresholdPct: number;
  determinativeRatio: string | null;
  flags: string[] | null;

  createdAt: string;
};

export type GradeDistribution = {
  distribution: Array<{
    grade: number;
    label: string;
    dealCount: number;
    totalExposure: number;
  }>;
};

export type WatchlistItem = {
  slug: string;
  dealName: string;
  exposure: number;
  sector: string;
  grade: number;
  gradeLabel: string;
  trend: string;
  trendLabel: string;
  assessmentPeriod: string;
  determinativeRatio: string;
};

/* ── API functions ─────────────────────────────────────────────── */

export async function getPerformanceAssessment(slug: string) {
  return fetchJson<PerformanceAssessment>(`/api/deals/${slug}/performance`);
}

export async function getPerformanceHistory(slug: string) {
  return fetchJson<PerformanceAssessment[]>(`/api/deals/${slug}/performance/history`);
}

export async function getGradeDistribution() {
  return fetchJson<GradeDistribution>(`/api/portfolio/grade-distribution`);
}

export async function getWatchlist() {
  return fetchJson<WatchlistItem[]>(`/api/portfolio/watchlist`);
}
