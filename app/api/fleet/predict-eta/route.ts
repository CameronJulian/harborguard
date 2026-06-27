import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const KMH_TO_MINUTES = 60;

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

    const { data: incidents } = await supabase
      .from("road_incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    const latestLocation = new Map();

    for (const location of locations || []) {
      if (!latestLocation.has(location.vehicle_id)) {
        latestLocation.set(location.vehicle_id, location);
      }
    }

    const predictions = [];

    for (const trip of trips || []) {

      const location = latestLocation.get(trip.vehicle_id);

      if (!location) continue;

      const speed = Number(location.speed_kmh || 30);

      const remainingDistance =
        Number(location.remaining_distance_km || 20);

      const baseMinutes =
        remainingDistance / Math.max(speed,10) * KMH_TO_MINUTES;

      let trafficDelay = 0;
      let incidentDelay = 0;
      let weatherDelay = 0;

      if ((incidents || []).length > 0)
        incidentDelay += 8;

      if (speed < 20)
        trafficDelay += 10;

      const predictedDelay =
        trafficDelay +
        incidentDelay +
        weatherDelay;

      const eta =
        new Date(
          Date.now() +
          (baseMinutes + predictedDelay) * 60000
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

        confidence:
          Math.max(
            60,
            100 - predictedDelay
          ),

        recommendation:
          predictedDelay >= 20
            ? "Consider rerouting."
            : predictedDelay >= 10
            ? "Monitor traffic."
            : "Route operating normally."
      });

    }

    return NextResponse.json({
      success:true,
      predictions
    });

  } catch(err:any){

    return NextResponse.json(
      {
        error:
          err.message ??
          "Prediction failed."
      },
      {
        status:
          err.message==="Unauthorized"
            ?401
            :500
      }
    );

  }
}


