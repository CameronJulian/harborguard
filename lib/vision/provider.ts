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

async function analyseWithOllamaProvider(
  input: VisionAnalysisInput
): Promise<VisionAnalysisResult> {
  const baseUrl =
    process.env.OLLAMA_BASE_URL ||
    "http://127.0.0.1:11434";

  const model =
    process.env.OLLAMA_VISION_MODEL ||
    "qwen2.5vl:3b";

  if (!input.frameBase64 && !input.imageUrl) {
    throw new Error(
      "Ollama Vision requires imageUrl or frameBase64."
    );
  }

  let imageBase64 = input.frameBase64 || "";

  if (imageBase64.startsWith("data:")) {
    imageBase64 =
      imageBase64.split(",", 2)[1] || "";
  }

  if (!imageBase64 && input.imageUrl) {
    const imageResponse = await fetch(input.imageUrl);

    if (!imageResponse.ok) {
      throw new Error(
        `Failed to download image: ${imageResponse.status}`
      );
    }

    const imageBuffer =
      Buffer.from(await imageResponse.arrayBuffer());

    imageBase64 = imageBuffer.toString("base64");
  }

  const prompt = `
You are HarborGuard's fleet computer vision analyst.

Analyse the supplied image for:
- road hazards
- obstructions
- collisions
- unsafe driving conditions
- people near vehicles
- damaged vehicles
- smoke or fire
- suspicious activity
- visibility problems
- relevant operational risks

Return valid JSON only in this exact shape:

{
  "detections": [
    {
      "label": "snake_case_event_type",
      "confidence": 0,
      "severity": "low",
      "description": "Short factual description",
      "recommendedAction": "Short operational action"
    }
  ]
}

Rules:
- confidence must be an integer from 0 to 100
- severity must be low, medium, or high
- use an empty detections array if no meaningful operational event exists
- do not include markdown
- do not include explanations outside the JSON
`.trim();

  const response = await fetch(
    `${baseUrl}/api/generate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        images: [imageBase64],
        stream: false,
        format: "json",
        options: {
          temperature: 0.1,
        },
      }),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result?.error ||
        `Ollama Vision request failed: ${response.status}`
    );
  }

  let parsed: any;

  try {
    parsed = JSON.parse(result.response || "{}");
  } catch {
    throw new Error(
      "Ollama returned invalid JSON."
    );
  }

  const detections = Array.isArray(parsed?.detections)
    ? parsed.detections.map((detection: any) => ({
        label:
          String(detection.label || "unknown_event")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "") ||
          "unknown_event",

        confidence: Math.max(
          0,
          Math.min(
            100,
            Math.round(Number(detection.confidence || 0))
          )
        ),

        severity: ["low", "medium", "high"].includes(
          String(detection.severity).toLowerCase()
        )
          ? String(detection.severity).toLowerCase()
          : "low",

        description: String(
          detection.description ||
            "Computer vision event detected."
        ),

        recommendedAction: String(
          detection.recommendedAction ||
            "Review the camera frame."
        ),
      }))
    : [];

  return {
    provider: "ollama",
    detections,
    analysedAt: new Date().toISOString(),
    rawResponse: {
      model,
      response: result.response,
      totalDuration: result.total_duration,
      loadDuration: result.load_duration,
      promptEvalCount: result.prompt_eval_count,
      evalCount: result.eval_count,
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
    return analyseWithOpenAIProvider(input);
  }

  if (provider === "ollama") {
    return analyseWithOllamaProvider(input);
  }

  if (provider === "azure") {
    throw new Error("Azure Vision provider is not configured yet.");
  }

  if (provider === "rekognition" || provider === "aws") {
    throw new Error("AWS Rekognition provider is not configured yet.");
  }

  throw new Error(`Unsupported VISION_PROVIDER: ${provider}`);
}


