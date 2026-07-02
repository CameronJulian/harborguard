import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { id } = await params;

    const { data: mission, error: missionError } = await supabase
      .from("dispatch_missions")
      .select("id, organization_id, status")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (missionError || !mission) {
      return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    }

    const { data: timeline, error } = await supabase
      .from("mission_timeline_events")
      .select(`
        id,
        event_type,
        title,
        detail,
        source,
        metadata,
        created_at
      `)
      .eq("organization_id", organizationId)
      .eq("mission_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      missionId: id,
      missionStatus: mission.status,
      count: timeline?.length || 0,
      timeline: timeline || [],
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load mission timeline." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}