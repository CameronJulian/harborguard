import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STOP_SPEED_KMH = 3;
const STOP_MINUTES = 5;
const MIN_SLOW_POINTS = 3;

const MIN_DISTANCE_METERS = 5;
const MAX_ALLOWED_SPEED_KMH = 180;

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

function getDistanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dp = ((b.lat - a.lat) * Math.PI) / 180;
  const dl = ((b.lng - a.lng) * Math.PI) / 180;

  const x =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as UpdateLocationBody;

    const vehicleId = body.vehicleId;
    const tripId = body.tripId ?? null;
    const latitude = parseNumber(body.latitude);
    const longitude = parseNumber(body.longitude);
    const speedKmh = Number.isFinite(parseNumber(body.speedKmh)) ? parseNumber(body.speedKmh) : 0;
    const heading = Number.isFinite(parseNumber(body.heading)) ? parseNumber(body.heading) : 0;
    const source = body.source || "mobile";
    const requestedStatus = body.status;

    if (!vehicleId) {
      return NextResponse.json({ error: "vehicleId is required." }, { status: 400 });
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: "Valid latitude and longitude are required." }, { status: 400 });
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json({ error: "Latitude must be between -90 and 90." }, { status: 400 });
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "Longitude must be between -180 and 180." }, { status: 400 });
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

    const { data: lastPoint } = await supabase
      .from("vehicle_locations")
      .select("latitude, longitude, recorded_at")
      .eq("vehicle_id", vehicleId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPoint) {
      const previousLat = parseNumber(lastPoint.latitude);
      const previousLng = parseNumber(lastPoint.longitude);

      if (Number.isFinite(previousLat) && Number.isFinite(previousLng)) {
        const distance = getDistanceMeters(
          { lat: previousLat, lng: previousLng },
          { lat: latitude, lng: longitude }
        );

        const timeDiffSeconds =
          (new Date(now).getTime() - new Date(lastPoint.recorded_at).getTime()) / 1000;

        const calculatedSpeedKmh =
          timeDiffSeconds > 0 ? (distance / timeDiffSeconds) * 3.6 : 0;

        if (distance < MIN_DISTANCE_METERS) {
          return NextResponse.json({
            success: true,
            skipped: "jitter",
            message: "Location ignored because movement was too small.",
          });
        }

        if (calculatedSpeedKmh > MAX_ALLOWED_SPEED_KMH) {
          return NextResponse.json({
            success: true,
            skipped: "gps_spike",
            message: "Location ignored because it looked like a GPS spike.",
          });
        }
      }
    }

    const { error: locationError } = await supabase.from("vehicle_locations").insert({
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
      return NextResponse.json({ error: locationError.message }, { status: 500 });
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

    const activeTripId = activeTrip?.id || tripId || null;

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
        const updates: Record<string, string> = { status: requestedStatus };

        if (requestedStatus === "delivered") {
          updates.actual_arrival = now;
        }

        await supabase.from("vehicle_trips").update(updates).eq("id", activeTrip.id);
      }
    }

    if (speedKmh <= STOP_SPEED_KMH) {
      const since = new Date(Date.now() - STOP_MINUTES * 60 * 1000).toISOString();

      const { data: recentSlowPoints } = await supabase
        .from("vehicle_locations")
        .select("id")
        .eq("vehicle_id", vehicleId)
        .gte("recorded_at", since)
        .lte("speed_kmh", STOP_SPEED_KMH);

      if ((recentSlowPoints || []).length >= MIN_SLOW_POINTS) {
        const { data: openStop } = await supabase
          .from("vehicle_stops")
          .select("id")
          .eq("vehicle_id", vehicleId)
          .is("ended_at", null)
          .maybeSingle();

        if (!openStop) {
          await supabase.from("vehicle_stops").insert({
            vehicle_id: vehicleId,
            trip_id: activeTripId,
            latitude,
            longitude,
            started_at: since,
          });
        }
      }
    } else {
      const { data: openStop } = await supabase
        .from("vehicle_stops")
        .select("id, started_at")
        .eq("vehicle_id", vehicleId)
        .is("ended_at", null)
        .maybeSingle();

      if (openStop) {
        const durationSeconds = Math.floor(
          (Date.now() - new Date(openStop.started_at).getTime()) / 1000
        );

        await supabase
          .from("vehicle_stops")
          .update({
            ended_at: now,
            duration_seconds: durationSeconds,
          })
          .eq("id", openStop.id);
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
      activeTripId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update vehicle location." },
      { status: 500 }
    );
  }
}