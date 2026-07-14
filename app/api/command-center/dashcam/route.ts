import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { loadDashcams } from "@/lib/dashcam/provider";
import { analyseFrame } from "@/lib/vision/provider";

const MAX_AUTO_ANALYSES_PER_REFRESH = 1;

async function analyseNewDashcamSnapshots(params: {
  supabase: any;
  organizationId: string;
  cameras: any[];
}) {
  const candidates = params.cameras
    .filter(
      (camera) =>
        camera.status !== "offline" &&
        typeof camera.latestSnapshotUrl === "string" &&
        camera.latestSnapshotUrl.trim() !== ""
    )
    .slice(0, MAX_AUTO_ANALYSES_PER_REFRESH);

  const results: Array<{
    cameraId: string;
    status: "analysed" | "skipped" | "failed";
    detections?: number;
    message?: string;
  }> = [];

  for (const camera of candidates) {
    const imageUrl = camera.latestSnapshotUrl.trim();

    try {
      let existingSnapshot = null;

      if (camera.snapshotId) {
        const {
          data,
          error,
        } = await params.supabase
          .from("dashcam_events")
          .select("id")
          .eq(
            "organization_id",
            params.organizationId
          )
          .eq("camera_name", camera.cameraName)
          .contains("raw_response", {
            snapshotId: camera.snapshotId,
          })
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        existingSnapshot = data;
      } else {
        const {
          data,
          error,
        } = await params.supabase
          .from("vision_events")
          .select("id")
          .eq(
            "organization_id",
            params.organizationId
          )
          .eq("camera_name", camera.cameraName)
          .eq("image_url", imageUrl)
          .limit(1)
          .maybeSingle();

        if (error) {
          throw error;
        }

        existingSnapshot = data;
      }

      if (existingSnapshot) {
        results.push({
          cameraId: camera.id,
          status: "skipped",
          message: "Snapshot already analysed.",
        });

        continue;
      }

      const analysis = await analyseFrame({
        vehicleId: camera.vehicleId,
        vehicleName: camera.vehicleName,
        cameraName: camera.cameraName,
        imageUrl,
        metadata: {
          source: "automatic_dashcam_snapshot",
          dashcamProvider: camera.vendor,
          snapshotId: camera.snapshotId,
          receivedAt: new Date().toISOString(),
        },
      });

      const rows = analysis.detections.map((detection) => ({
        organization_id: params.organizationId,
        vehicle_id: camera.vehicleId || null,
        vehicle_name: camera.vehicleName || null,
        camera_name: camera.cameraName || null,
        provider: analysis.provider,
        event_type: detection.label,
        severity: detection.severity,
        confidence: detection.confidence,
        status:
          detection.confidence >= 85
            ? "review_required"
            : "monitoring",
        image_url: imageUrl,
        description: detection.description,
        recommended_action: detection.recommendedAction,
        raw_response: {
          ...(analysis.rawResponse || {}),
          source: "automatic_dashcam_snapshot",
          dashcamProvider: camera.vendor,
          snapshotId: camera.snapshotId,
        },
        detected_at: analysis.analysedAt,
      }));

      if (rows.length > 0) {
        const { error: insertError } =
          await params.supabase
            .from("vision_events")
            .insert(rows);

        if (insertError) {
          throw insertError;
        }
      }

      results.push({
        cameraId: camera.id,
        status: "analysed",
        detections: rows.length,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Automatic dashcam analysis failed.";

      console.error(
        `[dashcam-auto-vision] ${camera.cameraName}:`,
        message
      );

      results.push({
        cameraId: camera.id,
        status: "failed",
        message,
      });
    }
  }

  return results;
}
export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, registration_number, nickname, tracker_device_id, is_active, created_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(25);

    if (vehiclesError) {
      return NextResponse.json({ error: vehiclesError.message }, { status: 500 });
    }

    const result = await loadDashcams(vehicles || []);
    const cameras = result.cameras;

    const automaticVision =
      await analyseNewDashcamSnapshots({
        supabase,
        organizationId,
        cameras,
      });

    const rows = cameras.map((camera) => ({
      organization_id: organizationId,
      vehicle_id: camera.vehicleId || null,
      vehicle_name: camera.vehicleName || null,
      camera_name: camera.cameraName || null,
      provider: result.provider,
      vendor: camera.vendor || null,
      status: camera.status,
      recording: camera.recording,
      storage_used_percent: camera.storageUsedPercent,
      last_heartbeat: camera.lastHeartbeat,
      last_clip_at: camera.lastClipAt,
      latest_clip_label: camera.latestClipLabel,
      ai_events: camera.aiEvents || [],
      raw_response: {
        ...camera,
        latestSnapshotUrl:
          camera.latestSnapshotUrl || null,
        snapshotId:
          camera.snapshotId || null,
      },
      captured_at: result.generatedAt,
    }));

    if (rows.length > 0) {
      const { error: insertError } = await supabase
        .from("dashcam_events")
        .insert(rows);

      if (insertError) {
        throw insertError;
      }
    }

    const { data: persistedEvents, error: eventsError } = await supabase
      .from("dashcam_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("captured_at", { ascending: false })
      .limit(100);

    if (eventsError) {
      throw eventsError;
    }

    const persistedCameras = (persistedEvents || []).map((event: any) => ({
      id: event.id,
      vehicleId: event.vehicle_id,
      vehicleName: event.vehicle_name || "Unknown vehicle",
      nickname: null,
      cameraName: event.camera_name || "Unknown camera",
      vendor: event.vendor || event.provider || "mock",
      status: event.status,
      recording: event.recording,
      storageUsedPercent: Number(event.storage_used_percent || 0),
      lastHeartbeat: event.last_heartbeat,
      lastClipAt: event.last_clip_at,
      latestClipLabel: event.latest_clip_label,
      aiEvents: Array.isArray(event.ai_events) ? event.ai_events : [],
    }));

    const {
      data: recentVisionRows,
      error: recentVisionError,
    } = await supabase
      .from("vision_events")
      .select(`
        id,
        vehicle_id,
        vehicle_name,
        camera_name,
        provider,
        event_type,
        severity,
        confidence,
        status,
        description,
        recommended_action,
        detected_at,
        incident_id,
        reviewed_at,
        reviewed_by,
        review_note
      `)
      .eq("organization_id", organizationId)
      .order("detected_at", { ascending: false })
      .limit(8);

    if (recentVisionError) {
      throw recentVisionError;
    }

    const recentVisionEvents = (
      recentVisionRows || []
    ).map((event: any) => ({
      id: event.id,
      vehicleId: event.vehicle_id,
      vehicleName:
        event.vehicle_name || "Unknown vehicle",
      cameraName:
        event.camera_name || "Unknown camera",
      provider:
        event.provider || "unknown",
      eventType:
        event.event_type || "vision_event",
      severity:
        event.severity || "low",
      confidence:
        Number(event.confidence || 0),
      status:
        event.status || "monitoring",
      description:
        event.description ||
        "Vision event detected.",
      recommendedAction:
        event.recommended_action ||
        "Review the detection.",
      detectedAt:
        event.detected_at,
      incidentId:
        event.incident_id || null,
      reviewedAt:
        event.reviewed_at || null,
      reviewedBy:
        event.reviewed_by || null,
      reviewNote:
        event.review_note || null,
    }));
    const summary = {
      totalCameras: persistedCameras.length,
      online: persistedCameras.filter((item) => item.status === "online").length,
      warning: persistedCameras.filter((item) => item.status === "warning").length,
      offline: persistedCameras.filter((item) => item.status === "offline").length,
      recording: persistedCameras.filter((item) => item.recording).length,
      provider: persistedEvents?.[0]?.provider || result.provider,

      totalVisionEvents: recentVisionEvents.length,

      reviewRequired: recentVisionEvents.filter(
        (event) => event.status === "review_required"
      ).length,

      reviewed: recentVisionEvents.filter(
        (event) => Boolean(event.reviewedAt)
      ).length,

      linkedIncidents: recentVisionEvents.filter(
        (event) => Boolean(event.incidentId)
      ).length,

      highConfidence: recentVisionEvents.filter(
        (event) => Number(event.confidence || 0) >= 85
      ).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      cameras: persistedCameras,
      recentVisionEvents,
      provider: summary.provider,
      automaticVision: {
        enabled: true,
        maximumPerRefresh:
          MAX_AUTO_ANALYSES_PER_REFRESH,
        candidates: cameras.filter(
          (camera) =>
            camera.status !== "offline" &&
            Boolean(camera.latestSnapshotUrl)
        ).length,
        results: automaticVision,
      },
      generatedAt: result.generatedAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load dashcam monitoring." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

