import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function statusForVehicle(vehicle: any, index: number) {
  if (!vehicle.is_active) return "offline";
  if (index % 5 === 0) return "warning";
  return "online";
}

function recordingForStatus(status: string) {
  if (status === "offline") return false;
  return true;
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

    const cameras = (vehicles || []).map((vehicle: any, index: number) => {
      const status = statusForVehicle(vehicle, index);
      const recording = recordingForStatus(status);

      return {
        id: `dashcam-${vehicle.id}`,
        vehicleId: vehicle.id,
        vehicleName: vehicle.registration_number || vehicle.id,
        nickname: vehicle.nickname || null,
        cameraName: `${vehicle.registration_number || "Vehicle"} Front Dashcam`,
        vendor: "HarborGuard DemoCam",
        status,
        recording,
        storageUsedPercent: status === "offline" ? 0 : Math.min(92, 35 + index * 7),
        lastHeartbeat: status === "offline" ? null : new Date(Date.now() - index * 7 * 60 * 1000).toISOString(),
        lastClipAt: recording ? new Date(Date.now() - index * 11 * 60 * 1000).toISOString() : null,
        latestClipLabel: recording ? `Road view clip ${index + 1}` : null,
        aiEvents: status === "warning" ? ["Camera health warning"] : [],
      };
    });

    const summary = {
      totalCameras: cameras.length,
      online: cameras.filter((item) => item.status === "online").length,
      warning: cameras.filter((item) => item.status === "warning").length,
      offline: cameras.filter((item) => item.status === "offline").length,
      recording: cameras.filter((item) => item.recording).length,
    };

    return NextResponse.json({
      success: true,
      summary,
      cameras,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load dashcam monitoring." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
