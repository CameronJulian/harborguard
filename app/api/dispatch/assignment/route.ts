import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const optimizationResponse = await fetch(`${baseUrl}/api/fleet/optimization`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "x-harborguard-internal": "dispatch-assignment",
      },
    });

    const optimizationResult = await optimizationResponse.json();

    if (!optimizationResponse.ok) {
      return NextResponse.json(
        { error: optimizationResult.error || "Failed to load fleet optimization." },
        { status: 502 }
      );
    }

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

    const routeResponse = await fetch(`${baseUrl}/api/route-safety/reroute`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "x-harborguard-internal": "dispatch-assignment",
      },
      body: JSON.stringify({
        origin: {
          lat: bestCandidate.latitude,
          lng: bestCandidate.longitude,
        },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
        },
      }),
    });

    const routeResult = await routeResponse.json();

    if (!routeResponse.ok) {
      return NextResponse.json(
        { error: routeResult.error || "Failed to generate dispatch route." },
        { status: 502 }
      );
    }

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
