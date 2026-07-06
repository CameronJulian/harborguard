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

    const { data: persistedEvents, error: eventsError } = await supabase
      .from("cctv_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("captured_at", { ascending: false })
      .limit(100);

    if (eventsError) {
      throw eventsError;
    }

    const persistedCameras = (persistedEvents || []).map((event: any) => ({
      id: event.id,
      cameraName: event.camera_name,
      vendor: event.vendor || event.provider || "mock",
      location: event.location || "Unknown location",
      linkedVehicleId: event.linked_vehicle_id,
      linkedVehicle: event.linked_vehicle || "Unknown vehicle",
      status: event.status,
      recording: event.recording,
      motionDetected: event.motion_detected,
      aiEventCount: Number(event.ai_event_count || 0),
      personCount: Number(event.person_count || 0),
      vehicleCount: Number(event.vehicle_count || 0),
      latencyMs: event.latency_ms,
      lastFrameAt: event.last_frame_at,
      lastEvent: event.last_event || "No recent event.",
      recommendedAction: event.recommended_action || "Continue CCTV monitoring.",
    }));

    const summary = {
      totalCameras: persistedCameras.length,
      online: persistedCameras.filter(c => c.status === "online").length,
      warning: persistedCameras.filter(c => c.status === "warning").length,
      offline: persistedCameras.filter(c => c.status === "offline").length,
      recording: persistedCameras.filter(c => c.recording).length,
      motionEvents: persistedCameras.filter(c => c.motionDetected).length,
      aiEvents: persistedCameras.reduce((sum, c) => sum + c.aiEventCount, 0),
      provider: persistedEvents?.[0]?.provider || result.provider,
    };

    return NextResponse.json({
      success: true,
      summary,
      cameras: persistedCameras,
      provider: summary.provider,
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