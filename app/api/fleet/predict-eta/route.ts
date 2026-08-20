import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildTrafficIntelligence } from "@/lib/traffic/intelligence";
import { loadWeather } from "@/lib/weather/provider";
import { predictETA } from "@/lib/fleet/etaPrediction";

import {
  readHsppEvidenceForOperationalUse,
} from "@/lib/hspp/readHsppEvidenceForOperationalUse";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: trips, error: tripError } = await supabase
      .from("vehicle_trips")
      .select(`
        id,
        vehicle_id,
        status,
        vehicles (
          registration_number,
          nickname
        )
      `)
      .eq("organization_id", organizationId)
      .in("status", [
        "active",
        "in_progress",
        "en_route_to_port",
        "collecting",
      ]);

    if (tripError) {
      throw tripError;
    }

    const { data: locations, error: locationError } = await supabase
      .from("vehicle_locations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("recorded_at", { ascending: false });

    if (locationError) {
      throw locationError;
    }
    const latestLocation =
      new Map<string, any>();

    for (const location of locations || []) {
      if (
        !latestLocation.has(
          location.vehicle_id
        )
      ) {
        latestLocation.set(
          location.vehicle_id,
          location
        );
      }
    }

    const deniedHsppVehicleIds =
      new Set<string>();

    for (
      const [vehicleId, location]
      of latestLocation.entries()
    ) {
      const evidenceId =
        typeof location.hspp_evidence_id === "string"
          ? location.hspp_evidence_id.trim()
          : "";

      if (!evidenceId) {
        continue;
      }

      const operationalRead =
        await readHsppEvidenceForOperationalUse({
          supabase,
          organizationId,
          evidenceId,
        });

      if (!operationalRead.decision.allowed) {
        deniedHsppVehicleIds.add(
          vehicleId
        );
      }
    }

    const trafficCenter =
      Array.from(
        latestLocation.values()
      ).find(
        (location: any) =>
          !deniedHsppVehicleIds.has(
            location.vehicle_id
          ) &&
          location.latitude !== null &&
          location.latitude !== undefined &&
          location.longitude !== null &&
          location.longitude !== undefined
      );
    let trafficSummary: any = null;
    let trafficWarning: string | null = null;

    let weatherResult:
      | Awaited<ReturnType<typeof loadWeather>>
      | null = null;

    let weatherWarning: string | null = null;

    try {
      const traffic = await buildTrafficIntelligence(
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

      trafficSummary = traffic.summary;
      trafficWarning =
        traffic.intelligence?.warnings?.[0] || null;
    } catch (error: unknown) {
      trafficWarning =
        error instanceof Error
          ? error.message
          : "Traffic intelligence unavailable.";

      console.error(
        "[fleet predict-eta] Traffic intelligence lookup failed:",
        error
      );
    }

    if (trafficCenter) {
      try {
        weatherResult = await loadWeather(
          Number(trafficCenter.latitude),
          Number(trafficCenter.longitude)
        );
      } catch (error: unknown) {
        weatherWarning =
          error instanceof Error
            ? error.message
            : "Weather intelligence unavailable.";

        console.error(
          "[fleet predict-eta] Weather lookup failed:",
          error
        );
      }
    } else {
      weatherWarning =
        "Weather intelligence unavailable because no live vehicle location was found.";
    }
    const trafficRiskLevel =
      trafficSummary?.riskLevel || "unknown";

    const averageDelay = Number(
      trafficSummary?.averageDelay || 0
    );

    const averageCongestion = Number(
      trafficSummary?.averageCongestion || 0
    );

    const activeIncidents = Number(
      trafficSummary?.activeIncidents || 0
    );

    const trafficRiskScore = Number(
      trafficSummary?.riskScore || 0
    );

    const weatherRiskScore = Number(
      weatherResult?.weather.riskScore || 0
    );

    const weatherRiskLevel =
      weatherResult?.weather.riskLevel || "low";

    const predictions = [];

    for (const trip of trips || []) {

      if (
        deniedHsppVehicleIds.has(
          trip.vehicle_id
        )
      ) {
        continue;
      }

      const location = latestLocation.get(trip.vehicle_id);

      if (!location) {
        continue;
      }

      const speed = Number(location.speed_kmh || 30);

      const remainingDistance = Number(
        location.remaining_distance_km || 20
      );

      const prediction = predictETA({
        remainingKm: remainingDistance,
        speedKmh: speed,
        averageDelay,
        averageCongestion,
        activeIncidents,
        trafficRiskLevel,
        weatherRiskScore,
        weatherRiskLevel,
      });

      const vehicleRecord = Array.isArray(trip.vehicles)
        ? trip.vehicles[0]
        : trip.vehicles;

      predictions.push({
        tripId: trip.id,

        vehicle:
          vehicleRecord?.registration_number ??
          vehicleRecord?.nickname ??
          "Unknown",

        remainingDistanceKm: remainingDistance,
        currentSpeed: speed,

        estimatedArrival: prediction.estimatedArrival,
        baseMinutes: prediction.baseMinutes,
        totalMinutes: prediction.totalMinutes,

        predictedDelayMinutes:
          prediction.predictedDelay,

        trafficDelayMinutes:
          prediction.trafficDelay,

        incidentDelayMinutes:
          prediction.incidentDelay,

        weatherDelayMinutes:
          prediction.weatherDelay,

        confidence: prediction.confidence,
        recommendation: prediction.recommendation,

        trafficIntelligence: {
          riskLevel: trafficRiskLevel,
          riskScore: trafficRiskScore,
          averageCongestion,
          averageDelay,
          activeIncidents,
          warning: trafficWarning,
        },

        weatherIntelligence: weatherResult
          ? {
              provider: weatherResult.provider,
              riskScore:
                weatherResult.weather.riskScore,
              riskLevel:
                weatherResult.weather.riskLevel,
              riskReasons:
                weatherResult.weather.riskReasons,
              temperatureC:
                weatherResult.weather.temperatureC,
              windSpeedKph:
                weatherResult.weather.windSpeedKph,
              windGustKph:
                weatherResult.weather.windGustKph,
              precipitationMm:
                weatherResult.weather.precipitationMm,
              visibilityKm:
                weatherResult.weather.visibilityKm,
              observedAt:
                weatherResult.weather.observedAt,
            }
          : null,

        weatherWarning,
      });
    }

    return NextResponse.json({
      success: true,

      trafficIntelligence: trafficSummary,
      trafficWarning,

      weatherIntelligence: weatherResult,
      weatherWarning,

      predictions,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Prediction failed.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: message === "Unauthorized" ? 401 : 500,
      }
    );
  }
}
