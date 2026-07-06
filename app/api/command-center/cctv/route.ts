import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { loadCCTVCameras } from "@/lib/cctv/provider";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select("id, registration_number, nickname, is_active, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const result = await loadCCTVCameras(vehicles || []);
    const cameras = result.cameras;
	
	const rows = cameras.map((camera) => ({
  organization_id: organizationId,
  camera_name: camera.cameraName,
  provider: result.provider,
  vendor: camera.vendor || null,
  location: camera.location || null,
  linked_vehicle_id: camera.linkedVehicleId || null,
  linked_vehicle: camera.linkedVehicle || null,
  status: camera.status,
  recording: camera.recording,
  motion_detected: camera.motionDetected,
  ai_event_count: camera.aiEventCount,
  person_count: camera.personCount,
  vehicle_count: camera.vehicleCount,
  latency_ms: camera.latencyMs,
  last_frame_at: camera.lastFrameAt,
  last_event: camera.lastEvent,
  recommended_action: camera.recommendedAction,
  raw_response: camera,
  captured_at: result.generatedAt,
}));

if (rows.length > 0) {
  const { error: insertError } = await supabase
    .from("cctv_events")
    .insert(rows);

  if (insertError) {
    throw insertError;
  }
}

    const summary = {
      totalCameras: cameras.length,
      online: cameras.filter(c => c.status === "online").length,
      warning: cameras.filter(c => c.status === "warning").length,
      offline: cameras.filter(c => c.status === "offline").length,
      recording: cameras.filter(c => c.recording).length,
      motionEvents: cameras.filter(c => c.motionDetected).length,
      aiEvents: cameras.reduce((sum, c) => sum + c.aiEventCount, 0),
      provider: result.provider,
    };

    return NextResponse.json({
      success: true,
      summary,
      cameras,
      provider: result.provider,
      generatedAt: result.generatedAt,
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Failed to load CCTV monitoring.",
      },
      {
        status: error.message === "Unauthorized" ? 401 : 500,
      }
    );
  }
}