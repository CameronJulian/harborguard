import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, driver_id")
      .eq("id", vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: vehicleError?.message || "Vehicle not found." },
        { status: 404 }
      );
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
      })
      .select()
      .single();

    if (tripError) {
      return NextResponse.json(
        { error: tripError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Trip started successfully.",
      trip,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to start trip." },
      { status: 500 }
    );
  }
}