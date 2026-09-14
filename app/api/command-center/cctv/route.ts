import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { loadCCTVCameras } from "@/lib/cctv/provider";

type CCTVSupabaseClient =
  Awaited<
    ReturnType<typeof requireOrganization>
  >["supabase"];

type PersistedCCTVEvent = {
  id: string;
  camera_name: string;
  vendor: string | null;
  provider: string | null;
  location: string | null;
  linked_vehicle_id: string | null;
  linked_vehicle: string | null;
  status: string;
  recording: boolean;
  motion_detected: boolean;
  ai_event_count: number | null;
  person_count: number | null;
  vehicle_count: number | null;
  latency_ms: number | null;
  last_frame_at: string | null;
  last_event: string | null;
  recommended_action: string | null;
  captured_at: string;
};

async function loadPersistedCCTVDashboard(
  supabase: CCTVSupabaseClient,
  organizationId: string,
  providerFallback: string,
  generatedAt: string
) {
  const {
    data: persistedEvents,
    error: eventsError,
  } = await supabase
    .from("cctv_events")
    .select("*")
    .eq(
      "organization_id",
      organizationId
    )
    .order(
      "captured_at",
      { ascending: false }
    )
    .limit(100);

  if (eventsError) {
    throw eventsError;
  }

  const persisted =
    (persistedEvents || []) as PersistedCCTVEvent[];

  const persistedCameras =
    persisted.map((event) => ({
      id: event.id,
      cameraName:
        event.camera_name,
      vendor:
        event.vendor ||
        event.provider ||
        "mock",
      location:
        event.location ||
        "Unknown location",
      linkedVehicleId:
        event.linked_vehicle_id,
      linkedVehicle:
        event.linked_vehicle ||
        "Unknown vehicle",
      status:
        event.status,
      recording:
        event.recording,
      motionDetected:
        event.motion_detected,
      aiEventCount:
        Number(
          event.ai_event_count || 0
        ),
      personCount:
        Number(
          event.person_count || 0
        ),
      vehicleCount:
        Number(
          event.vehicle_count || 0
        ),
      latencyMs:
        event.latency_ms,
      lastFrameAt:
        event.last_frame_at,
      lastEvent:
        event.last_event ||
        "No recent event.",
      recommendedAction:
        event.recommended_action ||
        "Continue CCTV monitoring.",
    }));

  const summary = {
    totalCameras:
      persistedCameras.length,
    online:
      persistedCameras.filter(
        (camera) =>
          camera.status === "online"
      ).length,
    warning:
      persistedCameras.filter(
        (camera) =>
          camera.status === "warning"
      ).length,
    offline:
      persistedCameras.filter(
        (camera) =>
          camera.status === "offline"
      ).length,
    recording:
      persistedCameras.filter(
        (camera) =>
          camera.recording
      ).length,
    motionEvents:
      persistedCameras.filter(
        (camera) =>
          camera.motionDetected
      ).length,
    aiEvents:
      persistedCameras.reduce(
        (sum, camera) =>
          sum + camera.aiEventCount,
        0
      ),
    provider:
      persisted[0]?.provider ||
      providerFallback,
  };

  return NextResponse.json({
    success: true,
    summary,
    cameras: persistedCameras,
    provider: summary.provider,
    generatedAt,
  });
}

export async function GET() {
  try {
    const {
      supabase,
      organizationId,
    } = await requireOrganization();

    const providerFallback =
      String(
        process.env.CCTV_PROVIDER ||
        "mock"
      ).toLowerCase();

    return await loadPersistedCCTVDashboard(
      supabase,
      organizationId,
      providerFallback,
      new Date().toISOString()
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to load CCTV monitoring.",
      },
      {
        status:
          error.message === "Unauthorized"
            ? 401
            : 500,
      }
    );
  }
}

export async function POST() {
  try {
    const {
      supabase,
      organizationId,
    } = await requireOrganization();

    const {
      data: vehicles,
      error,
    } = await supabase
      .from("vehicles")
      .select(
        "id, registration_number, nickname, is_active, created_at"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .order(
        "created_at",
        { ascending: false }
      )
      .limit(10);

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    const result =
      await loadCCTVCameras(
        vehicles || []
      );

    const rows =
      result.cameras.map(
        (camera) => ({
          organization_id:
            organizationId,
          camera_name:
            camera.cameraName,
          provider:
            result.provider,
          vendor:
            camera.vendor ||
            null,
          location:
            camera.location ||
            null,
          linked_vehicle_id:
            camera.linkedVehicleId ||
            null,
          linked_vehicle:
            camera.linkedVehicle ||
            null,
          status:
            camera.status,
          recording:
            camera.recording,
          motion_detected:
            camera.motionDetected,
          ai_event_count:
            camera.aiEventCount,
          person_count:
            camera.personCount,
          vehicle_count:
            camera.vehicleCount,
          latency_ms:
            camera.latencyMs,
          last_frame_at:
            camera.lastFrameAt,
          last_event:
            camera.lastEvent,
          recommended_action:
            camera.recommendedAction,
          raw_response:
            camera,
          captured_at:
            result.generatedAt,
        })
      );

    if (rows.length > 0) {
      const {
        error: insertError,
      } = await supabase
        .from("cctv_events")
        .insert(rows);

      if (insertError) {
        throw insertError;
      }
    }

    return await loadPersistedCCTVDashboard(
      supabase,
      organizationId,
      result.provider,
      result.generatedAt
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to refresh CCTV monitoring.",
      },
      {
        status:
          error.message === "Unauthorized"
            ? 401
            : 500,
      }
    );
  }
}