import type {
  DashcamCamera,
  DashcamProviderResult,
  DashcamStatus,
} from "@/lib/dashcam/types";

import type {
  DashcamVehicle,
} from "@/lib/dashcam/providers/types";

export function loadMockDashcams(
  vehicles: DashcamVehicle[]
): DashcamProviderResult {
  const cameras: DashcamCamera[] = vehicles.map(
    (vehicle, index) => {
      const warning = index % 5 === 0;
      const offline = index % 7 === 0;

      const status: DashcamStatus = offline
        ? "offline"
        : warning
        ? "warning"
        : "online";

      return {
        id: `dashcam-${vehicle.id}`,
        vehicleId: vehicle.id,
        vehicleName:
          vehicle.registration_number || vehicle.id,
        nickname: vehicle.nickname || null,
        cameraName: `${
          vehicle.registration_number || "Vehicle"
        } Front Dashcam`,
        vendor: "mock",
        status,
        recording: !offline,
        storageUsedPercent: Math.min(
          95,
          35 + index * 7
        ),
        lastHeartbeat: offline
          ? null
          : new Date(
              Date.now() - index * 4 * 60 * 1000
            ).toISOString(),
        lastClipAt:
          index % 3 === 0
            ? new Date(
                Date.now() - index * 9 * 60 * 1000
              ).toISOString()
            : null,
        latestClipLabel:
          index % 3 === 0
            ? "Latest road safety clip"
            : null,
        latestSnapshotUrl: null,
        snapshotId: null,
        aiEvents: warning
          ? ["review recommended"]
          : [],
      };
    }
  );

  return {
    provider: "mock",
    cameras,
    generatedAt: new Date().toISOString(),
  };
}
