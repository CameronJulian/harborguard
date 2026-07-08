import { fetchWithAuth } from "@/lib/auth-fetch";

export async function getCommandCenterNotifications() {
  const response = await fetchWithAuth("/api/command-center/notifications", {
    cache: "no-store",
  });

  return response.json();
}

export async function markCommandCenterNotificationRead(notificationId: string) {
  const response = await fetchWithAuth("/api/command-center/notifications/read", {
    method: "POST",
    body: JSON.stringify({ notificationId }),
  });

  return response.json();
}

export async function resolveCommandCenterNotification(notificationId: string) {
  const response = await fetchWithAuth("/api/command-center/notifications/resolve", {
    method: "POST",
    body: JSON.stringify({ notificationId }),
  });

  return response.json();
}

export async function getCommandCenterOperationsSummary() {
  const response = await fetchWithAuth("/api/fleet/operations-summary", {
    cache: "no-store",
  });

  return response.json();
}

export async function getCommandCenterOperationsTimeline() {
  const response = await fetchWithAuth("/api/fleet/operations-timeline", {
    cache: "no-store",
  });

  return response.json();
}