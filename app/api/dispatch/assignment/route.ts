import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildFleetOptimization } from "@/lib/fleet/optimizationEngine";
import { calculateHereRoutes } from "@/lib/routing/hereRouting";

export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const body = await req.json();
    const { incidentId, destination, priority = "normal", notes = "" } = body;

    if (!destination?.lat || !destination?.lng) {
      return NextResponse.json(
        { error: "destination.lat and destination.lng are required." },
        { status: 400 }
      );
    }

    const optimizationResult = await buildFleetOptimization(supabase, organizationId);

    const bestCandidate =
      optimizationResult.summary?.bestCandidate ||
      optimizationResult.candidates?.[0];

    if (!bestCandidate) {
      return NextResponse.json(
        { error: "No dispatch candidate available." },
        { status: 404 }
      );
    }

    if (!bestCandidate.latitude || !bestCandidate.longitude) {
      return NextResponse.json(
        { error: "Best candidate does not have a live location." },
        { status: 400 }
      );
    }

    const routeResult = await calculateHereRoutes(
      {
        lat: bestCandidate.latitude,
        lng: bestCandidate.longitude,
      },
      {
        lat: destination.lat,
        lng: destination.lng,
      }
    );

    const selectedRoute = routeResult.routes?.[0] || null;

    const assignment = {
      organization_id: organizationId,
      vehicle_id: bestCandidate.vehicleId,
      route_data: {
        provider: routeResult.provider || "unknown",
        destination,
        selectedRoute,
        alternatives: routeResult.routes || [],
        optimization: bestCandidate,
        priority,
        notes,
        incidentId: incidentId || null,
      },
      status: "assigned",
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("route_assignments")
      .insert(assignment)
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
      bestCandidate,
      selectedRoute,
      routeRecommendation: routeResult.recommendation,
      message: `Assigned ${bestCandidate.vehicleName} using Fleet Optimization and HERE Routing.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create dispatch assignment." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
