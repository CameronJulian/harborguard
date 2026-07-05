import type { VisionAnalysisInput, VisionAnalysisResult } from "@/lib/vision/types";

async function analyseWithMockProvider(
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
      hasImageUrl: Boolean(input.imageUrl),
      hasFrameBase64: Boolean(input.frameBase64),
    },
  };
}

export async function analyseFrame(
  input: VisionAnalysisInput
): Promise<VisionAnalysisResult> {
  const provider = String(process.env.VISION_PROVIDER || "mock").toLowerCase();

  if (provider === "mock") {
    return analyseWithMockProvider(input);
  }

  if (provider === "openai") {
    throw new Error("OpenAI Vision provider is not configured yet.");
  }

  if (provider === "azure") {
    throw new Error("Azure Vision provider is not configured yet.");
  }

  if (provider === "rekognition" || provider === "aws") {
    throw new Error("AWS Rekognition provider is not configured yet.");
  }

  throw new Error(`Unsupported VISION_PROVIDER: ${provider}`);
}
