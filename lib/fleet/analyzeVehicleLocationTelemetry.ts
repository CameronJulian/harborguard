import type { SupabaseClient } from "@supabase/supabase-js";
import {
  calculateHeadingDelta,
} from "@/lib/fleet/calculateHeadingDelta";
import {
  createGpsAnomalyAlert,
} from "@/lib/fleet/createGpsAnomalyAlert";
import {
  detectHarshBrakingCandidate,
} from "@/lib/fleet/detectHarshBrakingCandidate";
import {
  detectHarshCorneringCandidate,
} from "@/lib/fleet/detectHarshCorneringCandidate";
import {
  detectRapidAccelerationCandidate,
} from "@/lib/fleet/detectRapidAccelerationCandidate";
import {
  detectSustainedSpeedingCandidate,
} from "@/lib/fleet/detectSustainedSpeedingCandidate";
import {
  evaluateGpsMovement,
} from "@/lib/fleet/evaluateGpsMovement";
import {
  parseFleetTelemetryNumber,
} from "@/lib/fleet/parseUpdateLocationInput";
import {
  getDistanceMeters,
} from "@/lib/geo/getDistanceMeters";

type LatestVehicleLocation = {
  latitude: unknown;
  longitude: unknown;
  speed_kmh: unknown;
  heading: unknown;
  recorded_at: string;
};

type HarshBrakingCandidate = {
  previousSpeedKmh: number;
  currentSpeedKmh: number;
  speedDropKmh: number;
  intervalSeconds: number;
  decelerationMps2: number;
};

type RapidAccelerationCandidate = {
  previousSpeedKmh: number;
  currentSpeedKmh: number;
  speedIncreaseKmh: number;
  intervalSeconds: number;
  accelerationMps2: number;
};

type HarshCorneringCandidate = {
  previousHeading: number;
  currentHeading: number;
  headingChangeDegrees: number;
  speedKmh: number;
  intervalSeconds: number;
};

type SpeedingCandidate = {
  speedKmh: number;
  thresholdKmh: number;
  durationSeconds: number;
  consecutiveSamples: number;
};

type AnalyzeVehicleLocationTelemetryParams = {
  supabase: SupabaseClient;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  lastPoint: LatestVehicleLocation | null;
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  source: "mobile" | "hardware" | "manual";
  occurredAt: string;
  minimumDistanceMeters: number;
  maximumAllowedSpeedKmh: number;
  speedingLookbackSeconds: number;
  speedingMinimumSpeedKmh: number;
  speedingMinimumSamples: number;
  speedingMinimumDurationSeconds: number;
  harshBrakingMinimumPreviousSpeedKmh: number;
  harshBrakingMinimumSpeedDropKmh: number;
  harshBrakingMinimumIntervalSeconds: number;
  harshBrakingMaximumIntervalSeconds: number;
  harshBrakingMinimumDecelerationMps2: number;
  rapidAccelerationMinimumSpeedIncreaseKmh: number;
  rapidAccelerationMinimumIntervalSeconds: number;
  rapidAccelerationMaximumIntervalSeconds: number;
  rapidAccelerationMinimumAccelerationMps2: number;
  harshCorneringMinimumSpeedKmh: number;
  harshCorneringMinimumHeadingChangeDegrees: number;
  harshCorneringMinimumIntervalSeconds: number;
  harshCorneringMaximumIntervalSeconds: number;
};

type AnalyzeVehicleLocationTelemetryResult = {
  skipped: "jitter" | "gps_spike" | null;
  harshBrakingCandidate: HarshBrakingCandidate | null;
  rapidAccelerationCandidate: RapidAccelerationCandidate | null;
  harshCorneringCandidate: HarshCorneringCandidate | null;
  speedingCandidate: SpeedingCandidate | null;
};

