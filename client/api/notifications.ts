import { fetchJson } from "./http";

const baseUrl = process.env.API_URL ?? "http://localhost:4000";

export type NotificationInboxResponse = {
  selectedSubscriber: string;
  selectedTeam: string;
  subscriberOptions: string[];
  teamOptions: string[];
  summary: {
    newItems: number;
    acknowledgedItems: number;
    digestCount: number;
    escalations: number;
  };
  preferences: {
    subscriberName: string;
    subscriberTeam: string;
    inAppEnabled: boolean;
    digestEnabled: boolean;
    digestFrequency: string;
    escalationOnly: boolean;
    immediateEnabled: boolean;
    defaultChannel: string;
  };
  subscriptions: Array<{
    id: number;
    sourceDomain: string | null;
    dealName: string | null;
    organisationName: string | null;
    ownerName: string | null;
    accountName: string | null;
    severityThreshold: string;
    deliveryFrequency: string;
    onlyEscalations: boolean;
    active: boolean;
    subscriptionLabel: string;
  }>;
  inbox: Array<{
    id: number;
    deliveryChannel: string;
    deliveryFrequency: string;
    deliveryStatus: string;
    deliveredAt: string;
    seenAt: string | null;
    acknowledgedAt: string | null;
    dismissedAt: string | null;
    event: {
      id: number;
      sourceDomain: string;
      sourceEntityType: string;
      sourceEntityId: number;
      eventType: string;
      severity: string;
      dealName: string | null;
      dealSlug: string | null;
      title: string;
      summary: string;
      deepLink: string;
      createdAt: string;
      payload: Record<string, unknown>;
    };
  }>;
  digests: Array<{
    id: number;
    digestLabel: string;
    digestFrequency: string;
    deliveryChannel: string;
    digestStatus: string;
    itemCount: number;
    summary: string;
    generatedAt: string;
  }>;
};

export async function getNotifications(filters?: { subscriber?: string; team?: string }) {
  const params = new URLSearchParams();
  if (filters?.subscriber) params.set("subscriber", filters.subscriber);
  if (filters?.team) params.set("team", filters.team);
  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  return fetchJson<NotificationInboxResponse>(`/api/notifications${suffix}`);
}

export async function updateNotificationDeliveryStateRequest(
  deliveryId: number,
  payload: { state: string }
) {
  const response = await fetch(`${baseUrl}/api/notification-deliveries/${deliveryId}/state`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function updateNotificationPreferencesRequest(
  subscriberName: string,
  payload: {
    subscriberTeam: string;
    inAppEnabled: boolean;
    digestEnabled: boolean;
    digestFrequency: string;
    escalationOnly: boolean;
    immediateEnabled: boolean;
    defaultChannel: string;
  }
) {
  const response = await fetch(`${baseUrl}/api/notification-preferences/${encodeURIComponent(subscriberName)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<{ ok: boolean }>;
}

export async function updateNotificationSubscriptionRequest(
  subscriptionId: number,
  payload: {
    active: boolean;
    deliveryFrequency: string;
    onlyEscalations: boolean;
  }
) {
  const response = await fetch(`${baseUrl}/api/notification-subscriptions/${subscriptionId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<{ ok: boolean }>;
}
