import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type LocationPoint = {
  latitude: number | string | null;
  longitude: number | string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function cleanRoutePoints(route: LocationPoint[]) {
  return route
    .map((p) => {
      const lat = toNumber(p.latitude);
      const lng = toNumber(p.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

      return [lat, lng] as [number, number];
    })
    .filter((p): p is [number, number] => p !== null);
}

function reduceRoutePoints(points: [number, number][], maxPoints = 25) {
  if (points.length <= maxPoints) return points;

  const step = Math.ceil(points.length / maxPoints);
  const reduced = points.filter((_, index) => index % step === 0);

  const last = points[points.length - 1];
  const reducedLast = reduced[reduced.length - 1];

  if (last && reducedLast && (last[0] !== reducedLast[0] || last[1] !== reducedLast[1])) {
    reduced.push(last);
  }

  return reduced;
}

async function snapRouteToRoads(points: [number, number][]) {
  const apiKey = process.env.ORS_API_KEY;

  if (!apiKey || points.length < 2) {
    return points;
  }

  try {
    const reducedPoints = reduceRoutePoints(points);

    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: reducedPoints.map(([lat, lng]) => [lng, lat]),
          instructions: false,
          preference: "recommended",
        }),
      }
    );

    if (!response.ok) {
      return points;
    }

    const result = await response.json();

    const coordinates =
      result?.features?.[0]?.geometry?.coordinates || [];

    const snappedPoints = coordinates
      .map((point: [number, number]) => {
        const lng = toNumber(point[0]);
        const lat = toNumber(point[1]);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

        return [lat, lng] as [number, number];
      })
      .filter((p: [number, number] | null): p is [number, number] => p !== null);

    return snappedPoints.length > 1 ? snappedPoints : points;
  } catch {
    return points;
  }
}

export async function GET() {
  try {
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, nickname, registration_number");

    if (vehiclesError) {
      return NextResponse.json({ error: vehiclesError.message }, { status: 500 });
    }

    const fleet = await Promise.all(
      (vehicles || []).map(async (vehicle) => {
        const { data: latest } = await supabase
          .from("vehicle_locations")
          .select("*")
          .eq("vehicle_id", vehicle.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: route } = await supabase
          .from("vehicle_locations")
          .select("latitude, longitude")
          .eq("vehicle_id", vehicle.id)
          .order("recorded_at", { ascending: true })
          .limit(100);

        const { data: stops } = await supabase
          .from("vehicle_stops")
          .select("*")
          .eq("vehicle_id", vehicle.id)
          .order("started_at", { ascending: false })
          .limit(10);

        const rawRoutePoints = cleanRoutePoints(route || []);
        const snappedRoutePoints = await snapRouteToRoads(rawRoutePoints);

        return {
          id: vehicle.id,
          nickname: vehicle.nickname,
          registrationNumber: vehicle.registration_number,

          latitude: latest?.latitude,
          longitude: latest?.longitude,
          speedKmh: latest?.speed_kmh,
          heading: latest?.heading,
          lastSeen: latest?.recorded_at,

          route: snappedRoutePoints,
          rawRoute: rawRoutePoints,
          stops: stops || [],
        };
      })
    );

    return NextResponse.json({ fleet });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load fleet." },
      { status: 500 }
    );
  }
}