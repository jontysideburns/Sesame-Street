import { fetchJson } from "./http";

export type RiskRegisterEntry = {
  id: string;
  riskId: string;
  riskName: string;
  categoryCode: string;
  categoryName: string;
  categoryNumber: number;
  subSector: string | null;
  description: string | null;
  typicalSectors: string | null;
  keyIndicators: string | null;
  status: "assessed" | "not_applicable" | "not_yet_assessed";
  likelihood: number | null;
  severity: number | null;
  riskScore: number | null;
  riskLevel: "low" | "moderate" | "high" | "critical" | "fatal" | null;
  mitigationPartyScore: string | null;
  mitigationPartyName: string | null;
  mitigationPartyDetail: string | null;
  mitigationCapitalScore: string | null;
  mitigationCapitalType: string | null;
  mitigationCapitalProvider: string | null;
  mitigationCapitalAmount: number | null;
  mitigationCapitalExpiry: string | null;
  mitigationCapitalDetail: string | null;
  sensitisedAtOrigination: boolean;
  sensitivityName: string | null;
  stressApplied: string | null;
  stressDscrMin: number | null;
  stressDscrMax: number | null;
  stressDscrAvg: number | null;
  monitoringKpi: string | null;
  monitoringThreshold: number | null;
  trend: "improving" | "stable" | "deteriorating" | "new";
  commentary: string | null;
  assessedBy: string | null;
  assessedAt: string | null;
  reviewTrigger: string | null;
};

export type RiskRegisterResponse = {
  dealSlug: string;
  dealSector: string;
  sectorSubsector: string | null;
  total: number;
  risks: RiskRegisterEntry[];
};

export type RiskRegisterUpdate = {
  status?: string;
  likelihood?: number | null;
  severity?: number | null;
  mitigationPartyScore?: string | null;
  mitigationPartyName?: string | null;
  mitigationPartyDetail?: string | null;
  mitigationCapitalScore?: string | null;
  mitigationCapitalType?: string | null;
  mitigationCapitalProvider?: string | null;
  mitigationCapitalAmount?: number | null;
  mitigationCapitalExpiry?: string | null;
  mitigationCapitalDetail?: string | null;
  sensitisedAtOrigination?: boolean;
  sensitivityName?: string | null;
  stressApplied?: string | null;
  stressDscrMin?: number | null;
  stressDscrMax?: number | null;
  stressDscrAvg?: number | null;
  monitoringKpi?: string | null;
  monitoringThreshold?: number | null;
  trend?: string;
  commentary?: string | null;
  assessedBy?: string | null;
  reviewTrigger?: string | null;
};

export async function getRiskRegister(
  slug: string,
  params?: { status?: string; category?: string; riskLevel?: string; sectorFilter?: boolean }
): Promise<RiskRegisterResponse> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.category) qs.set("category", params.category);
  if (params?.riskLevel) qs.set("risk_level", params.riskLevel);
  if (params?.sectorFilter !== undefined) qs.set("sector_filter", String(params.sectorFilter));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return fetchJson(`/api/deals/${slug}/risk-register${query}`);
}
