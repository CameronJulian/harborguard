import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildFleetOptimization } from "@/lib/fleet/optimizationEngine";
import { calculateHereRoutes } from "@/lib/routing/hereRouting";

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

    const optimization = await buildFleetOptimization(
      supabase,
      organizationId
    );

    const vehicle =
      optimization.summary?.bestCandidate ??
      optimization.candidates?.[0];

    if (!vehicle) {
      return NextResponse.json(
        { error: "No suitable vehicle available." },
        { status: 404 }
      );
    }

    if (!vehicle.latitude || !vehicle.longitude) {
      return NextResponse.json(
        { error: "Selected vehicle has no live location." },
        { status: 400 }
      );
    }

    const routing = await calculateHereRoutes(
      {
        lat: vehicle.latitude,
        lng: vehicle.longitude,
      },
      destination
    );

    const selectedRoute = routing.routes?.[0] ?? null;

    const missionRecord = {
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
    };

    const { data, error } = await supabase
      .from("dispatch_missions")
      .insert(missionRecord)
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
      {
        error: error.message || "Mission creation failed.",
      },
      {
        status:
          error.message === "Unauthorized"
            ? 401
            : 500,
      }
    );

  }
}
