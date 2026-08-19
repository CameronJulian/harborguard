import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import {
  authorizeRoadUserVehicle,
} from "@/lib/fleet/authorizeRoadUserVehicle";

type StartTripBody = {
  vehicleId?: string;
  originPort?: string;
  destinationFishery?: string;
  originLatitude?: number;
  originLongitude?: number;
  destinationLatitude?: number;
  destinationLongitude?: number;
};

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, user, role } = await requireOrganization();

    const body = (await req.json()) as StartTripBody;

    const vehicleId = body.vehicleId;
    const originPort = body.originPort?.trim();
    const destinationFishery = body.destinationFishery?.trim();

    if (!vehicleId || !originPort || !destinationFishery) {
      return NextResponse.json(
        { error: "vehicleId, originPort, and destinationFishery are required." },
        { status: 400 }
      );
    }

    const vehicleAuthorization =
      await authorizeRoadUserVehicle({
        supabase,
        organizationId,
        userId: user.id,
        role,
        vehicleId,
      });

    if (!vehicleAuthorization.ok) {
      return NextResponse.json(
        { error: vehicleAuthorization.error },
        { status: vehicleAuthorization.status }
      );
    }

    const vehicle = vehicleAuthorization.vehicle;

    const { data: existingTrip, error: existingTripError } =
      await supabase
        .from("vehicle_trips")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .eq("organization_id", organizationId)
        .in("status", [
          "scheduled",
          "en_route_to_port",
          "collecting",
          "en_route_to_fishery",
          "emergency",
        ])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingTripError) {
      return NextResponse.json(
        { error: existingTripError.message },
        { status: 500 }
      );
    }

    if (existingTrip) {
      return NextResponse.json({
        success: true,
        reusedExistingTrip: true,
        message: "Existing open trip returned.",
        trip: existingTrip,
      });
    }

    const hasRouteCoords =
      typeof body.originLatitude === "number" &&
      typeof body.originLongitude === "number" &&
      typeof body.destinationLatitude === "number" &&
      typeof body.destinationLongitude === "number";

    const expectedRoute = hasRouteCoords
      ? {
          points: [
            {
              name: originPort,
              latitude: body.originLatitude,
              longitude: body.originLongitude,
            },
            {
              name: destinationFishery,
              latitude: body.destinationLatitude,
              longitude: body.destinationLongitude,
            },
          ],
        }
      : null;

    const { data: trip, error: tripError } = await supabase
      .from("vehicle_trips")
      .insert({
        vehicle_id: vehicleId,
        driver_id: vehicle.driver_id,
        origin_port: originPort,
        destination_fishery: destinationFishery,
        planned_departure: new Date().toISOString(),
        status: "scheduled",
        expected_route: expectedRoute,
        deviation_threshold_km: 3,
        organization_id: organizationId,
      })
      .select()
      .single();

    if (tripError) {
      return NextResponse.json({ error: tripError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Trip started successfully.",
      trip,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to start trip.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
