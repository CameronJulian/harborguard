import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { analyseFrame } from "@/lib/vision/provider";
type VisionProviderStatus = {
  provider: string;
  model: string | null;
  serviceAvailable: boolean;
  modelInstalled: boolean | null;
  modelLoaded: boolean | null;
  execution: string;
  message: string;
};

type OllamaModel = {
  name?: string;
  model?: string;
  size_vram?: number;
};

async function fetchWithTimeout(
  url: string,
  timeoutMs = 2500
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function getVisionProviderStatus():
Promise<VisionProviderStatus> {
  const provider = String(
    process.env.VISION_PROVIDER || "mock"
  ).toLowerCase();

  if (provider === "mock") {
    return {
      provider: "mock",
      model: null,
      serviceAvailable: true,
      modelInstalled: null,
      modelLoaded: null,
      execution: "Development mode",
      message: "Mock detections are enabled.",
    };
  }

  if (provider === "openai") {
    const model =
      process.env.OPENAI_VISION_MODEL ||
      "gpt-4.1-mini";

    const configured = Boolean(
      process.env.OPENAI_API_KEY
    );

    return {
      provider: "openai",
      model,
      serviceAvailable: configured,
      modelInstalled: null,
      modelLoaded: null,
      execution: "OpenAI cloud",
      message: configured
        ? "OpenAI credentials are configured."
        : "OPENAI_API_KEY is not configured.",
    };
  }

  if (provider === "ollama") {
    const baseUrl = (
      process.env.OLLAMA_BASE_URL ||
      "http://127.0.0.1:11434"
    ).replace(/\/+$/, "");

    const model =
      process.env.OLLAMA_VISION_MODEL ||
      "qwen2.5vl:3b";

    try {
      const [tagsResponse, processResponse] =
        await Promise.all([
          fetchWithTimeout(`${baseUrl}/api/tags`),
          fetchWithTimeout(`${baseUrl}/api/ps`),
        ]);

      if (!tagsResponse.ok || !processResponse.ok) {
        throw new Error(
          "Ollama status endpoint returned an error."
        );
      }

      const tagsResult =
        await tagsResponse.json();

      const processResult =
        await processResponse.json();

      const installedModels: OllamaModel[] =
        Array.isArray(tagsResult?.models)
          ? tagsResult.models
          : [];

      const loadedModels: OllamaModel[] =
        Array.isArray(processResult?.models)
          ? processResult.models
          : [];

      const matchesModel = (
        item: OllamaModel
      ) =>
        item.name === model ||
        item.model === model;

      const installed =
        installedModels.some(matchesModel);

      const loadedModel =
        loadedModels.find(matchesModel);

      const loaded = Boolean(loadedModel);

      const gpuLoaded =
        Number(loadedModel?.size_vram || 0) > 0;

      return {
        provider: "ollama",
        model,
        serviceAvailable: true,
        modelInstalled: installed,
        modelLoaded: loaded,
        execution: loaded
          ? gpuLoaded
            ? "Local GPU"
            : "Local Ollama"
          : "Local Ollama",
        message: loaded
          ? "Model is loaded and ready."
          : installed
          ? "Model is installed and loads on demand."
          : "Configured model is not installed.",
      };
    } catch (error: unknown) {
      return {
        provider: "ollama",
        model,
        serviceAvailable: false,
        modelInstalled: null,
        modelLoaded: null,
        execution: "Local Ollama",
        message:
          error instanceof Error &&
          error.name === "AbortError"
            ? "Ollama status check timed out."
            : "Ollama service is unavailable.",
      };
    }
  }

  return {
    provider,
    model: null,
    serviceAvailable: false,
    modelInstalled: null,
    modelLoaded: null,
    execution: "Unknown",
    message: `Unsupported provider: ${provider}`,
  };
}

function statusFor(confidence: number) {
  return confidence >= 85 ? "review_required" : "monitoring";
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const providerStatus =
      await getVisionProviderStatus();

    const { data: events, error } = await supabase
      .from("vision_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("detected_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const responseEvents = (events || []).map((event: any) => ({
      id: event.id,
      vehicleId: event.vehicle_id,
      vehicleName: event.vehicle_name || "Unknown vehicle",
      cameraName: event.camera_name || "Unknown camera",
      eventType: event.event_type,
      severity: event.severity,
      confidence: Number(event.confidence || 0),
      status: event.status,
      detectedAt: event.detected_at,
      description: event.description || "Vision event detected.",
      recommendedAction: event.recommended_action || "Review detection in Command Center.",
      provider: event.provider,
    }));

    const summary = {
      analysedCameras: new Set((events || []).map((event: any) => event.camera_name).filter(Boolean)).size,
      visionEvents: events?.length || 0,
      reviewRequired: (events || []).filter((item: any) => item.status === "review_required").length,
      highConfidence: (events || []).filter((item: any) => Number(item.confidence || 0) >= 85).length,
      averageConfidence: events && events.length
        ? Math.round(events.reduce((sum: number, item: any) => sum + Number(item.confidence || 0), 0) / events.length)
        : 0,
      provider: providerStatus.provider,
      providerStatus,
    };

    return NextResponse.json({
      success: true,
      summary,
      events: responseEvents,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load computer vision analytics." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const body = await req.json();

    const { data: latestLocation } = body.vehicleId
      ? await supabase
          .from("vehicle_locations")
          .select("latitude, longitude, recorded_at")
          .eq("vehicle_id", body.vehicleId)
          .eq("organization_id", organizationId)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : { data: null };

    const analysis = await analyseFrame({
      vehicleId: body.vehicleId,
      vehicleName: body.vehicleName,
      cameraName: body.cameraName,
      imageUrl: body.imageUrl,
      frameBase64: body.frameBase64,
      metadata: {
        source: "manual_computer_vision_analysis",
        receivedAt: new Date().toISOString(),
      },
    });

    const rows = analysis.detections.map((detection) => ({
      organization_id: organizationId,
      vehicle_id: body.vehicleId || null,
      vehicle_name: body.vehicleName || null,
      camera_name: body.cameraName || null,
      provider: analysis.provider,
      event_type: detection.label,
      severity: detection.severity,
      confidence: detection.confidence,
      status: detection.confidence >= 85 ? "review_required" : "monitoring",
      image_url: body.imageUrl || null,
      description: detection.description,
      recommended_action: detection.recommendedAction,
      raw_response: analysis.rawResponse || {},
      detected_at: analysis.analysedAt,
      latitude: latestLocation?.latitude ?? null,
      longitude: latestLocation?.longitude ?? null,
      location_recorded_at: latestLocation?.recorded_at ?? null,
    }));

    const { data: savedEvents, error: insertError } = await supabase
      .from("vision_events")
      .insert(rows)
      .select();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      provider: analysis.provider,
      detections: analysis.detections,
      savedEvents: savedEvents || [],
      analysedAt: analysis.analysedAt,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Computer vision analysis failed.";

    console.error("[computer-vision POST]", message);

    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 500 }
    );
  }
}


