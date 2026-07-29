import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { loadWeather } from "@/lib/weather/provider";
import type { WeatherRiskLevel } from "@/lib/weather/types";

type VehicleLocation = {
  vehicle_id: string;
  latitude: number | string | null;
  longitude: number | string | null;
  recorded_at: string | null;
};

type VehicleWeatherResult = {
  vehicleId: string;
  riskScore: number;
  riskLevel: WeatherRiskLevel;
  riskReasons: string[];
};

function hasValidCoordinates(location: VehicleLocation) {
  const latitude = Number(location.latitude);
  const longitude = Number(location.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    !(latitude === 0 && longitude === 0)
  );
}

export async function GET() {
  try {
    const { supabase, organizationId } =
      await requireOrganization();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      vehiclesResult,
      tripsResult,
      routeLogsResult,
      routeAssignmentsResult,
      locationsResult,
    ] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id")
        .eq("organization_id", organizationId),

      supabase
        .from("vehicle_trips")
        .select("id, status")
        .eq("organization_id", organizationId),

      supabase
        .from("route_safety_escalation_logs")
        .select(
          "id, risk_score, risk_level, created_at"
        )
        .eq("organization_id", organizationId)
        .gte("created_at", today.toISOString()),

      supabase
        .from("route_assignments")
        .select("id, status, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", today.toISOString()),

      supabase
        .from("vehicle_locations")
        .select(
          "vehicle_id, latitude, longitude, recorded_at"
        )
        .eq("organization_id", organizationId)
        .order("recorded_at", { ascending: false }),
    ]);

    if (vehiclesResult.error) {
      throw vehiclesResult.error;
    }

    if (tripsResult.error) {
      throw tripsResult.error;
    }

    if (routeLogsResult.error) {
      throw routeLogsResult.error;
    }

    if (routeAssignmentsResult.error) {
      throw routeAssignmentsResult.error;
    }

    if (locationsResult.error) {
      throw locationsResult.error;
    }

    const vehicles = vehiclesResult.data || [];
    const trips = tripsResult.data || [];
    const routeLogs = routeLogsResult.data || [];
    const routeAssignments =
      routeAssignmentsResult.data || [];

    const locations =
      (locationsResult.data || []) as VehicleLocation[];

    const panicAlerts: unknown[] = [];

    const activeVehicles = vehicles.length;

    const activeTrips = trips.filter((trip) =>
      [
        "active",
        "en_route_to_port",
        "in_progress",
      ].includes(String(trip.status))
    ).length;

    const highRiskRoutes = routeLogs.filter(
      (log) =>
        Number(log.risk_score) >= 80 ||
        String(log.risk_level).toUpperCase() ===
          "CRITICAL"
    ).length;

    const driversRerouted = routeAssignments.length;

    /*
     * Locations are ordered newest first, so retain only
     * the first valid location found for each vehicle.
     */
    const latestLocations = new Map<
      string,
      VehicleLocation
    >();

    for (const location of locations) {
      if (
        !latestLocations.has(location.vehicle_id) &&
        hasValidCoordinates(location)
      ) {
        latestLocations.set(
          location.vehicle_id,
          location
        );
      }
    }

    /*
     * Weather failures must not break the full operations
     * summary. Failed lookups are recorded as warnings.
     */
    const weatherLookupResults = await Promise.all(
      Array.from(latestLocations.entries()).map(
        async ([vehicleId, location]) => {
          try {
            const result = await loadWeather(
              Number(location.latitude),
              Number(location.longitude)
            );

            const weatherResult: VehicleWeatherResult = {
              vehicleId,
              riskScore: Number(
                result.weather.riskScore || 0
              ),
              riskLevel: result.weather.riskLevel,
              riskReasons:
                result.weather.riskReasons || [],
            };

            return {
              success: true as const,
              result: weatherResult,
            };
          } catch (error: unknown) {
            const message =
              error instanceof Error
                ? error.message
                : "Weather lookup failed.";

            console.error(
              `[fleet operations-summary] Weather lookup failed for vehicle ${vehicleId}:`,
              error
            );

            return {
              success: false as const,
              vehicleId,
              message,
            };
          }
        }
      )
    );

    const vehicleWeatherResults =
      weatherLookupResults
        .filter(
          (
            lookup
          ): lookup is {
            success: true;
            result: VehicleWeatherResult;
          } => lookup.success
        )
        .map((lookup) => lookup.result);

    const weatherWarnings =
      weatherLookupResults
        .filter(
          (
            lookup
          ): lookup is {
            success: false;
            vehicleId: string;
            message: string;
          } => !lookup.success
        )
        .map(
          (lookup) =>
            `Vehicle ${lookup.vehicleId}: ${lookup.message}`
        );

    const weatherRiskCounts: Record<
      WeatherRiskLevel,
      number
    > = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    for (const result of vehicleWeatherResults) {
      weatherRiskCounts[result.riskLevel] += 1;
    }

    const averageWeatherRisk =
      vehicleWeatherResults.length > 0
        ? Math.round(
            vehicleWeatherResults.reduce(
              (total, result) =>
                total + result.riskScore,
              0
            ) / vehicleWeatherResults.length
          )
        : 0;

    const vehiclesAtElevatedWeatherRisk =
      vehicleWeatherResults.filter((result) =>
        ["medium", "high", "critical"].includes(
          result.riskLevel
        )
      ).length;

    const vehiclesAtSevereWeatherRisk =
      vehicleWeatherResults.filter((result) =>
        ["high", "critical"].includes(
          result.riskLevel
        )
      ).length;

    return NextResponse.json({
      success: true,

      summary: {
        activeVehicles,
        activeTrips,
        highRiskRoutes,
        driversRerouted,
        panicAlertsToday: panicAlerts.length,

        weather: {
          averageRiskScore: averageWeatherRisk,
          vehiclesWithLocation:
            latestLocations.size,
          vehiclesWithWeatherData:
            vehicleWeatherResults.length,
          vehiclesAtElevatedRisk:
            vehiclesAtElevatedWeatherRisk,
          vehiclesAtSevereRisk:
            vehiclesAtSevereWeatherRisk,

          riskDistribution: {
            low: weatherRiskCounts.low,
            medium: weatherRiskCounts.medium,
            high: weatherRiskCounts.high,
            critical:
              weatherRiskCounts.critical,
          },

          affectedVehicles:
            vehicleWeatherResults,
          warnings: weatherWarnings,
        },
      },
    });
  } catch (error: unknown) {
    console.error(
      "Operations summary error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load fleet operations summary.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status:
          message === "Unauthorized" ? 401 : 500,
      }
    );
  }
}