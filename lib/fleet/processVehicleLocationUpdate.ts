import {
  analyzeVehicleLocationTelemetry,
} from "@/lib/fleet/analyzeVehicleLocationTelemetry";
import {
  createVehicleLocation,
} from "@/lib/fleet/createVehicleLocation";
import {
  getActiveVehicleTrip,
} from "@/lib/fleet/getActiveVehicleTrip";
import {
  getLatestVehicleLocation,
} from "@/lib/fleet/getLatestVehicleLocation";
import {
  getVehicleForLocationUpdate,
} from "@/lib/fleet/getVehicleForLocationUpdate";
import {
  runTripStatusLifecycle,
  runPostLocationUpdateLifecycle,
} from "@/lib/fleet/runPostLocationUpdateLifecycle";
import {
  recordCrowdLocationQualityOutcome,
} from "@/lib/fleet/recordCrowdLocationQualityOutcome";
import type {
  ParsedUpdateLocationInput,
} from "@/lib/fleet/parseUpdateLocationInput";

const STOP_SPEED_KMH = 3;
const STOP_MINUTES = 5;
const MIN_SLOW_POINTS = 3;

const MIN_DISTANCE_METERS = 5;
const MAX_ALLOWED_SPEED_KMH = 180;

const HARSH_BRAKING_MIN_PREVIOUS_SPEED_KMH = 30;
const HARSH_BRAKING_MIN_SPEED_DROP_KMH = 20;
const HARSH_BRAKING_MIN_INTERVAL_SECONDS = 2;
const HARSH_BRAKING_MAX_INTERVAL_SECONDS = 15;
const HARSH_BRAKING_MIN_DECELERATION_MPS2 = 3;

const RAPID_ACCELERATION_MIN_SPEED_INCREASE_KMH = 20;
const RAPID_ACCELERATION_MIN_INTERVAL_SECONDS = 2;
const RAPID_ACCELERATION_MAX_INTERVAL_SECONDS = 15;
const RAPID_ACCELERATION_MIN_ACCELERATION_MPS2 = 3;

const HARSH_CORNERING_MIN_SPEED_KMH = 30;
const HARSH_CORNERING_MIN_HEADING_CHANGE_DEGREES = 45;
const HARSH_CORNERING_MIN_INTERVAL_SECONDS = 2;
const HARSH_CORNERING_MAX_INTERVAL_SECONDS = 15;

const SPEEDING_MIN_SPEED_KMH = 120;
const SPEEDING_MIN_DURATION_SECONDS = 30;
const SPEEDING_MIN_CONSECUTIVE_SAMPLES = 3;
const SPEEDING_LOOKBACK_SECONDS = 90;

export type ProcessVehicleLocationUpdateInput = {
  supabase: any;
  organizationId: string;
  location: ParsedUpdateLocationInput;
  hsppEvidenceId?: string | null;
};

export type ProcessVehicleLocationUpdateResult =
  | {
      ok: false;
      error: string;
      errorType: "vehicle_not_found" | "location_persistence";
    }
  | {
      ok: true;
      skipped: "jitter";
    }
  | {
      ok: true;
      skipped: "gps_spike";
    }
  | {
      ok: true;
      skipped: null;
      vehicle: {
        id: string;
        nickname: string | null;
        registrationNumber: string | null;
      };
      location: {
        latitude: number;
        longitude: number;
        speedKmh: number;
        heading: number;
        source: ParsedUpdateLocationInput["source"];
        recordedAt: string;
      };
      activeTripId: string | null;
    };

