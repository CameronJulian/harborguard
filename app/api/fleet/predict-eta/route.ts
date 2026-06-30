import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const KMH_TO_MINUTES = 60;

function etaRecommendation(delay: number, trafficLevel: string) {
  if (trafficLevel === "critical" || delay >= 25) return "High traffic risk. Consider rerouting immediately.";
  if (trafficLevel === "high" || delay >= 15) return "Monitor traffic and prepare alternate route.";
  if (trafficLevel === "medium" || delay >= 8) return "Moderate delay expected. Monitor ETA.";
  return "Route operating normally.";
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

    const { data: locations } = await supabase
      .from("vehicle_locations")
      .select("*")
      .eq("organization_id", organizationId)
      .order("recorded_at", { ascending: false });

    let trafficSummary: any = null;
    let trafficWarning: string | null = null;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/traffic-intelligence`, {
        cache: "no-store",
        headers: {
          "x-harborguard-internal": "predictive-eta",
        },
      });

      const result = await response.json();

      if (response.ok) {
        trafficSummary = result.summary;
      } else {
        trafficWarning = result.error || "Traffic intelligence unavailable.";
      }
    } catch (trafficError: any) {
      trafficWarning = trafficError.message || "Traffic intelligence unavailable.";
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

      const baseMinutes =
        remainingDistance / Math.max(speed, 10) * KMH_TO_MINUTES;

      const trafficDelay =
        averageDelay +
        Math.round(averageCongestion / 10) +
        (speed < 20 ? 10 : 0);

      const incidentDelay =
        activeIncidents > 0 ? Math.min(20, activeIncidents * 3) : 0;

      const weatherDelay = 0;

      const predictedDelay =
        trafficDelay +
        incidentDelay +
        weatherDelay;

      const eta = new Date(
        Date.now() + (baseMinutes + predictedDelay) * 60000
      );

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
        estimatedArrival: eta,
        predictedDelayMinutes: predictedDelay,
        confidence: Math.max(55, 100 - predictedDelay),
        recommendation: etaRecommendation(predictedDelay, trafficRiskLevel),
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
