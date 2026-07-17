import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildTrafficIntelligence } from "@/lib/traffic/intelligence";
import { loadWeather } from "@/lib/weather/provider";

const OFFLINE_MINUTES = 15;
const STOP_SPEED_KMH = 3;

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}

function minutesSince(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(value).getTime()) / (1000 * 60);
}

function trafficHealthPenalty(summary: any) {
  const riskScore = Number(summary?.riskScore || 0);
  const congestion = Number(summary?.averageCongestion || 0);
  const activeIncidents = Number(summary?.activeIncidents || 0);

  return Math.min(
    20,
    Math.round(riskScore / 10) +
      Math.round(congestion / 15) +
      Math.min(activeIncidents, 5)
  );
}

function weatherHealthPenalty(weather: any) {
  if (!weather) return 0;

  return Math.round(
    Math.min(
      25,
      (Number(weather.riskScore || 0) / 100) * 25
    )
  );
}
export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const [
      vehiclesResult,
      locationsResult,
      alertsResult,
      tripsResult,
      incidentsResult,
    ] = await Promise.all([
      supabase.from("vehicles").select("id, nickname, registration_number").eq("organization_id", organizationId),
      supabase.from("vehicle_locations").select("vehicle_id, latitude, longitude, speed_kmh, recorded_at").eq("organization_id", organizationId).order("recorded_at", { ascending: false }).limit(1000),
      supabase.from("vehicle_alerts").select("id, vehicle_id, alert_type, severity, created_at").eq("organization_id", organizationId).eq("is_resolved", false),
      supabase.from("vehicle_trips").select("id, vehicle_id, status").eq("organization_id", organizationId),
      supabase.from("incidents").select("id, severity, status, created_at").eq("organization_id", organizationId),
    ]);

    if (vehiclesResult.error) throw vehiclesResult.error;
    if (locationsResult.error) throw locationsResult.error;
    if (alertsResult.error) throw alertsResult.error;
    if (tripsResult.error) throw tripsResult.error;
    if (incidentsResult.error) throw incidentsResult.error;

    let trafficSummary: any = null;
    let trafficWarning: string | null = null;

    try {
      const trafficResult = await buildTrafficIntelligence(
        supabase,
        organizationId
      );

      trafficSummary = trafficResult.summary;
    } catch (trafficError: unknown) {
      trafficWarning =
        trafficError instanceof Error
          ? trafficError.message
          : "Traffic intelligence unavailable.";
    }

    const vehicles = vehiclesResult.data || [];
    const locations = locationsResult.data || [];
    const alerts = alertsResult.data || [];
    const trips = tripsResult.data || [];
    const incidents = incidentsResult.data || [];

    const latestLocationByVehicle = new Map<string, any>();

    for (const location of locations) {
      if (!latestLocationByVehicle.has(location.vehicle_id)) {
        latestLocationByVehicle.set(location.vehicle_id, location);
      }
    }
	
	const weatherByVehicle = new Map<string, any>();
const weatherByCoordinate = new Map<string, any>();
const weatherWarnings: string[] = [];

