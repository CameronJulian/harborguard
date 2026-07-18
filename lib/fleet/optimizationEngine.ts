import { buildTrafficIntelligence } from "@/lib/traffic/intelligence";
import { loadWeather } from "@/lib/weather/provider";

const OFFLINE_MINUTES = 15;

export type DispatchTarget = {
  latitude: number;
  longitude: number;
};

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  originLatitude: number,
  originLongitude: number,
  targetLatitude: number,
  targetLongitude: number
) {
  const earthRadiusKm = 6371;

  const latitudeDifference = degreesToRadians(
    targetLatitude - originLatitude
  );

  const longitudeDifference = degreesToRadians(
    targetLongitude - originLongitude
  );

  const originLatitudeRadians =
    degreesToRadians(originLatitude);

  const targetLatitudeRadians =
    degreesToRadians(targetLatitude);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(originLatitudeRadians) *
      Math.cos(targetLatitudeRadians) *
      Math.sin(longitudeDifference / 2) ** 2;

  return (
    earthRadiusKm *
    2 *
    Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine)
    )
  );
}

function distancePenalty(distanceKm: number | null) {
  if (distanceKm === null) return 0;
  if (distanceKm <= 2) return 0;
  if (distanceKm <= 5) return 3;
  if (distanceKm <= 10) return 6;
  if (distanceKm <= 20) return 10;
  return 15;
}

export function rankFleetCandidatesForTarget(
  candidates: any[],
  target: DispatchTarget
) {
  return candidates
    .map((candidate) => {
      const latitude = Number(candidate.latitude);
      const longitude = Number(candidate.longitude);

      const hasValidLocation =
        Number.isFinite(latitude) &&
        Number.isFinite(longitude);

      const distanceKm = hasValidLocation
        ? calculateDistanceKm(
            latitude,
            longitude,
            target.latitude,
            target.longitude
          )
        : null;

      const targetDistancePenalty =
        distancePenalty(distanceKm);

      const targetAdjustedScore =
        candidate.status === "offline"
          ? candidate.score
          : Math.max(
              0,
              candidate.score - targetDistancePenalty
            );

      return {
        ...candidate,
        baseScore: candidate.score,
        score: targetAdjustedScore,
        distanceKm:
          distanceKm === null
            ? null
            : Number(distanceKm.toFixed(2)),
        distancePenalty: targetDistancePenalty,
        dispatchTarget: target,
      };
    })
    .sort((a, b) => b.score - a.score);
}

function minutesSince(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;

  return (Date.now() - new Date(value).getTime()) / (1000 * 60);
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

function scoreVehicle(
  location: any,
  alerts: any[],
  traffic: any,
  weather: any
) {
  let score = 100;

  const isOffline =
    minutesSince(location?.recorded_at) > OFFLINE_MINUTES;

  const speed = Number(location?.speed_kmh || 0);

  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === "critical"
  ).length;

  const highAlerts = alerts.filter(
    (alert) => alert.severity === "high"
  ).length;

  if (isOffline) score -= 40;
  if (criticalAlerts > 0) score -= criticalAlerts * 25;
  if (highAlerts > 0) score -= highAlerts * 15;
  if (speed < 3 && !isOffline) score -= 5;

  const trafficPenalty = Math.min(
    20,
    Math.round(Number(traffic?.riskScore || 0) / 10)
  );

  const weatherPenalty = weatherHealthPenalty(weather);

  score -= trafficPenalty;
  score -= weatherPenalty;

  return Math.max(0, Math.min(100, score));
}

function recommendation(score: number) {
  if (score >= 85) return "Best dispatch candidate.";
  if (score >= 70) return "Good dispatch candidate.";

  if (score >= 50) {
    return "Usable, but review alerts, traffic, and weather.";
  }

  return "Avoid assigning unless no alternatives are available.";
}