export async function processVehicleLocationUpdate({
  supabase,
  organizationId,
  location,
  hsppEvidenceId = null,
}: ProcessVehicleLocationUpdateInput): Promise<ProcessVehicleLocationUpdateResult> {
  const {
    vehicleId,
    tripId,
    latitude,
    longitude,
    speedKmh,
    heading,
    source,
    requestedStatus,
    recordedAt,
  } = location;

  const {
    vehicle,
    error: vehicleError,
  } = await getVehicleForLocationUpdate({
    supabase,
    organizationId,
    vehicleId,
  });

  if (vehicleError || !vehicle) {
    return {
      ok: false,
      error: vehicleError?.message || "Vehicle not found.",
      errorType: "vehicle_not_found",
    };
  }

  const occurredAt =
    recordedAt ?? new Date().toISOString();

  const lastPoint =
    await getLatestVehicleLocation({
      supabase,
      organizationId,
      vehicleId,
    });

  const telemetryAnalysis =
    await analyzeVehicleLocationTelemetry({
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
      minimumDistanceMeters:
        MIN_DISTANCE_METERS,
      maximumAllowedSpeedKmh:
        MAX_ALLOWED_SPEED_KMH,
      speedingLookbackSeconds:
        SPEEDING_LOOKBACK_SECONDS,
      speedingMinimumSpeedKmh:
        SPEEDING_MIN_SPEED_KMH,
      speedingMinimumSamples:
        SPEEDING_MIN_CONSECUTIVE_SAMPLES,
      speedingMinimumDurationSeconds:
        SPEEDING_MIN_DURATION_SECONDS,
      harshBrakingMinimumPreviousSpeedKmh:
        HARSH_BRAKING_MIN_PREVIOUS_SPEED_KMH,
      harshBrakingMinimumSpeedDropKmh:
        HARSH_BRAKING_MIN_SPEED_DROP_KMH,
      harshBrakingMinimumIntervalSeconds:
        HARSH_BRAKING_MIN_INTERVAL_SECONDS,
      harshBrakingMaximumIntervalSeconds:
        HARSH_BRAKING_MAX_INTERVAL_SECONDS,
      harshBrakingMinimumDecelerationMps2:
        HARSH_BRAKING_MIN_DECELERATION_MPS2,
      rapidAccelerationMinimumSpeedIncreaseKmh:
        RAPID_ACCELERATION_MIN_SPEED_INCREASE_KMH,
      rapidAccelerationMinimumIntervalSeconds:
        RAPID_ACCELERATION_MIN_INTERVAL_SECONDS,
      rapidAccelerationMaximumIntervalSeconds:
        RAPID_ACCELERATION_MAX_INTERVAL_SECONDS,
      rapidAccelerationMinimumAccelerationMps2:
        RAPID_ACCELERATION_MIN_ACCELERATION_MPS2,
      harshCorneringMinimumSpeedKmh:
        HARSH_CORNERING_MIN_SPEED_KMH,
      harshCorneringMinimumHeadingChangeDegrees:
        HARSH_CORNERING_MIN_HEADING_CHANGE_DEGREES,
      harshCorneringMinimumIntervalSeconds:
        HARSH_CORNERING_MIN_INTERVAL_SECONDS,
      harshCorneringMaximumIntervalSeconds:
        HARSH_CORNERING_MAX_INTERVAL_SECONDS,
    });

  if (telemetryAnalysis.skipped) {
    await recordCrowdLocationQualityOutcome({
      source,
      outcome: telemetryAnalysis.skipped,
      occurredAt,
    });

    if (requestedStatus === "delivered") {
      const activeTrip =
        await getActiveVehicleTrip({
          supabase,
          organizationId,
          vehicleId,
        });

      const activeTripId =
        activeTrip?.id || tripId || null;

      await runTripStatusLifecycle({
        supabase,
        organizationId,
        vehicleId,
        activeTrip,
        activeTripId,
        requestedStatus,
        occurredAt,
      });
    }

    return {
      ok: true,
      skipped: telemetryAnalysis.skipped,
    };
  }

  const {
    harshBrakingCandidate,
    rapidAccelerationCandidate,
    harshCorneringCandidate,
    speedingCandidate,
    roadSpeedLimitKmh,
    roadSpeedLimitResolvedAt,
    roadSpeedLimitResolvedLatitude,
    roadSpeedLimitResolvedLongitude,
  } = telemetryAnalysis;

  const {
    error: locationError,
  } = await createVehicleLocation({
    supabase,
    organizationId,
    vehicleId,
    tripId,
    latitude,
    longitude,
    speedKmh,
    heading,
    recordedAt: occurredAt,
    source,
    roadSpeedLimitKmh,
    roadSpeedLimitResolvedAt,
    roadSpeedLimitResolvedLatitude,
    roadSpeedLimitResolvedLongitude,
    hsppEvidenceId,
  });

  if (locationError) {
    return {
      ok: false,
      error: locationError.message,
      errorType: "location_persistence",
    };
  }

  await recordCrowdLocationQualityOutcome({
    source,
    outcome: "accepted",
    occurredAt,
  });

  const activeTrip =
    await getActiveVehicleTrip({
      supabase,
      organizationId,
      vehicleId,
    });

  const activeTripId =
    activeTrip?.id || tripId || null;

  await runPostLocationUpdateLifecycle({
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
    stopSpeedKmh: STOP_SPEED_KMH,
    stopMinutes: STOP_MINUTES,
    minimumSlowPoints: MIN_SLOW_POINTS,
    harshBrakingCandidate,
    rapidAccelerationCandidate,
    harshCorneringCandidate,
    speedingCandidate,
  });

  return {
    ok: true,
    skipped: null,
    vehicle: {
      id: vehicle.id,
      nickname: vehicle.nickname,
      registrationNumber:
        vehicle.registration_number,
    },
    location: {
      latitude,
      longitude,
      speedKmh,
      heading,
      source,
      recordedAt: occurredAt,
    },
    activeTripId,
  };
}
