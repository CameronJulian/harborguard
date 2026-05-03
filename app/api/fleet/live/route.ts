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
          .limit(50);

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

        return {
          id: vehicle.id,
          nickname: vehicle.nickname,
          registrationNumber: vehicle.registration_number,

          latitude: latest?.latitude,
          longitude: latest?.longitude,
          speedKmh: latest?.speed_kmh,
          heading: latest?.heading,
          lastSeen: latest?.recorded_at,

          route: routePoints,
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