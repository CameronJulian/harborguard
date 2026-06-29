import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const vendors = ["HarborGuard CCTV", "Axis Demo", "Hikvision Demo", "Milestone Demo"];
const locations = ["Depot entrance", "Main gate", "High-risk corridor", "Loading bay", "Route checkpoint", "Yard perimeter"];

function cameraStatus(index: number) {
  if (index % 6 === 0) return "offline";
  if (index % 4 === 0) return "warning";
  return "online";
}

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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const cameras = (vehicles || []).map((vehicle: any, index: number) => {
      const status = cameraStatus(index);
      const motionDetected = status !== "offline" && index % 2 === 0;
      const aiEventCount = status === "offline" ? 0 : index + 1;

      return {
        id: `cctv-${vehicle.id}-${index}`,
        cameraName: `${locations[index % locations.length]} CCTV ${index + 1}`,
        vendor: vendors[index % vendors.length],
        location: locations[index % locations.length],
        linkedVehicleId: vehicle.id,
        linkedVehicle: vehicle.registration_number || vehicle.id,
        status,
        recording: status !== "offline",
        motionDetected,
        aiEventCount,
        personCount: status === "offline" ? 0 : index % 5,
        vehicleCount: status === "offline" ? 0 : (index % 4) + 1,
        latencyMs: status === "offline" ? null : 180 + index * 35,
        lastFrameAt: status === "offline" ? null : new Date(Date.now() - index * 6 * 60 * 1000).toISOString(),
        lastEvent: motionDetected ? "Motion detected near monitored corridor." : "No recent motion event.",
        recommendedAction:
          status === "offline"
            ? "Check camera power, network path, or NVR connection."
            : motionDetected
            ? "Review motion event and correlate with fleet activity."
            : "Continue CCTV monitoring.",
      };
    });

    const summary = {
      totalCameras: cameras.length,
      online: cameras.filter((item) => item.status === "online").length,
      warning: cameras.filter((item) => item.status === "warning").length,
      offline: cameras.filter((item) => item.status === "offline").length,
      recording: cameras.filter((item) => item.recording).length,
      motionEvents: cameras.filter((item) => item.motionDetected).length,
      aiEvents: cameras.reduce((sum, item) => sum + item.aiEventCount, 0),
    };

    return NextResponse.json({
      success: true,
      summary,
      cameras,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load CCTV monitoring." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
