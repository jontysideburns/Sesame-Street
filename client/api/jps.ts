import { fetchJson } from "./http";

export type CovenantThreshold = {
  id: number;
  dealId: number;
  covenantName: string;
  ratioName: string;
  covenantCategory: string;
  testType: string;
  direction: string;
  lockupLevel: number | null;
  triggerLevel: number | null;
  defaultLevel: number | null;
  compositionTag: string | null;
  testFrequency: string | null;
};

export type ActualPeriodSummary = {
  id: number;
  periodLabel: string;
  periodFlag: string;
  periodStart: string;
  periodEnd: string;
  periodFrequency: string;
  sourceDocumentName: string | null;
  sourceDocumentType: string | null;
  receivedDate: string | null;
  approvalTier: string | null;
  approvedBy: string | null;
  ratioReconciliationStatus: string | null;
  hamAcknowledged: boolean;
  createdAt: string;
};

export type ActualPeriodDetail = ActualPeriodSummary & {
  actualMetrics: Record<string, number>;
  borrowerReportedRatios: Record<string, number>;
  platformComputedRatios: Record<string, number>;
  ratioReconciliationDetail: ReconciliationRow[] | null;
  borrowerNarrative: string | null;
  sectorKpis: Record<string, number>;
};

export type VarianceRow = {
  metricKey: string;
  actualValue: number;
  expectedValue: number;
  varianceValue: number;
  variancePct: number;
  direction: string;
  adverse: boolean;
  materiality: "critical" | "material" | "notable" | "minor";
};

export type VarianceReport = {
  dealSlug: string;
  periodFlag: string;
  summaryScore: number;
  variances: VarianceRow[];
  errors: string[];
};

export type CovenantTestRow = {
  id: number;
  covenantName: string;
  testType: string;
  ratioValue: number | null;
  borrowerReportedValue: number | null;
  lockupThreshold: number | null;
  triggerThreshold: number | null;
  defaultThreshold: number | null;
  tierStatus: "performing" | "distribution_lockup" | "trigger_event" | "event_of_default" | "not_assessed";
  headroomToLockup: number | null;
  headroomToTrigger: number | null;
  headroomToDefault: number | null;
  components: {
    numeratorLabel: string;
    numeratorValue: number | null;
    denominatorLabel: string;
    denominatorValue: number | null;
  } | null;
  covenantCategory: string | null;
  testFrequency: string | null;
};

export type CovenantTestsReport = {
  dealSlug: string;
  periodFlag: string;
  worstTier: string;
  tests: CovenantTestRow[];
};

export type ReconciliationRow = {
  ratioKey: string;
  borrowerReported: number | null;
  platformComputed: number | null;
  variance: number | null;
  variancePct: number | null;
  status: "matched" | "minor_variance" | "material_variance" | "unreconciled";
};

export type ReconciliationReport = {
  dealSlug: string;
  periodFlag: string;
  overallStatus: string;
  reconciliations: ReconciliationRow[];
};

export async function getCovenantConfig(slug: string): Promise<{ covenants: CovenantThreshold[] }> {
  return fetchJson(`/api/topsheet/${slug}/covenant-config`);
}

export async function getActualPeriods(slug: string): Promise<{ actuals: ActualPeriodSummary[] }> {
  return fetchJson(`/api/topsheet/${slug}/actuals`);
}

export async function getActualPeriodDetail(slug: string, periodFlag: string): Promise<ActualPeriodDetail> {
  return fetchJson(`/api/topsheet/${slug}/actuals/${periodFlag}`);
}

export async function getVarianceReport(slug: string, periodFlag: string): Promise<VarianceReport> {
  return fetchJson(`/api/topsheet/${slug}/variance/${periodFlag}`);
}

export async function getCovenantTests(slug: string, periodFlag: string): Promise<CovenantTestsReport> {
  return fetchJson(`/api/topsheet/${slug}/covenant-tests/${periodFlag}`);
}

export async function getReconciliation(slug: string, periodFlag: string): Promise<ReconciliationReport> {
  return fetchJson(`/api/topsheet/${slug}/reconciliation/${periodFlag}`);
}
