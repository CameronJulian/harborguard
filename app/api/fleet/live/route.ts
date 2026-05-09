import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

type LocationPoint = {
  latitude: number | string | null;
  longitude: number | string | null;
  speed_kmh?: number | string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function reduceRoute(points: [number, number][], step = 8) {
  return points.filter((_, i) => i % step === 0);
}

function buildDriverProfile(params: {
  speedKmh: number;
  alertCount: number;
  criticalAlertCount: number;
  stopCount: number;
  routePointCount: number;
}) {
  let score = 100;

  if (params.speedKmh > 120) score -= 35;
  else if (params.speedKmh > 100) score -= 25;
  else if (params.speedKmh > 80) score -= 12;

  score -= params.alertCount * 8;
  score -= params.criticalAlertCount * 18;
  score -= Math.min(params.stopCount * 3, 15);

  score = Math.max(0, Math.min(100, score));

  let riskLevel = "Low";
  if (score < 40) riskLevel = "Critical";
  else if (score < 60) riskLevel = "High";
  else if (score < 80) riskLevel = "Medium";

  const behaviorSummary =
    riskLevel === "Critical"
      ? "Driver behavior requires immediate operational review."
      : riskLevel === "High"
      ? "Driver shows elevated operational risk patterns."
      : riskLevel === "Medium"
      ? "Driver shows moderate risk indicators."
      : "Driver behavior currently appears stable.";

  return {
    driverScore: score,
    driverRiskLevel: riskLevel,
    behaviorSummary,
    indicators: {
      speedKmh: params.speedKmh,
      alertCount: params.alertCount,
      criticalAlertCount: params.criticalAlertCount,
      stopCount: params.stopCount,
      routePointCount: params.routePointCount,
    },
  };
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
    const { supabase, organizationId } = await requireOrganization();

    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, nickname, registration_number")
      .eq("organization_id", organizationId);

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
          .select("latitude, longitude, speed_kmh")
          .eq("vehicle_id", vehicle.id)
          .order("recorded_at", { ascending: true })
          .limit(200);

        const { data: stops } = await supabase
          .from("vehicle_stops")
          .select("*")
          .eq("vehicle_id", vehicle.id)
          .order("started_at", { ascending: false })
          .limit(10);

        const { data: openAlerts } = await supabase
          .from("vehicle_alerts")
          .select("id, alert_type, severity, message, created_at")
          .eq("vehicle_id", vehicle.id)
          .eq("is_resolved", false)
          .order("created_at", { ascending: false });

        const routePoints = (route || [])
          .map((p: LocationPoint) => {
            const lat = toNumber(p.latitude);
            const lng = toNumber(p.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

            return [lat, lng] as [number, number];
          })
          .filter((p): p is [number, number] => p !== null);

        const speedKmh = Number(latest?.speed_kmh || 0);
        const alerts = openAlerts || [];
        const criticalAlertCount = alerts.filter(
          (alert) => alert.severity === "critical"
        ).length;

        const driverProfile = buildDriverProfile({
          speedKmh,
          alertCount: alerts.length,
          criticalAlertCount,
          stopCount: stops?.length || 0,
          routePointCount: routePoints.length,
        });

        const snappedRoute = await snapToRoad(reduceRoute(routePoints, 8));

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
          openAlerts: alerts,
          driverProfile,
        };
      })
    );

    return NextResponse.json({ fleet });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load fleet.";
    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}