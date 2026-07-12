import type {
  DashcamCamera,
  DashcamProviderResult,
} from "@/lib/dashcam/types";

import type {
  DashcamVehicle,
} from "@/lib/dashcam/providers/types";

const LOCAL_SNAPSHOT_TIMEOUT_MS = 5000;

export async function loadLocalDashcams(
  vehicles: DashcamVehicle[]
): Promise<DashcamProviderResult> {
  const snapshotUrl =
    process.env.DASHCAM_LOCAL_SNAPSHOT_URL?.trim();

  if (!snapshotUrl) {
    throw new Error(
      "DASHCAM_LOCAL_SNAPSHOT_URL is not configured."
    );
  }

  const vehicle = vehicles[0];

  if (!vehicle) {
    return {
      provider: "local",
      cameras: [],
      generatedAt: new Date().toISOString(),
    };
  }

  let online = false;
  let snapshotId = snapshotUrl;
  let lastHeartbeat: string | null = null;

  try {
    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      LOCAL_SNAPSHOT_TIMEOUT_MS
    );

    try {
      const response = await fetch(snapshotUrl, {
        method: "HEAD",
        cache: "no-store",
        signal: controller.signal,
      });

      online = response.ok;

      if (online) {
        const etag =
          response.headers.get("etag");

        const lastModified =
          response.headers.get("last-modified");

        const contentLength =
          response.headers.get("content-length");

        snapshotId = [
          snapshotUrl,
          etag || "",
          lastModified || "",
          contentLength || "",
        ].join("|");

        lastHeartbeat =
          new Date().toISOString();
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    online = false;
  }

  const camera: DashcamCamera = {
    id: `local-dashcam-${vehicle.id}`,
    vehicleId: vehicle.id,
    vehicleName:
      vehicle.registration_number || vehicle.id,
    nickname: vehicle.nickname || null,
    cameraName:
      process.env.DASHCAM_LOCAL_CAMERA_NAME ||
      "Local Test Dashcam",
    vendor: "local",
    status: online ? "online" : "offline",
    recording: online,
    storageUsedPercent: 0,
    lastHeartbeat,
    lastClipAt: online
      ? new Date().toISOString()
      : null,
    latestClipLabel: online
      ? "Latest local snapshot"
      : null,
    latestSnapshotUrl: online
      ? snapshotUrl
      : null,
    snapshotId: online
      ? snapshotId
      : null,
    aiEvents: [],
  };

  return {
    provider: "local",
    cameras: [camera],
    generatedAt: new Date().toISOString(),
  };
}