export async function analyzeVehicleLocationTelemetry({
  supabase,
  organizationId,
  vehicleId,
  tripId,
  lastPoint,
  latitude,
  longitude,
  speedKmh,
  heading,
  source,
  occurredAt,
  minimumDistanceMeters,
  maximumAllowedSpeedKmh,
  speedingLookbackSeconds,
  speedingMinimumSpeedKmh,
  speedingMinimumSamples,
  speedingMinimumDurationSeconds,
  harshBrakingMinimumPreviousSpeedKmh,
  harshBrakingMinimumSpeedDropKmh,
  harshBrakingMinimumIntervalSeconds,
  harshBrakingMaximumIntervalSeconds,
  harshBrakingMinimumDecelerationMps2,
  rapidAccelerationMinimumSpeedIncreaseKmh,
  rapidAccelerationMinimumIntervalSeconds,
  rapidAccelerationMaximumIntervalSeconds,
  rapidAccelerationMinimumAccelerationMps2,
  harshCorneringMinimumSpeedKmh,
  harshCorneringMinimumHeadingChangeDegrees,
  harshCorneringMinimumIntervalSeconds,
  harshCorneringMaximumIntervalSeconds,
}: AnalyzeVehicleLocationTelemetryParams): Promise<AnalyzeVehicleLocationTelemetryResult> {
  let harshBrakingCandidate: HarshBrakingCandidate | null = null;
  let rapidAccelerationCandidate: RapidAccelerationCandidate | null = null;
  let harshCorneringCandidate: HarshCorneringCandidate | null = null;
  let speedingCandidate: SpeedingCandidate | null = null;

  if (!lastPoint) {
    return {
      skipped: null,
      harshBrakingCandidate,
      rapidAccelerationCandidate,
      harshCorneringCandidate,
      speedingCandidate,
    };
  }

  const previousLat =
    parseFleetTelemetryNumber(lastPoint.latitude);
  const previousLng =
    parseFleetTelemetryNumber(lastPoint.longitude);
  const previousHeading =
    parseFleetTelemetryNumber(lastPoint.heading);

  if (
    !Number.isFinite(previousLat) ||
    !Number.isFinite(previousLng)
  ) {
    return {
      skipped: null,
      harshBrakingCandidate,
      rapidAccelerationCandidate,
      harshCorneringCandidate,
      speedingCandidate,
    };
  }

  const distanceMeters =
    getDistanceMeters(
      {
        latitude: previousLat,
        longitude: previousLng,
      },
      {
        latitude,
        longitude,
      }
    );

  const intervalSeconds =
    (new Date(occurredAt).getTime() -
      new Date(lastPoint.recorded_at).getTime()) /
    1000;

  const normalizedHeadingDeltaDegrees =
    calculateHeadingDelta({
      previousHeading,
      currentHeading: heading,
    });

  const gpsMovement =
    evaluateGpsMovement({
      distanceMeters,
      intervalSeconds,
      minimumDistanceMeters,
      maximumAllowedSpeedKmh,
    });

  if (gpsMovement.outcome === "jitter") {
    return {
      skipped: "jitter",
      harshBrakingCandidate,
      rapidAccelerationCandidate,
      harshCorneringCandidate,
      speedingCandidate,
    };
  }

  if (gpsMovement.outcome === "gps_spike") {
    if (source !== "manual") {
      await createGpsAnomalyAlert({
        supabase,
        organizationId,
        vehicleId,
        tripId,
        previousLatitude: previousLat,
        previousLongitude: previousLng,
        rejectedLatitude: latitude,
        rejectedLongitude: longitude,
        distanceMeters,
        intervalSeconds,
        calculatedSpeedKmh:
          gpsMovement.calculatedSpeedKmh,
        maximumAllowedSpeedKmh,
      });
    }

    return {
      skipped: "gps_spike",
      harshBrakingCandidate,
      rapidAccelerationCandidate,
      harshCorneringCandidate,
      speedingCandidate,
    };
  }

  if (source !== "manual") {
    speedingCandidate =
      await detectSustainedSpeedingCandidate({
        supabase,
        organizationId,
        vehicleId,
        speedKmh,
        occurredAt,
        parseNumber: parseFleetTelemetryNumber,
        lookbackSeconds: speedingLookbackSeconds,
        minimumSpeedKmh: speedingMinimumSpeedKmh,
        minimumSamples: speedingMinimumSamples,
        minimumDurationSeconds:
          speedingMinimumDurationSeconds,
      });
  }

  const previousSpeedKmh =
    parseFleetTelemetryNumber(lastPoint.speed_kmh);

  harshBrakingCandidate =
    detectHarshBrakingCandidate({
      source,
      previousSpeedKmh,
      currentSpeedKmh: speedKmh,
      intervalSeconds,
      minimumPreviousSpeedKmh:
        harshBrakingMinimumPreviousSpeedKmh,
      minimumSpeedDropKmh:
        harshBrakingMinimumSpeedDropKmh,
      minimumIntervalSeconds:
        harshBrakingMinimumIntervalSeconds,
      maximumIntervalSeconds:
        harshBrakingMaximumIntervalSeconds,
      minimumDecelerationMps2:
        harshBrakingMinimumDecelerationMps2,
    });

  rapidAccelerationCandidate =
    detectRapidAccelerationCandidate({
      source,
      previousSpeedKmh,
      currentSpeedKmh: speedKmh,
      intervalSeconds,
      minimumSpeedIncreaseKmh:
        rapidAccelerationMinimumSpeedIncreaseKmh,
      minimumIntervalSeconds:
        rapidAccelerationMinimumIntervalSeconds,
      maximumIntervalSeconds:
        rapidAccelerationMaximumIntervalSeconds,
      minimumAccelerationMps2:
        rapidAccelerationMinimumAccelerationMps2,
    });

  harshCorneringCandidate =
    detectHarshCorneringCandidate({
      source,
      previousHeading,
      currentHeading: heading,
      normalizedHeadingDeltaDegrees,
      speedKmh,
      intervalSeconds,
      minimumSpeedKmh:
        harshCorneringMinimumSpeedKmh,
      minimumHeadingChangeDegrees:
        harshCorneringMinimumHeadingChangeDegrees,
      minimumIntervalSeconds:
        harshCorneringMinimumIntervalSeconds,
      maximumIntervalSeconds:
        harshCorneringMaximumIntervalSeconds,
    });

  return {
    skipped: null,
    harshBrakingCandidate,
    rapidAccelerationCandidate,
    harshCorneringCandidate,
    speedingCandidate,
  };
}
