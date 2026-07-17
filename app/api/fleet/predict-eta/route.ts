import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildTrafficIntelligence } from "@/lib/traffic/intelligence";
import { predictETA } from "@/lib/fleet/etaPrediction";
import { loadWeather } from "@/lib/weather/provider";

function calculateWeatherDelay(
  riskScore: number,
  riskLevel: string
) {
  const proportionalDelay = Math.round(
    Math.max(0, Math.min(100, riskScore)) * 0.2
  );

  if (riskLevel === "critical") {
    return Math.max(18, proportionalDelay);
  }

  if (riskLevel === "high") {
    return Math.max(10, proportionalDelay);
  }

  if (riskLevel === "medium") {
    return Math.max(4, proportionalDelay);
  }

  return proportionalDelay;
}

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
        "collecting"
      ]);

    if (tripError) throw tripError;

    const { data: locations, error: locationError } = await supabase
      .from("vehicle_locations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("recorded_at", { ascending: false });

    if (locationError) throw locationError;

    const trafficCenter = (locations || []).find(
      (location: any) => location.latitude && location.longitude
    );

    let trafficSummary: any = null;
    let trafficWarning: string | null = null;

    try {
      const traffic = await buildTrafficIntelligence(supabase, organizationId, {
        latitude: trafficCenter ? Number(trafficCenter.latitude) : undefined,
        longitude: trafficCenter ? Number(trafficCenter.longitude) : undefined,
        radiusMeters: 10000,
      });

      trafficSummary = traffic.summary;
      trafficWarning = traffic.intelligence?.warnings?.[0] || null;
    } catch (error: any) {
      trafficWarning = error.message || "Traffic intelligence unavailable.";
    }

    const latestLocation = new Map();

    for (const location of locations || []) {
      if (!latestLocation.has(location.vehicle_id)) {
        latestLocation.set(location.vehicle_id, location);
      }
    }

    const trafficRiskLevel = trafficSummary?.riskLevel || "unknown";
    const averageDelay = Number(trafficSummary?.averageDelay || 0);
    const averageCongestion = Number(trafficSummary?.averageCongestion || 0);
    const activeIncidents = Number(trafficSummary?.activeIncidents || 0);
    const riskScore = Number(trafficSummary?.riskScore || 0);

    const predictions = [];

    for (const trip of trips || []) {
      const location = latestLocation.get(trip.vehicle_id);

      if (!location) continue;

      const speed = Number(location.speed_kmh || 30);
      const remainingDistance = Number(location.remaining_distance_km || 20);

      let weatherIntelligence: any = null;
      let weatherWarning: string | null = null;
      let weatherDelayMinutes = 0;

      try {
        const weatherResult = await loadWeather(
          Number(location.latitude),
          Number(location.longitude)
        );

        const weather = weatherResult.weather;

        weatherDelayMinutes = calculateWeatherDelay(
          Number(weather.riskScore || 0),
          String(weather.riskLevel || "low")
        );

        weatherIntelligence = {
          provider: weatherResult.provider,
          observedAt: weather.observedAt,
          riskScore: weather.riskScore,
          riskLevel: weather.riskLevel,
          riskReasons: weather.riskReasons,
          visibilityKm: weather.visibilityKm,
          precipitationMm: weather.precipitationMm,
          windSpeedKph: weather.windSpeedKph,
          windGustKph: weather.windGustKph,
          delayMinutes: weatherDelayMinutes,
        };
      } catch (error: unknown) {
        weatherWarning =
          error instanceof Error
            ? error.message
            : "Weather intelligence unavailable.";

        console.error(
          "[predict ETA weather]",
          weatherWarning
        );
      }

      const prediction = predictETA({
        remainingKm: remainingDistance,
        speedKmh: speed,
        averageDelay,
        averageCongestion,
        activeIncidents,
        trafficRiskLevel,
        weatherDelayMinutes,
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
        predictedDelayMinutes: prediction.predictedDelay,
        trafficDelayMinutes: prediction.trafficDelay,
        incidentDelayMinutes: prediction.incidentDelay,
        weatherDelayMinutes: prediction.weatherDelay,
        confidence: prediction.confidence,
        recommendation: prediction.recommendation,
        trafficIntelligence: {
          riskLevel: trafficRiskLevel,
          riskScore,
          averageCongestion,
          averageDelay,
          activeIncidents,
          warning: trafficWarning,
        },
        weatherIntelligence,
        weatherWarning,
      });
    }

    return NextResponse.json({
      success: true,
      trafficIntelligence: trafficSummary,
      trafficWarning,
      predictions,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message ?? "Prediction failed.",
      },
      {
        status: err.message === "Unauthorized" ? 401 : 500,
      }
    );
  }
}
