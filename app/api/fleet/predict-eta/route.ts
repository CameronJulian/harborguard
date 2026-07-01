import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildTrafficIntelligence } from "@/lib/traffic/intelligence";
import { predictETA } from "@/lib/fleet/etaPrediction";

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

      const prediction = predictETA({
        remainingKm: remainingDistance,
        speedKmh: speed,
        averageDelay,
        averageCongestion,
        activeIncidents,
        trafficRiskLevel,
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
