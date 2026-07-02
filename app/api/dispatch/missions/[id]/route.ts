import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import {
  createMissionTimelineEvent,
  missionStatusTimelineTitle,
} from "@/lib/dispatch/missionTimeline";

const transitions: Record<string, string[]> = {
  Pending: ["Assigned", "Cancelled"],
  Assigned: ["Accepted", "Cancelled"],
  Accepted: ["En Route", "Cancelled"],
  "En Route": ["Arrived", "Cancelled"],
  Arrived: ["In Progress", "Cancelled"],
  "In Progress": ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { supabase, organizationId, user } = await requireOrganization();
    const { id } = await params;
    const body = await req.json();
    const newStatus = body.status;

    if (!newStatus) {
      return NextResponse.json({ error: "status is required." }, { status: 400 });
    }

    const { data: mission, error } = await supabase
      .from("dispatch_missions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", id)
      .single();

    if (error || !mission) {
      return NextResponse.json({ error: "Mission not found." }, { status: 404 });
    }

    const allowed = transitions[mission.status] || [];

    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid transition from ${mission.status} to ${newStatus}.` },
        { status: 400 }
      );
    }

    const update: any = { status: newStatus };
    const now = new Date().toISOString();

    if (newStatus === "Assigned") update.assigned_at = now;
    if (newStatus === "Accepted") update.accepted_at = now;
    if (newStatus === "Arrived") update.arrived_at = now;
    if (newStatus === "Completed") update.completed_at = now;
    if (newStatus === "Cancelled") update.cancelled_at = now;

    const { data: updated, error: updateError } = await supabase
      .from("dispatch_missions")
      .update(update)
      .eq("organization_id", organizationId)
      .eq("id", id)
      .select()
      .single();

    if (updateError) throw updateError;

    await createMissionTimelineEvent(supabase, {
      organizationId,
      missionId: id,
      eventType: "status_change",
      title: missionStatusTimelineTitle(newStatus),
      detail: `Mission status changed from ${mission.status} to ${newStatus}.`,
      actorId: user?.id || null,
      source: "dispatch_mission_status",
      metadata: {
        fromStatus: mission.status,
        toStatus: newStatus,
        update,
      },
    });

    return NextResponse.json({
      success: true,
      mission: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Mission update failed." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
