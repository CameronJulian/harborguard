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