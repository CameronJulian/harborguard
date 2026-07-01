import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildMissionAssignment } from "@/lib/dispatch/missionAssignment";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data, error } = await supabase
      .from("dispatch_missions")
      .select(`
        *,
        vehicles:assigned_vehicle_id (
          id,
          registration_number,
          nickname
        ),
        drivers:assigned_driver_id (
          id,
          full_name
        ),
        incidents:incident_id (
          id,
          incident_code,
          severity,
          status,
          summary
        )
      `)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const missions = data || [];

    return NextResponse.json({
      success: true,
      summary: {
        total: missions.length,
        pending: missions.filter((m: any) => m.status === "Pending").length,
        assigned: missions.filter((m: any) => m.status === "Assigned").length,
        accepted: missions.filter((m: any) => m.status === "Accepted").length,
        enRoute: missions.filter((m: any) => m.status === "En Route").length,
        arrived: missions.filter((m: any) => m.status === "Arrived").length,
        completed: missions.filter((m: any) => m.status === "Completed").length,
        cancelled: missions.filter((m: any) => m.status === "Cancelled").length,
      },
      missions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load dispatch missions." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const body = await req.json();

    const {
      incidentId = null,
      destination,
      priority = "normal",
      missionType = "dispatch",
      notes = "",
    } = body;

    const result = await buildMissionAssignment(supabase, organizationId, {
      incidentId,
      destination,
      priority,
      missionType,
      notes,
    });

    const { data, error } = await supabase
      .from("dispatch_missions")
      .insert(result.dispatchMission)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mission: data,
      vehicle: result.vehicle,
      route: result.selectedRoute,
      recommendation: result.recommendation,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Mission creation failed." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
