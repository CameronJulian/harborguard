import type { DashcamProviderResult, DashcamStatus } from "@/lib/dashcam/types";

export async function loadDashcams(vehicles: any[]): Promise<DashcamProviderResult> {
  const provider = String(process.env.DASHCAM_PROVIDER || "mock").toLowerCase();

  if (provider !== "mock") {
    throw new Error(`Dashcam provider ${provider} is not configured yet.`);
  }

  const cameras = vehicles.map((vehicle, index) => {
    const warning = index % 5 === 0;
    const offline = index % 7 === 0;
    const status: DashcamStatus = offline ? "offline" : warning ? "warning" : "online";

    return {
      id: `dashcam-${vehicle.id}`,
      vehicleId: vehicle.id,
      vehicleName: vehicle.registration_number || vehicle.id,
      nickname: vehicle.nickname || null,
      cameraName: `${vehicle.registration_number || "Vehicle"} Front Dashcam`,
      vendor: "mock",
      status,
      recording: !offline,
      storageUsedPercent: Math.min(95, 35 + index * 7),
      lastHeartbeat: offline ? null : new Date(Date.now() - index * 4 * 60 * 1000).toISOString(),
      lastClipAt: index % 3 === 0 ? new Date(Date.now() - index * 9 * 60 * 1000).toISOString() : null,
      latestClipLabel: index % 3 === 0 ? "Latest road safety clip" : null,
      aiEvents: warning ? ["review recommended"] : [],
    };
  });

  return {
    provider: "mock",
    cameras,
    generatedAt: new Date().toISOString(),
  };
}
