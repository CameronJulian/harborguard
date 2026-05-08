import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getAccessToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie") || "";

  const cookieToken = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("sb-access-token="))
    ?.replace("sb-access-token=", "");

  return (
    authHeader?.replace("Bearer ", "") ||
    (cookieToken ? decodeURIComponent(cookieToken) : undefined)
  );
}

async function getOrganizationId(accessToken: string) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (error || !data?.organization_id) {
    throw new Error("Organization not found.");
  }

  return data.organization_id;
}

function calculateThreatProbability(params: {
  speed: number;
  openAlerts: number;
  criticalAlerts: number;
  isOffline: boolean;
  nearIncident: boolean;
}) {
  let score = 0;

  if (params.speed > 120) score += 30;
  else if (params.speed > 100) score += 20;
  else if (params.speed > 80) score += 10;

  score += params.openAlerts * 10;
  score += params.criticalAlerts * 20;

  if (params.isOffline) score += 15;
  if (params.nearIncident) score += 25;

  score = Math.min(score, 100);

  let level = "Low";

  if (score >= 75) level = "Critical";
  else if (score >= 50) level = "High";
  else if (score >= 25) level = "Medium";

  return {
    probability: score,
    level,
  };
}

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);

    if (!accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = await getOrganizationId(accessToken);

    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("organization_id", organizationId);

    if (vehiclesError) {
      return NextResponse.json(
        { error: vehiclesError.message },
        { status: 500 }
      );
    }

    const { data: incidents, error: incidentsError } = await supabase
      .from("road_incidents")
      .select("*")
      .eq("organization_id", organizationId);

    if (incidentsError) {
      return NextResponse.json(
        { error: incidentsError.message },
        { status: 500 }
      );
    }

    const predictions: any[] = [];

    for (const vehicle of vehicles || []) {
      const { data: latest } = await supabase
        .from("vehicle_locations")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!latest) continue;

      const { data: alerts } = await supabase
        .from("vehicle_alerts")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .eq("organization_id", organizationId)
        .eq("is_resolved", false);

      const openAlerts = alerts || [];

      const criticalAlerts = openAlerts.filter(
        (a) => a.severity === "critical"
      ).length;

      const lastSeen = latest.recorded_at
        ? new Date(latest.recorded_at).getTime()
        : 0;

      const minutesOffline = (Date.now() - lastSeen) / (1000 * 60);
      const isOffline = minutesOffline >= 15;

      let nearIncident = false;

      for (const incident of incidents || []) {
        const distance = getDistanceMeters(
          latest.latitude,
          latest.longitude,
          incident.latitude,
          incident.longitude
        );

        if (distance <= incident.radius_meters) {
          nearIncident = true;
          break;
        }
      }

      const prediction = calculateThreatProbability({
        speed: latest.speed_kmh || 0,
        openAlerts: openAlerts.length,
        criticalAlerts,
        isOffline,
        nearIncident,
      });

      predictions.push({
        vehicleId: vehicle.id,
        registrationNumber: vehicle.registration_number,
        nickname: vehicle.nickname,
        probability: prediction.probability,
        level: prediction.level,
        speed: latest.speed_kmh || 0,
        openAlerts: openAlerts.length,
        criticalAlerts,
        nearIncident,
        isOffline,
      });
    }

    return NextResponse.json({
      success: true,
      predictions,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message || "Prediction engine failed.",
      },
      { status: 500 }
    );
  }
}