export async function buildFleetOptimization(
  supabase: any,
  organizationId: string,
  dispatchTarget?: DispatchTarget
) {
  const [
    vehiclesResult,
    locationsResult,
    alertsResult,
    tripsResult,
  ] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, nickname, registration_number")
      .eq("organization_id", organizationId),

    supabase
      .from("vehicle_locations")
      .select(
        "vehicle_id, latitude, longitude, speed_kmh, recorded_at"
      )
      .eq("organization_id", organizationId)
      .order("recorded_at", { ascending: false })
      .limit(1000),

    supabase
      .from("vehicle_alerts")
      .select(
        "id, vehicle_id, alert_type, severity, created_at"
      )
      .eq("organization_id", organizationId)
      .eq("is_resolved", false),

    supabase
      .from("vehicle_trips")
      .select("id, vehicle_id, status")
      .eq("organization_id", organizationId),
  ]);

  if (vehiclesResult.error) throw vehiclesResult.error;
  if (locationsResult.error) throw locationsResult.error;
  if (alertsResult.error) throw alertsResult.error;
  if (tripsResult.error) throw tripsResult.error;

  const trafficCenter = (locationsResult.data || []).find(
    (location: any) =>
      location.latitude != null &&
      location.longitude != null
  );

  const trafficResult = await buildTrafficIntelligence(
    supabase,
    organizationId,
    {
      latitude: trafficCenter
        ? Number(trafficCenter.latitude)
        : undefined,
      longitude: trafficCenter
        ? Number(trafficCenter.longitude)
        : undefined,
      radiusMeters: 10000,
    }
  );

  const trafficSummary = trafficResult.summary;

  const trafficWarning =
    trafficResult.intelligence?.warnings?.[0] || null;

  const latestLocationByVehicle = new Map<string, any>();

  for (const location of locationsResult.data || []) {
    if (!latestLocationByVehicle.has(location.vehicle_id)) {
      latestLocationByVehicle.set(
        location.vehicle_id,
        location
      );
    }
  }

  const alertsByVehicle = new Map<string, any[]>();

  for (const alert of alertsResult.data || []) {
    const current =
      alertsByVehicle.get(alert.vehicle_id) || [];

    current.push(alert);

    alertsByVehicle.set(
      alert.vehicle_id,
      current
    );
  }

  const activeTripVehicleIds = new Set(
    (tripsResult.data || [])
      .filter((trip: any) =>
        [
          "active",
          "in_progress",
          "en_route_to_port",
          "collecting",
          "en_route_to_fishery",
          "emergency",
        ].includes(trip.status)
      )
      .map((trip: any) => trip.vehicle_id)
  );

  const weatherByVehicle = new Map<string, any>();
  const weatherByCoordinate = new Map<string, any>();
  const weatherWarnings: string[] = [];

  for (const vehicle of vehiclesResult.data || []) {
    const location =
      latestLocationByVehicle.get(vehicle.id);

    if (
      !location ||
      minutesSince(location.recorded_at) >
        OFFLINE_MINUTES
    ) {
      continue;
    }

    const latitude = Number(location.latitude);
    const longitude = Number(location.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      continue;
    }

    const coordinateKey =
      `${latitude.toFixed(3)},${longitude.toFixed(3)}`;

    let weatherResult =
      weatherByCoordinate.get(coordinateKey);

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
      } catch (error: any) {
        const warning =
          error?.message ||
          "Weather intelligence unavailable.";

        weatherWarnings.push(
          `${vehicle.registration_number || vehicle.id}: ${warning}`
        );

        continue;
      }
    }

    weatherByVehicle.set(
      vehicle.id,
      weatherResult.weather
    );
  }

  const baseCandidates = (vehiclesResult.data || [])
    .map((vehicle: any) => {
      const location =
        latestLocationByVehicle.get(vehicle.id);

      const alerts =
        alertsByVehicle.get(vehicle.id) || [];

      const weather =
        weatherByVehicle.get(vehicle.id) || null;

      const baseScore = scoreVehicle(
        location,
        alerts,
        trafficSummary,
        weather
      );

      const isBusy =
        activeTripVehicleIds.has(vehicle.id);

      const finalScore = isBusy
        ? Math.max(0, baseScore - 15)
        : baseScore;

      const isOffline =
        minutesSince(location?.recorded_at) >
        OFFLINE_MINUTES;

      const weatherStatus = weather
        ? "available"
        : isOffline
          ? "skipped_offline"
          : "unavailable";

      return {
        vehicleId: vehicle.id,
        vehicleName:
          vehicle.registration_number ||
          vehicle.nickname ||
          "Unknown vehicle",
        score: finalScore,
        status: isBusy
          ? "busy"
          : isOffline
            ? "offline"
            : "available",
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        speedKmh: Number(location?.speed_kmh || 0),
        openAlerts: alerts.length,
        activeTrip: isBusy,
        weather,
        weatherPenalty: weatherHealthPenalty(weather),
        weatherStatus,
        recommendation: recommendation(finalScore),
      };
        })
    .sort((a: any, b: any) => b.score - a.score);

  const candidates = dispatchTarget
    ? rankFleetCandidatesForTarget(
        baseCandidates,
        dispatchTarget
      )
    : baseCandidates;

  return {
    summary: {
      totalCandidates: candidates.length,
      available: candidates.filter(
        (candidate: any) =>
          candidate.status === "available"
      ).length,
      busy: candidates.filter(
        (candidate: any) =>
          candidate.status === "busy"
      ).length,
      offline: candidates.filter(
        (candidate: any) =>
          candidate.status === "offline"
      ).length,
      weatherAffected: candidates.filter(
        (candidate: any) =>
          candidate.weatherPenalty > 0
      ).length,
      bestCandidate: candidates[0] || null,
    },
    trafficIntelligence: trafficSummary,
    trafficWarning,
    weatherWarnings,
    candidates,
    generatedAt: new Date().toISOString(),
  };
}