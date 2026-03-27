import { fetchJson } from "./http";

export type RiskCode = {
  code: string;
  name: string;
  description: string;
  typicalSectors: string;
  riskImplication: string;
};

export type DurationCode = {
  code: string;
  name: string;
  description: string;
  riskImplication: string;
};

export type RiskTemplate = {
  pricingMechanisms: RiskCode[];
  volumeMechanisms: RiskCode[];
  durationCategories: DurationCode[];
};

export type DealClassification = {
  dealSlug: string;
  dealName: string;
  composite: string | null;
  pricingCode: string | null;
  volumeCode: string | null;
  durationCode: string | null;
  riskLevel: string | null;
};

export type RiskTemplateResponse = {
  template: RiskTemplate;
  dealClassifications: DealClassification[];
};

export async function getRiskTemplate(): Promise<RiskTemplateResponse> {
  return fetchJson("/api/plumbing/risk-template");
}
