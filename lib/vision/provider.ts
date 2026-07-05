import type { VisionAnalysisInput, VisionAnalysisResult, VisionDetection } from "@/lib/vision/types";

function buildImageInput(input: VisionAnalysisInput) {
  if (input.imageUrl) return input.imageUrl;

  if (input.frameBase64) {
    if (input.frameBase64.startsWith("data:image/")) {
      return input.frameBase64;
    }

    return `data:image/jpeg;base64,${input.frameBase64}`;
  }

  return null;
}

function parseDetections(text: string): VisionDetection[] {
  try {
    const parsed = JSON.parse(text);
    const detections = Array.isArray(parsed?.detections) ? parsed.detections : [];

    return detections.map((item: any) => ({
      label: String(item.label || "vision_event"),
      confidence: Math.max(0, Math.min(100, Number(item.confidence || 0))),
      severity: item.severity === "high" || item.severity === "medium" ? item.severity : "low",
      description: String(item.description || "Vision event detected."),
      recommendedAction: String(item.recommendedAction || "Review detection in Command Center."),
    }));
  } catch {
    return [
      {
        label: "vision_analysis",
        confidence: 70,
        severity: "medium",
        description: text.slice(0, 500),
        recommendedAction: "Review AI vision output manually.",
      },
    ];
  }
}

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

async function analyseWithOpenAIProvider(
  input: VisionAnalysisInput
): Promise<VisionAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const imageInput = buildImageInput(input);

  if (!imageInput) {
    throw new Error("OpenAI Vision requires imageUrl or frameBase64.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "You are HarborGuard computer vision. Analyze this fleet, dashcam, CCTV, or road-safety frame. Return ONLY valid JSON in this shape: " +
                '{"detections":[{"label":"road_obstruction","confidence":82,"severity":"medium","description":"short description","recommendedAction":"short action"}]}. ' +
                "Severity must be low, medium, or high. Confidence must be 0 to 100.",
            },
            {
              type: "input_image",
              image_url: imageInput,
            },
          ],
        },
      ],
      store: false,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result?.error?.message || "OpenAI Vision request failed.");
  }

  const text =
    result.output_text ||
    result.output?.flatMap((item: any) => item.content || [])
      ?.map((content: any) => content.text || "")
      ?.join("") ||
    "";

  return {
    provider: "openai",
    analysedAt: new Date().toISOString(),
    detections: parseDetections(text),
    rawResponse: result,
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
    return analyseWithOpenAIProvider(input);
  }

  if (provider === "azure") {
    throw new Error("Azure Vision provider is not configured yet.");
  }

  if (provider === "rekognition" || provider === "aws") {
    throw new Error("AWS Rekognition provider is not configured yet.");
  }

  throw new Error(`Unsupported VISION_PROVIDER: ${provider}`);
}
