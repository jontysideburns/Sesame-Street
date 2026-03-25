"use server";

import { revalidatePath } from "next/cache";
import {
  approveIntakeDocumentBatchRequest,
  invokeIntakeExceptionAssistRequest,
  updateIntakeProposalRequest
} from "../../api/intake";

export async function updateExtractionProposal(formData: FormData) {
  const proposalId = Number(formData.get("proposalId"));
  const proposedValue = String(formData.get("proposedValue") ?? "").trim();
  const targetPeriodKey = String(formData.get("targetPeriodKey") ?? "").trim();
  const dealSlug = String(formData.get("dealSlug") ?? "").trim();
  const updatedBy = String(formData.get("updatedBy") ?? "PM - Infrastructure");

  await updateIntakeProposalRequest(proposalId, {
    proposedValue: proposedValue || undefined,
    targetPeriodKey: targetPeriodKey || undefined,
    dealSlug: dealSlug || undefined,
    updatedBy
  });

  revalidatePath("/intake");
  revalidatePath("/review");
  revalidatePath("/work");
  revalidatePath("/notifications");
  revalidatePath("/activity");
}

export async function approveDocumentPackage(formData: FormData) {
  const documentId = String(formData.get("documentId"));
  const approvedBy = String(formData.get("approvedBy") ?? "Review - Tier 2");

  await approveIntakeDocumentBatchRequest(documentId, { approvedBy });

  revalidatePath("/intake");
  revalidatePath("/review");
  revalidatePath("/work");
  revalidatePath("/notifications");
  revalidatePath("/activity");
}

export async function invokeExceptionAssist(formData: FormData) {
  const documentId = String(formData.get("documentId"));
  const invokedBy = String(formData.get("invokedBy") ?? "Operations - Exception Assist");

  await invokeIntakeExceptionAssistRequest(documentId, { invokedBy });

  revalidatePath("/intake");
  revalidatePath("/review");
  revalidatePath("/work");
  revalidatePath("/notifications");
  revalidatePath("/activity");
}
