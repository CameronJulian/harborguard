import {
  createHarshBrakingAlert,
} from "@/lib/fleet/createHarshBrakingAlert";
import {
  createHarshCorneringAlert,
} from "@/lib/fleet/createHarshCorneringAlert";
import {
  createRapidAccelerationAlert,
} from "@/lib/fleet/createRapidAccelerationAlert";
import {
  createSpeedingAlert,
} from "@/lib/fleet/createSpeedingAlert";
import type {
  HarshBrakingCandidate,
} from "@/lib/fleet/detectHarshBrakingCandidate";
import type {
  HarshCorneringCandidate,
} from "@/lib/fleet/detectHarshCorneringCandidate";
import type {
  RapidAccelerationCandidate,
} from "@/lib/fleet/detectRapidAccelerationCandidate";
import type {
  SpeedingCandidate,
} from "@/lib/fleet/detectSustainedSpeedingCandidate";

export type CreateLocationBehaviorAlertsInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  activeTripId: string | null;
  latitude: number;
  longitude: number;
  source: "mobile" | "hardware" | "manual";
  harshBrakingCandidate: HarshBrakingCandidate | null;
  rapidAccelerationCandidate:
    RapidAccelerationCandidate | null;
  harshCorneringCandidate:
    HarshCorneringCandidate | null;
  speedingCandidate: SpeedingCandidate | null;
};

export async function createLocationBehaviorAlerts(
  input: CreateLocationBehaviorAlertsInput
): Promise<void> {
  const {
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
  } = input;

  const resolvedTripId =
    activeTripId || tripId || null;

  if (harshBrakingCandidate) {
    await createHarshBrakingAlert({
      supabase,
      organizationId,
      vehicleId,
      tripId: resolvedTripId,
      latitude,
      longitude,
      candidate: harshBrakingCandidate,
      source,
    });
  }

  if (rapidAccelerationCandidate) {
    await createRapidAccelerationAlert({
      supabase,
      organizationId,
      vehicleId,
      tripId: resolvedTripId,
      latitude,
      longitude,
      candidate: rapidAccelerationCandidate,
      source,
    });
  }

  if (harshCorneringCandidate) {
    await createHarshCorneringAlert({
      supabase,
      organizationId,
      vehicleId,
      tripId: resolvedTripId,
      latitude,
      longitude,
      candidate: harshCorneringCandidate,
      source,
    });
  }

  if (speedingCandidate) {
    await createSpeedingAlert({
      supabase,
      organizationId,
      vehicleId,
      tripId: resolvedTripId,
      latitude,
      longitude,
      candidate: speedingCandidate,
      source,
    });
  }
}
