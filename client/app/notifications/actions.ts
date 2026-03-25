"use server";

import { revalidatePath } from "next/cache";
import {
  updateNotificationDeliveryStateRequest,
  updateNotificationPreferencesRequest,
  updateNotificationSubscriptionRequest
} from "../../api/notifications";

function revalidateNotifications() {
  revalidatePath("/notifications");
  revalidatePath("/activity");
}

function toBool(value: FormDataEntryValue | null) {
  return String(value) === "true";
}

export async function updateNotificationDeliveryState(formData: FormData) {
  await updateNotificationDeliveryStateRequest(Number(formData.get("deliveryId")), {
    state: String(formData.get("state"))
  });
  revalidateNotifications();
}

export async function updateNotificationPreferences(formData: FormData) {
  await updateNotificationPreferencesRequest(String(formData.get("subscriberName")), {
    subscriberTeam: String(formData.get("subscriberTeam")),
    inAppEnabled: toBool(formData.get("inAppEnabled")),
    digestEnabled: toBool(formData.get("digestEnabled")),
    digestFrequency: String(formData.get("digestFrequency")),
    escalationOnly: toBool(formData.get("escalationOnly")),
    immediateEnabled: toBool(formData.get("immediateEnabled")),
    defaultChannel: String(formData.get("defaultChannel"))
  });
  revalidateNotifications();
}

export async function updateNotificationSubscription(formData: FormData) {
  await updateNotificationSubscriptionRequest(Number(formData.get("subscriptionId")), {
    active: toBool(formData.get("active")),
    deliveryFrequency: String(formData.get("deliveryFrequency")),
    onlyEscalations: toBool(formData.get("onlyEscalations"))
  });
  revalidateNotifications();
}
