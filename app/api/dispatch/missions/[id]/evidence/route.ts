import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { createMissionTimelineEvent } from "@/lib/dispatch/missionTimeline";

const allowedTypes = ["photo", "signature", "note", "barcode", "qr"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, organizationId, user } = await requireOrganization();
    const { id } = await params;
    const body = await req.json();

    const evidenceType = String(body.evidenceType || "note").toLowerCase();

    if (!allowedTypes.includes(evidenceType)) {
      return NextResponse.json({ error: "Invalid evidence type." }, { status: 400 });
    }

    const { data: mission, error: missionError } = await supabase
      .from("dispatch_missions")
      .select("id, organization_id, status")
      .eq("id", id)
      .eq("organization_id", organizationId)
      .single();

    if (missionError || !mission) {
      return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("mission_evidence")
      .insert({
        organization_id: organizationId,
        mission_id: id,
        uploaded_by: user?.id || null,
        evidence_type: evidenceType,
        file_url: body.fileUrl || null,
        file_path: body.filePath || null,
        signature_data: body.signatureData || null,
        notes: body.notes || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    await createMissionTimelineEvent(supabase, {
      organizationId,
      missionId: id,
      eventType: "evidence_added",
      title: `${evidenceType.charAt(0).toUpperCase()}${evidenceType.slice(1)} uploaded`,
      detail: body.notes || `${evidenceType} added to mission.`,
      actorId: user?.id || null,
      source: "mission_evidence",
      metadata: {
        evidenceId: data.id,
        evidenceType,
      },
    });

    return NextResponse.json({
      success: true,
      evidence: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save mission evidence." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}