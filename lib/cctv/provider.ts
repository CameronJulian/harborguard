import type { CCTVCamera, CCTVProviderResult, CCTVStatus } from "@/lib/cctv/types";

const vendors = ["HarborGuard CCTV", "Axis Demo", "Hikvision Demo", "Milestone Demo"];
const locations = ["Depot entrance", "Main gate", "High-risk corridor", "Loading bay", "Route checkpoint", "Yard perimeter"];

function cameraStatus(index: number): CCTVStatus {
  if (index % 6 === 0) return "offline";
  if (index % 4 === 0) return "warning";
  return "online";
}

export async function loadCCTVCameras(vehicles: any[]): Promise<CCTVProviderResult> {
  const provider = String(process.env.CCTV_PROVIDER || "mock").toLowerCase();

  if (provider !== "mock") {
    throw new Error(`CCTV provider ${provider} is not configured yet.`);
  }

  const cameras: CCTVCamera[] = vehicles.map((vehicle, index) => {
    const status = cameraStatus(index);
    const motionDetected = status !== "offline" && index % 2 === 0;
    const aiEventCount = status === "offline" ? 0 : index + 1;

    return {
      id: `cctv-${vehicle.id}-${index}`,
      cameraName: `${locations[index % locations.length]} CCTV ${index + 1}`,
      vendor: vendors[index % vendors.length],
      location: locations[index % locations.length],
      linkedVehicleId: vehicle.id,
      linkedVehicle: vehicle.registration_number || vehicle.id,
      status,
      recording: status !== "offline",
      motionDetected,
      aiEventCount,
      personCount: status === "offline" ? 0 : index % 5,
      vehicleCount: status === "offline" ? 0 : (index % 4) + 1,
      latencyMs: status === "offline" ? null : 180 + index * 35,
      lastFrameAt: status === "offline" ? null : new Date(Date.now() - index * 6 * 60 * 1000).toISOString(),
      lastEvent: motionDetected ? "Motion detected near monitored corridor." : "No recent motion event.",
      recommendedAction:
        status === "offline"
          ? "Check camera power, network path, or NVR connection."
          : motionDetected
          ? "Review motion event and correlate with fleet activity."
          : "Continue CCTV monitoring.",
    };
  });

  return {
    provider: "mock",
    cameras,
    generatedAt: new Date().toISOString(),
  };
}
