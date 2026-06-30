import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildFleetOptimization } from "@/lib/fleet/optimizationEngine";
import { calculateHereRoutes } from "@/lib/routing/hereRouting";

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

    if (!destination?.lat || !destination?.lng) {
      return NextResponse.json(
        { error: "Destination coordinates are required." },
        { status: 400 }
      );
    }

    const optimization = await buildFleetOptimization(supabase, organizationId);
    const vehicle = optimization.summary?.bestCandidate ?? optimization.candidates?.[0];

    if (!vehicle) {
      return NextResponse.json({ error: "No suitable vehicle available." }, { status: 404 });
    }

    if (!vehicle.latitude || !vehicle.longitude) {
      return NextResponse.json({ error: "Selected vehicle has no live location." }, { status: 400 });
    }

    const routing = await calculateHereRoutes(
      { lat: vehicle.latitude, lng: vehicle.longitude },
      destination
    );

    const selectedRoute = routing.routes?.[0] ?? null;

    const { data, error } = await supabase
      .from("dispatch_missions")
      .insert({
        organization_id: organizationId,
        incident_id: incidentId,
        assigned_vehicle_id: vehicle.vehicleId,
        mission_type: missionType,
        priority,
        status: "Assigned",
        pickup_lat: vehicle.latitude,
        pickup_lng: vehicle.longitude,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        route_data: {
          optimization: vehicle,
          selectedRoute,
          alternatives: routing.routes,
        },
        notes,
        assigned_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      mission: data,
      vehicle,
      route: selectedRoute,
      recommendation: routing.recommendation,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Mission creation failed." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
