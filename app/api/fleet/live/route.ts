import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ORGANIZATION_ID = "1fe53de7-8483-4767-a63e-3265e4dcb33d";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase environment variables.");
}

const supabase = createClient(supabaseUrl || "", serviceRoleKey || "");

type LocationPoint = {
  latitude: number | string | null;
  longitude: number | string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function reduceRoute(points: [number, number][], step = 8) {
  return points.filter((_, i) => i % step === 0);
}

async function snapToRoad(route: [number, number][]) {
  if (!process.env.ORS_API_KEY || route.length < 2) return route;

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

    if (!response.ok) {
      console.error("ORS snapping failed:", response.status, await response.text());
      return route;
    }

    const data = await response.json();

    return (
      data?.features?.[0]?.geometry?.coordinates?.map(
        ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
      ) || route
    );
  } catch (err) {
    console.error("ORS snapping failed:", err);
    return route;
  }
}

export async function GET() {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables." },
        { status: 500 }
      );
    }

    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, nickname, registration_number")
      .eq("organization_id", ORGANIZATION_ID);

    if (vehiclesError) {
      console.error("vehiclesError:", vehiclesError.message);
      return NextResponse.json({ error: vehiclesError.message }, { status: 500 });
    }

    const fleet = await Promise.all(
      (vehicles || []).map(async (vehicle) => {
        const { data: latest, error: latestError } = await supabase
          .from("vehicle_locations")
          .select("*")
          .eq("vehicle_id", vehicle.id)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestError) {
          console.error("latestError:", latestError.message);
        }

        const { data: route, error: routeError } = await supabase
          .from("vehicle_locations")
          .select("latitude, longitude")
          .eq("vehicle_id", vehicle.id)
          .order("recorded_at", { ascending: true })
          .limit(200);

        if (routeError) {
          console.error("routeError:", routeError.message);
        }

        const { data: stops, error: stopsError } = await supabase
          .from("vehicle_stops")
          .select("*")
          .eq("vehicle_id", vehicle.id)
          .order("started_at", { ascending: false })
          .limit(10);

        if (stopsError) {
          console.error("stopsError:", stopsError.message);
        }

        const routePoints = (route || [])
          .map((p: LocationPoint) => {
            const lat = toNumber(p.latitude);
            const lng = toNumber(p.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

            return [lat, lng] as [number, number];
          })
          .filter((p): p is [number, number] => p !== null);

        const reducedRoute = reduceRoute(routePoints, 8);
        const snappedRoute = await snapToRoad(reducedRoute);

        return {
          id: vehicle.id,
          nickname: vehicle.nickname,
          registrationNumber: vehicle.registration_number,

          latitude: latest?.latitude ?? null,
          longitude: latest?.longitude ?? null,
          speedKmh: latest?.speed_kmh ?? null,
          heading: latest?.heading ?? null,
          lastSeen: latest?.recorded_at ?? null,

          route: snappedRoute,
          stops: stops || [],
        };
      })
    );

    return NextResponse.json({ fleet });
  } catch (err: unknown) {
    console.error("Fleet live API failed:", err);

    const message = err instanceof Error ? err.message : "Failed to load fleet.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}