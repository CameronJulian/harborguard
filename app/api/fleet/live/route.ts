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

// 🔥 NEW: reduce number of points BEFORE snapping
function reduceRoute(points: [number, number][], step = 5) {
  return points.filter((_, i) => i % step === 0);
}

// 🔥 NEW: snap route to roads using ORS
async function snapToRoad(route: [number, number][]) {
  if (!process.env.ORS_API_KEY) return route;

  try {
    const response = await fetch(
      "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
      {
        method: "POST",
        headers: {
          Authorization: process.env.ORS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          coordinates: route.map(([lat, lng]) => [lng, lat]),
        }),
      }
    );

    const data = await response.json();

    const snapped =
      data?.features?.[0]?.geometry?.coordinates?.map(
        ([lng, lat]: [number, number]) => [lat, lng]
      ) || route;

    return snapped;
  } catch (err) {
    console.error("ORS snapping failed:", err);
    return route;
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
          .limit(200); // 👈 slightly higher buffer

        const { data: stops } = await supabase
          .from("vehicle_stops")
          .select("*")
          .eq("vehicle_id", vehicle.id)
          .order("started_at", { ascending: false })
          .limit(10);

        const routePoints = (route || [])
          .map((p: LocationPoint) => {
            const lat = toNumber(p.latitude);
            const lng = toNumber(p.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

            return [lat, lng] as [number, number];
          })
          .filter((p): p is [number, number] => p !== null);

        // 🔥 STEP 1: reduce points
        const reducedRoute = reduceRoute(routePoints, 5);

        // 🔥 STEP 2: snap to roads
        const snappedRoute = await snapToRoad(reducedRoute);

        return {
          id: vehicle.id,
          nickname: vehicle.nickname,
          registrationNumber: vehicle.registration_number,

          latitude: latest?.latitude,
          longitude: latest?.longitude,
          speedKmh: latest?.speed_kmh,
          heading: latest?.heading,
          lastSeen: latest?.recorded_at,

          route: snappedRoute,
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