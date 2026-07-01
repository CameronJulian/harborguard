import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildMissionAssignment } from "@/lib/dispatch/missionAssignment";

export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const body = await req.json();
    const { incidentId = null, destination, priority = "normal", notes = "" } = body;

    const result = await buildMissionAssignment(supabase, organizationId, {
      incidentId,
      destination,
      priority,
      notes,
      missionType: "route_assignment",
    });

    const { data, error } = await supabase
      .from("route_assignments")
      .insert(result.routeAssignment)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to create dispatch assignment." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      assignment: data,
      bestCandidate: result.vehicle,
      selectedRoute: result.selectedRoute,
      routeRecommendation: result.recommendation,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create dispatch assignment." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
