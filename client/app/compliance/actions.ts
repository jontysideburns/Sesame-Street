"use server";

import { revalidatePath } from "next/cache";
import { triageIncomingDocumentRequest } from "../../api/compliance";

function revalidateCompliancePaths() {
  revalidatePath("/compliance");
  revalidatePath("/compliance/calendar");
  revalidatePath("/compliance/obligations");
  revalidatePath("/compliance/inbox");
  revalidatePath("/compliance/processing");
  revalidatePath("/compliance/fulfilments");
  revalidatePath("/compliance/exceptions");
  revalidatePath("/compliance/alerts");
  revalidatePath("/compliance/review");
  revalidatePath("/compliance/evidence");
  revalidatePath("/portfolio");
  revalidatePath("/evidence");
  revalidatePath("/work");
  revalidatePath("/notifications");
  revalidatePath("/activity");
}

export async function triageIncomingDocument(formData: FormData) {
  const id = String(formData.get("id"));
  const action = String(formData.get("action"));
  const dealSlugValue = formData.get("dealSlug");
  const dealSlug =
    typeof dealSlugValue === "string" && dealSlugValue.length > 0
      ? dealSlugValue
      : undefined;

  await triageIncomingDocumentRequest(id, { action, dealSlug });
  revalidateCompliancePaths();
}
