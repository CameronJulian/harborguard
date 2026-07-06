import type { ANPRDetection, ANPRProviderResult, ANPRStatus } from "@/lib/anpr/types";

function confidenceFor(index: number) {
  return Math.min(98, 72 + index * 4);
}

function statusFor(confidence: number, index: number): ANPRStatus {
  if (index % 7 === 0) return "watchlist_review";
  if (confidence >= 90) return "verified";
  return "review";
}

export async function loadANPRDetections(vehicles: any[]): Promise<ANPRProviderResult> {
  const provider = String(process.env.ANPR_PROVIDER || "mock").toLowerCase();

  if (provider !== "mock") {
    throw new Error(`ANPR provider ${provider} is not configured yet.`);
  }

  const detections: ANPRDetection[] = vehicles.map((vehicle, index) => {
    const confidence = confidenceFor(index);
    const status = statusFor(confidence, index);

    return {
      id: `anpr-${vehicle.id}-${index}`,
      vehicleId: vehicle.id,
      plateNumber: vehicle.registration_number || "UNKNOWN",
      vehicleName: vehicle.registration_number || vehicle.id,
      nickname: vehicle.nickname || null,
      cameraName: `${vehicle.registration_number || "Vehicle"} ANPR Camera`,
      source: "mock",
      confidence,
      status,
      watchlistMatch: status === "watchlist_review",
      detectedAt: new Date(Date.now() - index * 8 * 60 * 1000).toISOString(),
      location: index % 2 === 0 ? "Command route corridor" : "Depot access point",
      recommendedAction:
        status === "watchlist_review"
          ? "Review possible watchlist match and escalate if confirmed."
          : confidence >= 90
          ? "Plate verified. Continue monitoring."
          : "Review plate confidence and confirm vehicle identity.",
    };
  });

  return {
    provider: "mock",
    detections,
    generatedAt: new Date().toISOString(),
  };
}
