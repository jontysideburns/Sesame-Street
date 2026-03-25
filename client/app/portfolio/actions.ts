"use server";

import { revalidatePath } from "next/cache";
import { createPortfolioPackRequest } from "../../api/packs";

function buildScopeSuffix(scope: {
  organisation?: string;
  owner?: string;
  account?: string;
}) {
  const params = new URLSearchParams();

  if (scope.organisation) params.set("organisation", scope.organisation);
  if (scope.owner) params.set("owner", scope.owner);
  if (scope.account) params.set("account", scope.account);

  return params.size > 0 ? `?${params.toString()}` : "";
}

export async function generatePortfolioWatchlistPack(formData: FormData) {
  const scope = {
    organisation:
      typeof formData.get("organisation") === "string" && String(formData.get("organisation"))
        ? String(formData.get("organisation"))
        : undefined,
    owner:
      typeof formData.get("owner") === "string" && String(formData.get("owner"))
        ? String(formData.get("owner"))
        : undefined,
    account:
      typeof formData.get("account") === "string" && String(formData.get("account"))
        ? String(formData.get("account"))
        : undefined
  };

  await createPortfolioPackRequest(
    {
      packKind: "watchlist_committee",
      generatedBy: String(formData.get("generatedBy") || "Portfolio Committee Workspace"),
      organisationId:
        typeof formData.get("organisationId") === "string" && String(formData.get("organisationId"))
          ? Number(formData.get("organisationId"))
          : undefined,
      ownerId:
        typeof formData.get("ownerId") === "string" && String(formData.get("ownerId"))
          ? Number(formData.get("ownerId"))
          : undefined,
      accountId:
        typeof formData.get("accountId") === "string" && String(formData.get("accountId"))
          ? Number(formData.get("accountId"))
          : undefined
    },
    scope
  );

  const suffix = buildScopeSuffix(scope);
  revalidatePath("/portfolio");
  revalidatePath(`/portfolio${suffix}`);
  revalidatePath("/portfolio/packs");
  revalidatePath(`/portfolio/packs${suffix}`);
  revalidatePath("/activity");
}
