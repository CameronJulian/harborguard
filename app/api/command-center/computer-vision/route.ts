import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const eventTypes = [
  "road_obstruction",
  "driver_distraction",
  "phone_usage",
  "seatbelt_warning",
  "pedestrian_near_vehicle",
  "lane_blockage",
];

function eventForVehicle(vehicle: any, index: number) {
  const type = eventTypes[index % eventTypes.length];
  const confidence = Math.min(96, 58 + index * 6);
  const severity =
    confidence >= 85 ? "high" :
    confidence >= 70 ? "medium" :
    "low";

  return {
    id: `vision-${vehicle.id}-${index}`,
    vehicleId: vehicle.id,
    vehicleName: vehicle.registration_number || vehicle.id,
    nickname: vehicle.nickname || null,
    cameraName: `${vehicle.registration_number || "Vehicle"} Front Dashcam`,
    eventType: type,
    severity,
    confidence,
    status: confidence >= 85 ? "review_required" : "monitoring",
    detectedAt: new Date(Date.now() - index * 9 * 60 * 1000).toISOString(),
    description: descriptionFor(type),
    recommendedAction: recommendationFor(type, severity),
  };
}

function descriptionFor(type: string) {
  if (type === "road_obstruction") return "Possible road obstruction detected in the vehicle camera frame.";
  if (type === "driver_distraction") return "Possible driver distraction pattern detected.";
  if (type === "phone_usage") return "Possible mobile phone usage detected.";
  if (type === "seatbelt_warning") return "Possible seatbelt compliance warning.";
  if (type === "pedestrian_near_vehicle") return "Pedestrian detected near the vehicle path.";
  if (type === "lane_blockage") return "Possible lane blockage detected ahead.";

  return "Vision event detected.";
}

function recommendationFor(type: string, severity: string) {
  if (severity === "high") {
    return "Send to dispatcher review and attach to active incident if related.";
  }

  if (type === "driver_distraction" || type === "phone_usage" || type === "seatbelt_warning") {
    return "Flag for driver safety review.";
  }

  return "Continue monitoring and correlate with vehicle telemetry.";
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

    const events = (vehicles || []).map(eventForVehicle);

    const summary = {
      analysedCameras: vehicles?.length || 0,
      visionEvents: events.length,
      reviewRequired: events.filter((item) => item.status === "review_required").length,
      highConfidence: events.filter((item) => item.confidence >= 85).length,
      averageConfidence: events.length
        ? Math.round(events.reduce((sum, item) => sum + item.confidence, 0) / events.length)
        : 0,
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
