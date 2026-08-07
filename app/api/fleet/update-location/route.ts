import { NextResponse } from "next/server";
import {
  parseUpdateLocationInput,
  type UpdateLocationBody,
} from "@/lib/fleet/parseUpdateLocationInput";
import {
  getVehicleForLocationUpdate,
} from "@/lib/fleet/getVehicleForLocationUpdate";
import {
  getLatestVehicleLocation,
} from "@/lib/fleet/getLatestVehicleLocation";
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
  runPostLocationUpdateLifecycle,
} from "@/lib/fleet/runPostLocationUpdateLifecycle";

import { requireOrganization, requireRole } from "@/lib/server-auth";










const STOP_SPEED_KMH = 3;
const STOP_MINUTES = 5;
const MIN_SLOW_POINTS = 3;

const MIN_DISTANCE_METERS = 5;
const MAX_ALLOWED_SPEED_KMH = 180;
const GPS_ANOMALY_COOLDOWN_MINUTES = 10;
const GPS_ANOMALY_INTELLIGENCE_SCORE = 60;

const HARSH_BRAKING_MIN_PREVIOUS_SPEED_KMH = 30;
const HARSH_BRAKING_MIN_SPEED_DROP_KMH = 20;
const HARSH_BRAKING_MIN_INTERVAL_SECONDS = 2;
const HARSH_BRAKING_MAX_INTERVAL_SECONDS = 15;
const HARSH_BRAKING_MIN_DECELERATION_MPS2 = 3;

const RAPID_ACCELERATION_MIN_SPEED_INCREASE_KMH = 20;
const RAPID_ACCELERATION_MIN_INTERVAL_SECONDS = 2;
const RAPID_ACCELERATION_MAX_INTERVAL_SECONDS = 15;
const RAPID_ACCELERATION_MIN_ACCELERATION_MPS2 = 3;
const RAPID_ACCELERATION_COOLDOWN_MINUTES = 10;
const RAPID_ACCELERATION_INTELLIGENCE_SCORE = 35;

const HARSH_CORNERING_MIN_SPEED_KMH = 30;
const HARSH_CORNERING_MIN_HEADING_CHANGE_DEGREES = 45;
const HARSH_CORNERING_MIN_INTERVAL_SECONDS = 2;
const HARSH_CORNERING_MAX_INTERVAL_SECONDS = 15;
const HARSH_CORNERING_COOLDOWN_MINUTES = 10;
const HARSH_CORNERING_INTELLIGENCE_SCORE = 35;

const SPEEDING_MIN_SPEED_KMH = 120;
const SPEEDING_MIN_DURATION_SECONDS = 30;
const SPEEDING_MIN_CONSECUTIVE_SAMPLES = 3;
const SPEEDING_LOOKBACK_SECONDS = 90;
const SPEEDING_COOLDOWN_MINUTES = 10;
const SPEEDING_INTELLIGENCE_SCORE = 30;

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, role } = await requireOrganization();

    requireRole(role, ["owner", "admin", "operator"]);

    const body = (await req.json()) as UpdateLocationBody;

    const parsedInput =
      parseUpdateLocationInput(body);

    if (!parsedInput.ok) {
      return NextResponse.json(
        { error: parsedInput.error },
        { status: 400 }
      );
    }

    const {
      vehicleId,
      tripId,
      latitude,
      longitude,
      speedKmh,
      heading,
      source,
      requestedStatus,
    } = parsedInput.value;

    const {
      vehicle,
      error: vehicleError,
    } = await getVehicleForLocationUpdate({
      supabase,
      organizationId,
      vehicleId,
    });

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: vehicleError?.message || "Vehicle not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

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
        occurredAt: now,
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

    if (telemetryAnalysis.skipped === "jitter") {
      return NextResponse.json({
        success: true,
        skipped: "jitter",
        message:
          "Location ignored because movement was too small.",
      });
    }

    if (telemetryAnalysis.skipped === "gps_spike") {
      return NextResponse.json({
        success: true,
        skipped: "gps_spike",
        message:
          "Location ignored because it looked like a GPS spike.",
      });
    }

    const {
      harshBrakingCandidate,
      rapidAccelerationCandidate,
      harshCorneringCandidate,
      speedingCandidate,
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
      recordedAt: now,
      source,
    });

    if (locationError) {
      return NextResponse.json(
        { error: locationError.message },
        { status: 500 }
      );
    }

    const activeTrip =
      await getActiveVehicleTrip({
        supabase,
        organizationId,
        vehicleId,
      });

    const activeTripId = activeTrip?.id || tripId || null;

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
      occurredAt: now,
      stopSpeedKmh: STOP_SPEED_KMH,
      stopMinutes: STOP_MINUTES,
      minimumSlowPoints: MIN_SLOW_POINTS,
      harshBrakingCandidate,
      rapidAccelerationCandidate,
      harshCorneringCandidate,
      speedingCandidate,
    });
    return NextResponse.json({
      success: true,
      message: "Vehicle location updated successfully.",
      vehicle: {
        id: vehicle.id,
        nickname: vehicle.nickname,
        registrationNumber: vehicle.registration_number,
      },
      location: {
        latitude,
        longitude,
        speedKmh,
        heading,
        source,
        recordedAt: now,
      },
      activeTripId,
    });
  } catch (err: any) {
    console.error("UPDATE LOCATION ERROR:");
    console.error(err);

    const message = err.message || "Failed to update vehicle location.";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Permission denied"
        ? 403
        : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
