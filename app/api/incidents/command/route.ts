import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const DEFAULT_ACTIONS = [
  "driver_contacted",
  "incident_confirmed",
  "supervisor_notified",
  "response_team_dispatched",
  "customer_notified",
  "evidence_reviewed",
  "incident_resolved",
];

export async function GET(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const incidentId = searchParams.get("incidentId");

    if (!incidentId) {
      const { data, error } = await supabase
        .from("incidents")
        .select("id, incident_code, severity, status, summary, created_at")
        .eq("organization_id", organizationId)
        .neq("status", "Resolved")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        incidents: data || [],
      });
    }

    const { data, error } = await supabase
      .from("incident_command_actions")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      actions: data || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load incident command data." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const body = await req.json();

    const incidentId = String(body.incidentId || "").trim();

    if (!incidentId) {
      return NextResponse.json({ error: "incidentId is required." }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("incident_command_actions")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("incident_id", incidentId)
      .limit(1);

    if (existing && existing.length > 0) {
      return NextResponse.json({
        success: true,
        created: false,
        message: "Incident command workflow already exists.",
      });
    }

    const rows = DEFAULT_ACTIONS.map((actionType) => ({
      organization_id: organizationId,
      incident_id: incidentId,
      action_type: actionType,
      status: "pending",
    }));

    const { data, error } = await supabase
      .from("incident_command_actions")
      .insert(rows)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      created: true,
      actions: data || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create incident command workflow." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { supabase, organizationId, user } = await requireOrganization();
    const body = await req.json();

    const actionId = String(body.actionId || "").trim();
    const status = String(body.status || "").trim();
    const note = body.note ? String(body.note) : null;

    if (!actionId || !status) {
      return NextResponse.json(
        { error: "actionId and status are required." },
        { status: 400 }
      );
    }

    const isComplete = status === "completed";

    const { data, error } = await supabase
      .from("incident_command_actions")
      .update({
        status,
        note,
        completed_by: isComplete ? user.id : null,
        completed_at: isComplete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", actionId)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      action: data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update incident command action." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}


