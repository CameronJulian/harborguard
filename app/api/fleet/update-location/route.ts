import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type UpdateLocationBody = {
  vehicleId?: string;
  tripId?: string | null;
  latitude?: number | string;
  longitude?: number | string;
  speedKmh?: number | string;
  heading?: number | string;
  source?: "mobile" | "hardware" | "manual";
  status?:
    | "scheduled"
    | "en_route_to_port"
    | "collecting"
    | "en_route_to_fishery"
    | "delivered"
    | "cancelled"
    | "emergency";
};

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as UpdateLocationBody;

    const vehicleId = body.vehicleId;
    const tripId = body.tripId ?? null;
    const latitude = parseNumber(body.latitude);
    const longitude = parseNumber(body.longitude);
    const speedKmh = Number.isFinite(parseNumber(body.speedKmh))
      ? parseNumber(body.speedKmh)
      : 0;
    const heading = Number.isFinite(parseNumber(body.heading))
      ? parseNumber(body.heading)
      : 0;
    const source = body.source || "mobile";
    const requestedStatus = body.status;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required." },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: "Latitude must be between -90 and 90." },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: "Longitude must be between -180 and 180." },
        { status: 400 }
      );
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, is_active, nickname, registration_number")
      .eq("id", vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: vehicleError?.message || "Vehicle not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const { error: locationError } = await supabase
      .from("vehicle_locations")
      .insert({
        vehicle_id: vehicleId,
        trip_id: tripId,
        latitude,
        longitude,
        speed_kmh: speedKmh,
        heading,
        recorded_at: now,
        source,
      });

    if (locationError) {
      return NextResponse.json(
        { error: locationError.message },
        { status: 500 }
      );
    }

    const { data: activeTrip } = await supabase
      .from("vehicle_trips")
      .select("id, status")
      .eq("vehicle_id", vehicleId)
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

    if (activeTrip) {
      if (activeTrip.status === "scheduled") {
        await supabase
          .from("vehicle_trips")
          .update({
            status: requestedStatus || "en_route_to_port",
            actual_departure: now,
          })
          .eq("id", activeTrip.id);
      } else if (requestedStatus && requestedStatus !== activeTrip.status) {
        const updates: Record<string, string> = {
          status: requestedStatus,
        };

        if (requestedStatus === "delivered") {
          updates.actual_arrival = now;
        }

        await supabase
          .from("vehicle_trips")
          .update(updates)
          .eq("id", activeTrip.id);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Vehicle location updated successfully.",
      vehicle: {
        id: vehicle.id,
        nickname: vehicle.nickname,
        registrationNumber: vehicle.registration_number,
      },
      location: {
        latitude,
        longitude,
        speedKmh,
        heading,
        source,
        recordedAt: now,
      },
      activeTripId: activeTrip?.id || tripId || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update vehicle location." },
      { status: 500 }
    );
  }
}