for (const [vehicleId, location] of latestLocationByVehicle.entries()) {
  if (minutesSince(location?.recorded_at) >= OFFLINE_MINUTES) {
    continue;
  }

  const latitude = Number(location?.latitude);
  const longitude = Number(location?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    continue;
  }

  const coordinateKey =
    `${latitude.toFixed(3)},${longitude.toFixed(3)}`;

  let weatherResult = weatherByCoordinate.get(coordinateKey);

  if (!weatherResult) {
    try {
      weatherResult = await loadWeather(
        latitude,
        longitude
      );

      weatherByCoordinate.set(
        coordinateKey,
        weatherResult
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Weather unavailable";

      weatherWarnings.push(
        `${vehicleId}: ${message}`
      );

      continue;
    }
  }

  weatherByVehicle.set(
    vehicleId,
    weatherResult.weather
  );
}

    const activeTripVehicleIds = new Set(
      trips
        .filter((trip: any) =>
          ["scheduled", "active", "in_progress", "en_route_to_port", "collecting", "en_route_to_fishery", "emergency"].includes(trip.status)
        )
        .map((trip: any) => trip.vehicle_id)
    );

    const alertsByVehicle = new Map<string, any[]>();

    for (const alert of alerts) {
      const current = alertsByVehicle.get(alert.vehicle_id) || [];
      current.push(alert);
      alertsByVehicle.set(alert.vehicle_id, current);
    }

    let online = 0;
    let offline = 0;
    let moving = 0;
    let stopped = 0;
    let busy = 0;
    let sos = 0;

    const vehicleHealth = vehicles.map((vehicle: any) => {
      const latest = latestLocationByVehicle.get(vehicle.id);
      const weather = weatherByVehicle.get(vehicle.id);
      const weatherPenalty = weatherHealthPenalty(weather);
      const openAlerts = alertsByVehicle.get(vehicle.id) || [];
      const criticalAlerts = openAlerts.filter((a) => a.severity === "critical");
      const highAlerts = openAlerts.filter((a) => a.severity === "high");
      const panicAlerts = openAlerts.filter((a) => a.alert_type === "panic");

      const isOffline = minutesSince(latest?.recorded_at) >= OFFLINE_MINUTES;
      const speed = toNumber(latest?.speed_kmh);
      const isMoving = !isOffline && speed > STOP_SPEED_KMH;
      const isStopped = !isOffline && !isMoving;
      const isBusy = activeTripVehicleIds.has(vehicle.id);
      const isSos = panicAlerts.length > 0;

      if (isOffline) offline += 1;
      else online += 1;

      if (isMoving) moving += 1;
      if (isStopped) stopped += 1;
      if (isBusy) busy += 1;
      if (isSos) sos += 1;

      let score = 100;

      if (isOffline) score -= 35;
      if (isSos) score -= 60;
      score -= criticalAlerts.length * 25;
      score -= highAlerts.length * 15;
      score -= Math.max(0, openAlerts.length - criticalAlerts.length - highAlerts.length) * 6;

      score -= weatherPenalty;

      score = Math.max(0, Math.min(100, score));

      let status = "Available";
      if (isSos) status = "SOS";
      else if (isOffline) status = "Offline";
      else if (isBusy) status = "Busy";

      let health = "Healthy";
      if (score < 50) health = "Critical";
      else if (score < 75) health = "Warning";

      return {
        id: vehicle.id,
        nickname: vehicle.nickname,
        registrationNumber: vehicle.registration_number,
        status,
        health,
        score,
        speedKmh: speed,
        lastSeen: latest?.recorded_at || null,
        openAlerts: openAlerts.length,
        criticalAlerts: criticalAlerts.length,
        highAlerts: highAlerts.length,
        weather,
        weatherPenalty,
      };
    });

    const criticalAlerts = alerts.filter((a: any) => a.severity === "critical").length;
    const highAlerts = alerts.filter((a: any) => a.severity === "high").length;
    const geofenceBreaches = alerts.filter((a: any) => String(a.alert_type || "").includes("geofence")).length;

    const openIncidents = incidents.filter((incident: any) =>
      ["Open", "Review", "Flagged"].includes(incident.status)
    ).length;

    const criticalIncidents = incidents.filter((incident: any) =>
      incident.severity === "Critical" && incident.status !== "Resolved"
    ).length;

    const averageVehicleScore =
      vehicleHealth.length > 0
        ? Math.round(vehicleHealth.reduce((total, vehicle) => total + vehicle.score, 0) / vehicleHealth.length)
        : 100;

    const affectedByWeather =
      vehicleHealth.filter(
        (vehicle: any) => vehicle.weatherPenalty > 0
      ).length;

    const severeWeatherVehicles =
      vehicleHealth.filter(
        (vehicle: any) =>
          vehicle.weather?.riskLevel === "high" ||
          vehicle.weather?.riskLevel === "critical"
      ).length;

    const trafficPenalty = trafficHealthPenalty(trafficSummary);

    let healthScore = averageVehicleScore;

    healthScore -= Math.min(criticalAlerts * 5, 25);
    healthScore -= Math.min(highAlerts * 3, 15);
    healthScore -= Math.min(openIncidents * 2, 15);
    healthScore -= Math.min(offline * 4, 20);
    healthScore -= Math.min(sos * 25, 50);
    healthScore -= trafficPenalty;

    healthScore = Math.max(0, Math.min(100, healthScore));

    let healthLevel = "Healthy";
    if (healthScore < 50) healthLevel = "Critical";
    else if (healthScore < 75) healthLevel = "Warning";

    return NextResponse.json({
      success: true,
      health: {
        healthScore,
        healthLevel,
        totalVehicles: vehicles.length,
        online,
        offline,
        moving,
        stopped,
        busy,
        available: Math.max(online - busy - sos, 0),
        sos,
        activeTrips: activeTripVehicleIds.size,
        openAlerts: alerts.length,
        criticalAlerts,
        highAlerts,
        openIncidents,
        criticalIncidents,
        geofenceBreaches,
        averageVehicleScore,
        trafficPenalty,
        trafficIntelligence: {
          riskScore: trafficSummary?.riskScore || 0,
          riskLevel: trafficSummary?.riskLevel || "unknown",
          averageCongestion: trafficSummary?.averageCongestion || 0,
          averageDelay: trafficSummary?.averageDelay || 0,
          activeIncidents: trafficSummary?.activeIncidents || 0,
          warning: trafficWarning,
        },
        weatherSummary: {
          affectedVehicles: affectedByWeather,
          severeWeatherVehicles,
          warnings: weatherWarnings,
        },
      },
      trafficIntelligence: trafficSummary,
      trafficWarning,
      vehicles: vehicleHealth.sort((a, b) => a.score - b.score),
    });
  } catch (error: any) {
    console.error("Fleet health error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to load fleet health." },
      { status: 500 }
    );
  }
}


