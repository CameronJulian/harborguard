import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { analyseFrame } from "@/lib/vision/provider";

function statusFor(confidence: number) {
  return confidence >= 85 ? "review_required" : "monitoring";
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("id, registration_number, nickname, is_active, created_at")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const results = await Promise.all(
      (vehicles || []).map(async (vehicle: any, index: number) => {
        const cameraName = `${vehicle.registration_number || "Vehicle"} Front Dashcam`;

        const analysis = await analyseFrame({
          vehicleId: vehicle.id,
          vehicleName: vehicle.registration_number || vehicle.id,
          cameraName,
          metadata: {
            source: "command_center_computer_vision",
            index,
          },
        });

        return analysis.detections.map((detection, detectionIndex) => ({
          id: `vision-${vehicle.id}-${index}-${detectionIndex}`,
          vehicleId: vehicle.id,
          vehicleName: vehicle.registration_number || vehicle.id,
          nickname: vehicle.nickname || null,
          cameraName,
          eventType: detection.label,
          severity: detection.severity,
          confidence: detection.confidence,
          status: statusFor(detection.confidence),
          detectedAt: analysis.analysedAt,
          description: detection.description,
          recommendedAction: detection.recommendedAction,
          provider: analysis.provider,
        }));
      })
    );

    const events = results.flat();

    const summary = {
      analysedCameras: vehicles?.length || 0,
      visionEvents: events.length,
      reviewRequired: events.filter((item) => item.status === "review_required").length,
      highConfidence: events.filter((item) => item.confidence >= 85).length,
      averageConfidence: events.length
        ? Math.round(events.reduce((sum, item) => sum + item.confidence, 0) / events.length)
        : 0,
      provider: events[0]?.provider || "mock",
    };

    return NextResponse.json({
      success: true,
      summary,
      events,
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Computer vision analysis failed." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}