import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const activeStatuses = [
  "Assigned",
  "Accepted",
  "En Route",
  "Arrived",
  "In Progress",
];

export async function GET(request: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("dispatch_missions")
      .select(`
        *,
        incidents:incident_id (
          id,
          incident_code,
          severity,
          status,
          summary
        )
      `)
      .eq("organization_id", organizationId)
      .eq("assigned_vehicle_id", vehicleId)
      .in("status", activeStatuses)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
      currentMission: data?.[0] || null,
      missions: data || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load driver missions." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
