import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { requirePremiumAccess } from "@/lib/require-premium";
import { ratelimit } from "@/lib/ratelimit";

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

  return { probability: score, level };
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
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
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "anonymous";

    const { success } = await ratelimit.limit(`predict-threats:${ip}`);

    if (!success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { supabase, organizationId } = await requireOrganization();

    const premium = await requirePremiumAccess(organizationId);

    if (!premium.allowed) {
      return NextResponse.json(
        { error: "Professional subscription required for predictive AI." },
        { status: 403 }
      );
    }

    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("organization_id", organizationId);

    if (vehiclesError) {
      return NextResponse.json({ error: vehiclesError.message }, { status: 500 });
    }

    const vehicleIds = (vehicles || []).map((vehicle) => vehicle.id);

    if (vehicleIds.length === 0) {
      return NextResponse.json({ success: true, predictions: [] });
    }

    const [
      incidentsResult,
      geofencesResult,
      locationsResult,
      alertsResult,
    ] = await Promise.all([
      supabase
        .from("road_incidents")
        .select("*")
        .eq("organization_id", organizationId),

      supabase
        .from("geofences")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("is_active", true),

      supabase
        .from("vehicle_locations")
        .select("*")
        .in("vehicle_id", vehicleIds)
        .order("recorded_at", { ascending: false })
        .limit(vehicleIds.length * 5),

      supabase
        .from("vehicle_alerts")
        .select("*")
        .in("vehicle_id", vehicleIds)
        .eq("organization_id", organizationId)
        .eq("is_resolved", false),
    ]);

    if (incidentsResult.error) {
      return NextResponse.json({ error: incidentsResult.error.message }, { status: 500 });
    }

    if (geofencesResult.error) {
      return NextResponse.json({ error: geofencesResult.error.message }, { status: 500 });
    }

    if (locationsResult.error) {
      return NextResponse.json({ error: locationsResult.error.message }, { status: 500 });
    }

    if (alertsResult.error) {
      return NextResponse.json({ error: alertsResult.error.message }, { status: 500 });
    }

    const latestByVehicle = new Map<string, any>();

    for (const location of locationsResult.data || []) {
      if (!latestByVehicle.has(location.vehicle_id)) {
        latestByVehicle.set(location.vehicle_id, location);
      }
    }

    const alertsByVehicle = new Map<string, any[]>();

    for (const alert of alertsResult.data || []) {
      const existing = alertsByVehicle.get(alert.vehicle_id) || [];
      existing.push(alert);
      alertsByVehicle.set(alert.vehicle_id, existing);
    }

    const predictions: any[] = [];

    for (const vehicle of vehicles || []) {
      const latest = latestByVehicle.get(vehicle.id);
      if (!latest) continue;

      const openAlerts = alertsByVehicle.get(vehicle.id) || [];
      const criticalAlerts = openAlerts.filter(
        (alert) => alert.severity === "critical"
      ).length;

      const lastSeen = latest.recorded_at
        ? new Date(latest.recorded_at).getTime()
        : 0;

      const minutesOffline = (Date.now() - lastSeen) / (1000 * 60);
      const isOffline = minutesOffline >= 15;

      let nearIncident = false;
      let predictedGeofenceRisk = 0;

      for (const zone of geofencesResult.data || []) {
        const distance = getDistanceMeters(
          latest.latitude,
          latest.longitude,
          zone.center_lat,
          zone.center_lng
        );

        const speed = latest.speed_kmh || 0;

        if (distance <= zone.radius_meters * 1.5 && speed > 80) {
          predictedGeofenceRisk += 25;
        }

        if (distance <= zone.radius_meters * 1.2 && speed > 100) {
          predictedGeofenceRisk += 35;
        }

        if (distance <= zone.radius_meters && speed > 120) {
          predictedGeofenceRisk += 45;
        }
      }

      predictedGeofenceRisk = Math.min(100, predictedGeofenceRisk);
      const predictedBreach = predictedGeofenceRisk >= 60;

      for (const incident of incidentsResult.data || []) {
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

      const basePrediction = calculateThreatProbability({
        speed: latest.speed_kmh || 0,
        openAlerts: openAlerts.length,
        criticalAlerts,
        isOffline,
        nearIncident,
      });

      const adjustedProbability = Math.min(
        100,
        basePrediction.probability + predictedGeofenceRisk
      );

      let adjustedLevel = "Low";
      if (adjustedProbability >= 75) adjustedLevel = "Critical";
      else if (adjustedProbability >= 50) adjustedLevel = "High";
      else if (adjustedProbability >= 25) adjustedLevel = "Medium";

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
      { error: err.message || "Prediction engine failed." },
      { status: 500 }
    );
  }
}