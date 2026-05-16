import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { requirePremiumAccess } from "@/lib/require-premium";







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
    const {
  supabase,
  organizationId,
} = await requireOrganization();

const premium =
  await requirePremiumAccess(
    organizationId
  );

if (!premium.allowed) {
  return NextResponse.json(
    {
      error:
        "Professional subscription required for predictive AI.",
    },
    { status: 403 }
  );
}

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
	  
	  let predictedGeofenceRisk = 0;
let predictedBreach = false;

const { data: geofences } = await supabase
  .from("geofences")
  .select("*")
  .eq("organization_id", organizationId)
  .eq("is_active", true);

for (const zone of geofences || []) {
  const distance = getDistanceMeters(
    latest.latitude,
    latest.longitude,
    zone.center_lat,
    zone.center_lng
  );

  const speed = latest.speed_kmh || 0;

  if (
    distance <= zone.radius_meters * 1.5 &&
    speed > 80
  ) {
    predictedGeofenceRisk += 25;
  }

  if (
    distance <= zone.radius_meters * 1.2 &&
    speed > 100
  ) {
    predictedGeofenceRisk += 35;
  }

  if (
    distance <= zone.radius_meters &&
    speed > 120
  ) {
    predictedGeofenceRisk += 45;
  }
}

predictedGeofenceRisk = Math.min(
  100,
  predictedGeofenceRisk
);

predictedBreach =
  predictedGeofenceRisk >= 60;
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

      const basePrediction =
  calculateThreatProbability({
    speed: latest.speed_kmh || 0,
    openAlerts: openAlerts.length,
    criticalAlerts,
    isOffline,
    nearIncident,
  });

const adjustedProbability = Math.min(
  100,
  basePrediction.probability +
    predictedGeofenceRisk
);

let adjustedLevel = "Low";

if (adjustedProbability >= 75)
  adjustedLevel = "Critical";
else if (adjustedProbability >= 50)
  adjustedLevel = "High";
else if (adjustedProbability >= 25)
  adjustedLevel = "Medium";

      predictions.push({
        vehicleId: vehicle.id,
        registrationNumber: vehicle.registration_number,
        nickname: vehicle.nickname,
probability: adjustedProbability,
level: adjustedLevel,
predictedGeofenceRisk,
predictedBreach,
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