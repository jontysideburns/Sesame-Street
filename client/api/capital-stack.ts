import { fetchJson } from "./http";

// Full StackView as returned by GET /api/deals/{slug}/capital-stack.
// Mirrors the shape produced by server/capital_structure_engine.build_capital_stack.

export type CapitalStackLayer = {
  rank: number;
  entity_level: string;
  entity_name: string;
  debt_total: number;
  debt_our: number;
  instrument_count: number;
  inherited_value: number;
  residual_after_debt: number;
};

export type CapitalStackParallelClaim = {
  instrument_name: string;
  debtor_entity: string;
  pledged_share_entity: string;
  pledged_share_pct: number;
  face_value: number;
  our_holding: number;
  gross_up_factor: number;
  grossed_up_equivalent: number;
};

export type CapitalStackMetrics = {
  senior_debt_total: number;
  consolidated_debt_total: number;
  parallel_claims_grossed_up: number;
  grossed_up_equivalent_debt: number;
  senior_ltv_pct: number | null;
  consolidated_ltv_pct: number | null;
  grossed_up_equivalent_ltv_pct: number | null;
  consolidated_leverage_x: number | null;
  grossed_up_equivalent_leverage_x: number | null;
};

export type CapitalStackOurPosition = {
  total_holding: number;
  dominant_rank: number | null;
  all_ranks_held: number[];
  instrument_count: number;
  pledged_share_exposure: number;
  debt_senior_to_us?: number;
  pari_passu_with_us_ex_our?: number;
  subordinated_cushion?: number;
  true_equity_cushion?: number;
  total_cushion_below_us?: number;
};

export type CapitalStackChangeOfControl = {
  instrument_name: string;
  debtor_entity: string;
  pledged_share_entity: string;
  pledged_share_pct: number;
  face_value: number;
  pledged_value: number;
  ltv_on_pledge_pct: number;
  status: "green" | "amber" | "red";
  gross_up_factor: number;
  grossed_up_equivalent: number;
};

export type CapitalStackWarning = {
  severity: "warn" | "error";
  message: string;
  subject: string;
};

export type CapitalStackResponse = {
  deal_slug: string;
  deal_name: string;
  currency: string;
  reporting_currency: string;
  valuation: {
    enterprise_value: number;
    date: string | null;
    method: string | null;
    entity: string | null;
  };
  layers: CapitalStackLayer[];
  residual_equity: number;
  parallel_claims: CapitalStackParallelClaim[];
  metrics: CapitalStackMetrics;
  our_position: CapitalStackOurPosition;
  change_of_control: CapitalStackChangeOfControl[];
  warnings: CapitalStackWarning[];
};

export async function getCapitalStack(
  slug: string,
  reportingCurrency?: "GBP" | "USD" | "EUR",
): Promise<CapitalStackResponse> {
  const params = new URLSearchParams();
  if (reportingCurrency) params.set("reporting_currency", reportingCurrency);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<CapitalStackResponse>(`/api/deals/${slug}/capital-stack${suffix}`);
}
