import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { loadWeather } from "@/lib/weather/provider";

type LocationPoint = {
  vehicle_id: string;
  latitude: number | string | null;
  longitude: number | string | null;
  speed_kmh?: number | string | null;
  heading?: number | string | null;
  recorded_at?: string | null;
};

type VehicleStop = {
  vehicle_id: string;
  [key: string]: unknown;
};

type VehicleAlert = {
  id: string;
  vehicle_id: string;
  alert_type: string | null;
  severity: string | null;
  message: string | null;
  created_at: string | null;
};

type ActiveTrip = {
  id: string;
  vehicle_id: string;
  status: string;
  expected_route: unknown;
  origin_port: string | null;
  destination_fishery: string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;

  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return NaN;
}

function reduceRoute(points: [number, number][], step = 8) {
  return points.filter((_, index) => index % step === 0);
}

const OFFLINE_MINUTES = 15;

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

export async function GET() {
  try {
    const { supabase, organizationId } =
      await requireOrganization();

    const { data: vehicles, error: vehiclesError } =
      await supabase
        .from("vehicles")
        .select("id, nickname, registration_number")
        .eq("organization_id", organizationId);

    if (vehiclesError) {
      throw vehiclesError;
    }

    const vehicleList = vehicles || [];
    const vehicleIds = vehicleList.map((vehicle) => vehicle.id);

    if (vehicleIds.length === 0) {
      return NextResponse.json({ fleet: [] });
    }

    /*
     * Fetch enough recent records to build:
     * - the latest position for each vehicle;
     * - up to 50 recent route points per vehicle;
     * - up to 10 recent stops per vehicle.
     *
     * These are global safety limits. The records are grouped and limited
     * per vehicle below.
     */
    const locationLimit = Math.max(vehicleIds.length * 75, 250);
    const stopLimit = Math.max(vehicleIds.length * 15, 100);

    const [
      locationsResult,
      stopsResult,
      alertsResult,
      tripsResult,
    ] = await Promise.all([
      supabase
        .from("vehicle_locations")
        .select(
          "vehicle_id, latitude, longitude, speed_kmh, heading, recorded_at"
        )
        .in("vehicle_id", vehicleIds)
        .order("recorded_at", { ascending: false })
        .limit(locationLimit),

      supabase
        .from("vehicle_stops")
        .select("*")
        .in("vehicle_id", vehicleIds)
        .order("started_at", { ascending: false })
        .limit(stopLimit),

      supabase
        .from("vehicle_alerts")
        .select(
          "id, vehicle_id, alert_type, severity, message, created_at"
        )
        .in("vehicle_id", vehicleIds)
        .eq("is_resolved", false)
        .order("created_at", { ascending: false }),

      supabase
        .from("vehicle_trips")
        .select(`
          id,
          vehicle_id,
          status,
          expected_route,
          origin_port,
          destination_fishery,
          created_at
        `)
        .eq("organization_id", organizationId)
        .in("vehicle_id", vehicleIds)
        .in("status", [
          "scheduled",
          "en_route_to_port",
          "collecting",
          "en_route_to_fishery",
          "emergency"
        ])
        .order("created_at", { ascending: false }),
    ]);

    if (locationsResult.error) throw locationsResult.error;
    if (stopsResult.error) throw stopsResult.error;
    if (alertsResult.error) throw alertsResult.error;
    if (tripsResult.error) throw tripsResult.error;

    const locationsByVehicle =
      new Map<string, LocationPoint[]>();

    for (const location of locationsResult.data || []) {
      const points =
        locationsByVehicle.get(location.vehicle_id) || [];

      if (points.length < 50) {
        points.push(location as LocationPoint);
        locationsByVehicle.set(location.vehicle_id, points);
      }
    }

    const stopsByVehicle =
      new Map<string, VehicleStop[]>();

    for (const stop of stopsResult.data || []) {
      const stops =
        stopsByVehicle.get(stop.vehicle_id) || [];

      if (stops.length < 10) {
        stops.push(stop as VehicleStop);
        stopsByVehicle.set(stop.vehicle_id, stops);
      }
    }

    const alertsByVehicle =
      new Map<string, VehicleAlert[]>();

    for (const alert of alertsResult.data || []) {
      const alerts =
        alertsByVehicle.get(alert.vehicle_id) || [];

      alerts.push(alert as VehicleAlert);
      alertsByVehicle.set(alert.vehicle_id, alerts);
    }

    const activeTripByVehicle =
      new Map<string, ActiveTrip>();

    for (const trip of tripsResult.data || []) {
      if (!activeTripByVehicle.has(trip.vehicle_id)) {
        activeTripByVehicle.set(
          trip.vehicle_id,
          trip as ActiveTrip
        );
      }
    }

    const weatherByVehicle =
      new Map<string, any>();

    const weatherByCoordinate =
      new Map<string, any>();

    for (
      const [vehicleId, recentLocations]
      of locationsByVehicle.entries()
    ) {
      const latest = recentLocations[0];

      if (!latest) {
        continue;
      }

      if (
        minutesSince(latest.recorded_at) >=
        OFFLINE_MINUTES
      ) {
        continue;
      }

      const latitude =
        Number(latest.latitude);

      const longitude =
        Number(latest.longitude);

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
          weatherResult =
            await loadWeather(
              latitude,
              longitude
            );

          weatherByCoordinate.set(
            coordinateKey,
            weatherResult
          );
        }
        catch (error) {
          console.warn(
            `Weather unavailable for vehicle ${vehicleId}:`,
            error
          );

          continue;
        }
      }

      weatherByVehicle.set(
        vehicleId,
        weatherResult.weather
      );
    }

    const fleet = vehicleList.map((vehicle) => {
      /*
       * Locations were fetched newest first.
       * The first point is the current/latest position.
       * Reverse a copy so route rendering remains chronological.
       */
      const recentLocations =
        locationsByVehicle.get(vehicle.id) || [];

      const latest = recentLocations[0] || null;

      const routePoints = [...recentLocations]
        .reverse()
        .map((point) => {
          const latitude = toNumber(point.latitude);
          const longitude = toNumber(point.longitude);

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude)
          ) {
            return null;
          }

          if (
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ) {
            return null;
          }

          return [
            latitude,
            longitude,
          ] as [number, number];
        })
        .filter(
          (point): point is [number, number] =>
            point !== null
        );

      const stops = stopsByVehicle.get(vehicle.id) || [];
      const alerts = alertsByVehicle.get(vehicle.id) || [];
      const activeTrip =
        activeTripByVehicle.get(vehicle.id) || null;

      const weather =
        weatherByVehicle.get(vehicle.id);

      const weatherPenalty =
        weatherHealthPenalty(weather);

      const weatherStatus =
        weather
          ? "available"
          : latest &&
              minutesSince(latest.recorded_at) >=
                OFFLINE_MINUTES
            ? "skipped_offline"
            : "unavailable";

      const speedKmh = Number(latest?.speed_kmh || 0);

      const criticalAlertCount = alerts.filter(
        (alert) => alert.severity === "critical"
      ).length;

      const driverProfile = buildDriverProfile({
        speedKmh,
        alertCount: alerts.length,
        criticalAlertCount,
        stopCount: stops.length,
        routePointCount: routePoints.length,
      });

      return {
        id: vehicle.id,
        nickname: vehicle.nickname,
        registrationNumber: vehicle.registration_number,
        latitude: latest?.latitude ?? null,
        longitude: latest?.longitude ?? null,
        speedKmh: latest?.speed_kmh ?? null,
        heading: latest?.heading ?? null,
        lastSeen: latest?.recorded_at ?? null,

        activeTrip: activeTrip
          ? {
              id: activeTrip.id,
              status: activeTrip.status,
              expectedRoute: activeTrip.expected_route,
              originPort: activeTrip.origin_port,
              destinationFishery:
                activeTrip.destination_fishery,
            }
          : null,

        route: reduceRoute(routePoints, 8),
        stops,
        openAlerts: alerts,
        driverProfile,
        weather,
        weatherPenalty,
        weatherStatus,
      };
    });

    return NextResponse.json({ fleet });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load fleet.";

    const status = message === "Unauthorized" ? 401 : 500;

    console.error("Fleet live error:", error);

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
