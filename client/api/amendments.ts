import { fetchJson } from "./http";
import type { DealAmendment } from "./deals";

export type DealAmendmentsResponse = {
  dealSlug: string;
  dealName: string;
  dealGrade: string;
  summary: {
    totalAmendments: number;
    activeAmendments: number;
    activeRuleVersions: number;
    recomputedObjects: number;
    latestEffectiveDate: string | null;
  };
  amendments: DealAmendment[];
};

export async function getDealAmendments(slug: string) {
  return fetchJson<DealAmendmentsResponse>(`/api/deals/${slug}/amendments`);
}
