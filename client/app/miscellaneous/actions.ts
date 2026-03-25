"use server";

import { revalidatePath } from "next/cache";
import { updateDemoClockRequest } from "../../api/calendar";

export async function updateDemoClock(formData: FormData) {
  await updateDemoClockRequest({
    currentDemoDate: String(formData.get("currentDemoDate") ?? ""),
    clockLabel: String(formData.get("clockLabel") ?? ""),
    updatedBy: String(formData.get("updatedBy") ?? "Miscellaneous Workspace")
  });

  revalidatePath("/miscellaneous");
  revalidatePath("/portfolio");
  revalidatePath("/portfolio/calendar");
  revalidatePath("/reports");
  revalidatePath("/work");
  revalidatePath("/activity");
}
