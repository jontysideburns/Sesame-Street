"use server";

import { revalidatePath } from "next/cache";
import {
  activateOnboardingWorkflowRequest,
  createOnboardingWorkflowRequest
} from "../../api/onboarding";

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export type OnboardingWorkflowActionState = {
  status: "idle" | "success" | "error";
  message: string;
  workflowId?: number;
};

export async function createOnboardingWorkflow(
  _previousState: OnboardingWorkflowActionState,
  formData: FormData
) {
  try {
    const result = await createOnboardingWorkflowRequest({
      workflowType: String(formData.get("workflowType") ?? "new_deal_packet"),
      workflowStatus: String(formData.get("workflowStatus") ?? "in_progress"),
      organisationId: parseOptionalNumber(formData.get("organisationId")),
      ownerId: parseOptionalNumber(formData.get("ownerId")),
      accountId: parseOptionalNumber(formData.get("accountId")),
      dealId: parseOptionalNumber(formData.get("dealId")),
      holdingId: parseOptionalNumber(formData.get("holdingId")),
      proposedOrganisationName: String(formData.get("proposedOrganisationName") ?? ""),
      proposedOwnerName: String(formData.get("proposedOwnerName") ?? ""),
      proposedAccountName: String(formData.get("proposedAccountName") ?? ""),
      proposedDealName: String(formData.get("proposedDealName") ?? ""),
      proposedHoldingAmount: parseOptionalNumber(formData.get("proposedHoldingAmount")),
      ownerName: String(formData.get("ownerName") ?? ""),
      targetGoLiveDate: String(formData.get("targetGoLiveDate") ?? ""),
      summary: String(formData.get("summary") ?? "")
    });

    revalidatePath("/configuration");
    revalidatePath("/work");
    revalidatePath("/notifications");
    revalidatePath("/activity");
    revalidatePath("/setup");

    return {
      status: "success" as const,
      message: `Setup workflow #${result.id} opened. It now appears in the activation queue below.`,
      workflowId: result.id
    };
  } catch (error) {
    return {
      status: "error" as const,
      message:
        error instanceof Error ? error.message : "Failed to open the setup workflow."
    };
  }
}

export async function activateOnboardingWorkflow(formData: FormData) {
  const workflowId = Number(formData.get("workflowId"));
  await activateOnboardingWorkflowRequest(workflowId);

  revalidatePath("/configuration");
  revalidatePath("/work");
  revalidatePath("/notifications");
  revalidatePath("/activity");
  revalidatePath("/setup");
  revalidatePath("/portfolio");
  revalidatePath("/deals");
}
