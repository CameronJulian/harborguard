import {
  createLocationBehaviorAlerts,
  type CreateLocationBehaviorAlertsInput,
} from "@/lib/fleet/createLocationBehaviorAlerts";
import {
  updateActiveTripFromLocation,
  type ActiveTripFromLocation,
} from "@/lib/fleet/updateActiveTripFromLocation";
import {
  createCompletedTripOutcome,
} from "@/lib/fleet/createCompletedTripOutcome";
import {
  evaluateCompletedTripPrediction,
} from "@/lib/fleet/evaluateCompletedTripPrediction";
import {
  updateVehicleStopLifecycle,
} from "@/lib/fleet/updateVehicleStopLifecycle";
import { detectFleetRisks } from "@/lib/fleet/risk-detection";

export type RunPostLocationUpdateLifecycleInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  activeTrip: ActiveTripFromLocation | null;
  activeTripId: string | null;
  requestedStatus?: string;
  latitude: number;
  longitude: number;
  speedKmh: number;
  source: "mobile" | "hardware" | "manual";
  occurredAt: string;
  stopSpeedKmh: number;
  stopMinutes: number;
  minimumSlowPoints: number;
  harshBrakingCandidate:
    CreateLocationBehaviorAlertsInput["harshBrakingCandidate"];
  rapidAccelerationCandidate:
    CreateLocationBehaviorAlertsInput["rapidAccelerationCandidate"];
  harshCorneringCandidate:
    CreateLocationBehaviorAlertsInput["harshCorneringCandidate"];
  speedingCandidate:
    CreateLocationBehaviorAlertsInput["speedingCandidate"];
};

export type RunTripStatusLifecycleInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  activeTrip: ActiveTripFromLocation | null;
  activeTripId: string | null;
  requestedStatus?: string;
  occurredAt: string;
};

export async function runTripStatusLifecycle(
  input: RunTripStatusLifecycleInput
): Promise<void> {
  const {
    supabase,
    organizationId,
    vehicleId,
    activeTrip,
    activeTripId,
    requestedStatus,
    occurredAt,
  } = input;

  const tripUpdate = await updateActiveTripFromLocation({
    supabase,
    organizationId,
    activeTrip,
    requestedStatus,
    occurredAt,
  });

  if (
    activeTripId &&
    tripUpdate.updated &&
    tripUpdate.previousStatus !== "delivered" &&
    tripUpdate.nextStatus === "delivered"
  ) {
    const outcomeResult = await createCompletedTripOutcome({
      supabase,
      organizationId,
      vehicleId,
      tripId: activeTripId,
    });

    if (outcomeResult.skipped === true) {
      console.error(
        "Completed-trip outcome creation was skipped:",
        {
          organizationId,
          vehicleId,
          tripId: activeTripId,
        }
      );
    } else {
      try {
        await evaluateCompletedTripPrediction({
          supabase,
          organizationId,
          vehicleId,
          tripId: activeTripId,
        });
      } catch (evaluationError) {
        console.error(
          "Completed-trip prediction evaluation failed:",
          evaluationError
        );
      }
    }
  }
}

export async function runPostLocationUpdateLifecycle(
  input: RunPostLocationUpdateLifecycleInput
): Promise<void> {
  const {
    supabase,
    organizationId,
    vehicleId,
    tripId,
    activeTrip,
    activeTripId,
    requestedStatus,
    latitude,
    longitude,
    speedKmh,
    source,
    occurredAt,
    stopSpeedKmh,
    stopMinutes,
    minimumSlowPoints,
    harshBrakingCandidate,
    rapidAccelerationCandidate,
    harshCorneringCandidate,
    speedingCandidate,
  } = input;

  await createLocationBehaviorAlerts({
    supabase,
    organizationId,
    vehicleId,
    tripId,
    activeTripId,
    latitude,
    longitude,
    source,
    harshBrakingCandidate,
    rapidAccelerationCandidate,
    harshCorneringCandidate,
    speedingCandidate,
  });

  await runTripStatusLifecycle({
    supabase,
    organizationId,
    vehicleId,
    activeTrip,
    activeTripId,
    requestedStatus,
    occurredAt,
  });

  await updateVehicleStopLifecycle({
    supabase,
    organizationId,
    vehicleId,
    tripId: activeTripId,
    latitude,
    longitude,
    speedKmh,
    occurredAt,
    stopSpeedKmh,
    stopMinutes,
    minimumSlowPoints,
  });

  try {
    await detectFleetRisks({
      supabase,
      organizationId,
    });
  } catch (riskError) {
    console.error(
      "Automatic risk detection failed:",
      riskError
    );
  }
}
