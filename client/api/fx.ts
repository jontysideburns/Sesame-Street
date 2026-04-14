import { fetchJson } from "./http";

export type FxSnapshot = {
  reportingCurrency: string;
  asOf: string;
  baseCurrency: string;
  rates: Record<string, number>;
  crossRates: Record<string, number>;
  source: string | null;
};

export async function getFxSnapshot(reportingCurrency: string = "GBP", asAt?: string) {
  const params = new URLSearchParams();
  params.set("reporting_currency", reportingCurrency);
  if (asAt) params.set("as_at", asAt);
  return fetchJson<FxSnapshot>(`/api/fx/snapshot?${params.toString()}`);
}
