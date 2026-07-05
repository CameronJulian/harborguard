import type { VisionAnalysisInput, VisionAnalysisResult } from "@/lib/vision/types";

export async function analyseFrame(
  input: VisionAnalysisInput
): Promise<VisionAnalysisResult> {
  return {
    provider: "mock",
    analysedAt: new Date().toISOString(),
    detections: [
      {
        label: "road_obstruction",
        confidence: 82,
        severity: "medium",
        description: "Possible road obstruction detected in the camera frame.",
        recommendedAction: "Review frame and correlate with route telemetry.",
      },
    ],
    rawResponse: {
      mode: "mock",
      cameraName: input.cameraName,
      vehicleId: input.vehicleId,
    },
  };
}
