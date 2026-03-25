"use server";

import { revalidatePath } from "next/cache";
import { approveReviewItemRequest } from "../../api/review";

export async function approveReviewItem(id: number) {
  await approveReviewItemRequest(id);

  revalidatePath("/");
  revalidatePath("/intake");
  revalidatePath("/review");
  revalidatePath("/work");
  revalidatePath("/notifications");
  revalidatePath("/activity");
  revalidatePath("/deals/aurora-prime-data-campus");
  revalidatePath("/deals/aurora-prime-data-campus/activity");
  revalidatePath("/deals/aurora-prime-data-campus/periods/latest");
  revalidatePath("/deals/aurora-prime-data-campus/distribution");
  revalidatePath("/deals/aurora-prime-data-campus/assessment");
  revalidatePath("/deals/aurora-prime-data-campus/covenants/1");
}
