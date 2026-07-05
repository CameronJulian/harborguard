import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { loadDashcams } from "@/lib/dashcam/provider";

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

    const summary = {
      totalCameras: cameras.length,
      online: cameras.filter((item) => item.status === "online").length,
      warning: cameras.filter((item) => item.status === "warning").length,
      offline: cameras.filter((item) => item.status === "offline").length,
      recording: cameras.filter((item) => item.recording).length,
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
      { error: error.message || "Failed to load dashcam monitoring." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
