import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const radius = 6371e3;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) *
      Math.cos(lat2Rad) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { searchParams } = new URL(req.url);
    const latitude = Number(searchParams.get("lat"));
    const longitude = Number(searchParams.get("lng"));

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Valid lat and lng are required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("route_safety_alerts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const alerts = (data || [])
      .map((alert) => {
        const distance = distanceMeters(
          latitude,
          longitude,
          Number(alert.latitude),
          Number(alert.longitude)
        );

        return {
          ...alert,
          distance_meters: Math.round(distance),
          within_radius: distance <= Number(alert.radius_meters || 1000),
        };
      })
      .filter((alert) => alert.within_radius)
      .sort((a, b) => a.distance_meters - b.distance_meters);

    return NextResponse.json({ alerts });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
