import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { analyseFrame } from "@/lib/vision/provider";

function statusFor(confidence: number) {
  return confidence >= 85 ? "review_required" : "monitoring";
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

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
      provider: events?.[0]?.provider || "mock",
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
