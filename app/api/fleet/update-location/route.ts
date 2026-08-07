import { NextResponse } from "next/server";
import {
  parseFleetTelemetryNumber,
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
  createVehicleLocation,
} from "@/lib/fleet/createVehicleLocation";
import {
  getActiveVehicleTrip,
} from "@/lib/fleet/getActiveVehicleTrip";
import { requireOrganization, requireRole } from "@/lib/server-auth";
import { detectFleetRisks } from "@/lib/fleet/risk-detection";
import {
  createRapidAccelerationAlert,
} from "@/lib/fleet/createRapidAccelerationAlert";
import {
  createHarshCorneringAlert,
} from "@/lib/fleet/createHarshCorneringAlert";
import {
  createSpeedingAlert,
} from "@/lib/fleet/createSpeedingAlert";
import {
  detectSustainedSpeedingCandidate,
} from "@/lib/fleet/detectSustainedSpeedingCandidate";
import {
  detectHarshBrakingCandidate,
} from "@/lib/fleet/detectHarshBrakingCandidate";
import {
  detectRapidAccelerationCandidate,
} from "@/lib/fleet/detectRapidAccelerationCandidate";
import {
  detectHarshCorneringCandidate,
} from "@/lib/fleet/detectHarshCorneringCandidate";
import {
  evaluateGpsMovement,
} from "@/lib/fleet/evaluateGpsMovement";
import {
  calculateHeadingDelta,
} from "@/lib/fleet/calculateHeadingDelta";
import {
  getDistanceMeters,
} from "@/lib/geo/getDistanceMeters";
import {
  createGpsAnomalyAlert,
} from "@/lib/fleet/createGpsAnomalyAlert";
import {
  createHarshBrakingAlert,
} from "@/lib/fleet/createHarshBrakingAlert";
import {
  updateActiveTripFromLocation,
} from "@/lib/fleet/updateActiveTripFromLocation";
import {
  updateVehicleStopLifecycle,
} from "@/lib/fleet/updateVehicleStopLifecycle";

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

    let harshBrakingCandidate: {
      previousSpeedKmh: number;
      currentSpeedKmh: number;
      speedDropKmh: number;
      intervalSeconds: number;
      decelerationMps2: number;
    } | null = null;

    let rapidAccelerationCandidate: {
      previousSpeedKmh: number;
      currentSpeedKmh: number;
      speedIncreaseKmh: number;
      intervalSeconds: number;
      accelerationMps2: number;
    } | null = null;

    let harshCorneringCandidate: {
      previousHeading: number;
      currentHeading: number;
      headingChangeDegrees: number;
      speedKmh: number;
      intervalSeconds: number;
    } | null = null;

    let speedingCandidate: {
      speedKmh: number;
      thresholdKmh: number;
      durationSeconds: number;
      consecutiveSamples: number;
    } | null = null;

    const lastPoint =
      await getLatestVehicleLocation({
        supabase,
        organizationId,
        vehicleId,
      });

    if (lastPoint) {
      const previousLat = parseFleetTelemetryNumber(lastPoint.latitude);
      const previousLng = parseFleetTelemetryNumber(lastPoint.longitude);
      const previousHeading =
        parseFleetTelemetryNumber(lastPoint.heading);

      if (Number.isFinite(previousLat) && Number.isFinite(previousLng)) {
        const distance = getDistanceMeters(
          {
            latitude: previousLat,
            longitude: previousLng,
          },
          {
            latitude,
            longitude,
          }
        );

        const timeDiffSeconds =
          (new Date(now).getTime() -
            new Date(lastPoint.recorded_at).getTime()) /
          1000;

        const normalizedHeadingDeltaDegrees =
          calculateHeadingDelta({
            previousHeading,
            currentHeading: heading,
          });
        const gpsMovement =
          evaluateGpsMovement({
            distanceMeters: distance,
            intervalSeconds: timeDiffSeconds,
            minimumDistanceMeters:
              MIN_DISTANCE_METERS,
            maximumAllowedSpeedKmh:
              MAX_ALLOWED_SPEED_KMH,
          });

        const calculatedSpeedKmh =
          gpsMovement.calculatedSpeedKmh;

        if (gpsMovement.outcome === "jitter") {
          return NextResponse.json({
            success: true,
            skipped: "jitter",
            message:
              "Location ignored because movement was too small.",
          });
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
              distanceMeters: distance,
              intervalSeconds: timeDiffSeconds,
              calculatedSpeedKmh,
              maximumAllowedSpeedKmh:
                MAX_ALLOWED_SPEED_KMH,
            });
          }

          return NextResponse.json({
            success: true,
            skipped: "gps_spike",
            message:
              "Location ignored because it looked like a GPS spike.",
          });
        }
        if (source !== "manual") {
          speedingCandidate =
            await detectSustainedSpeedingCandidate({
              supabase,
              organizationId,
              vehicleId,
              speedKmh,
              occurredAt: now,
              parseNumber: parseFleetTelemetryNumber,
              lookbackSeconds:
                SPEEDING_LOOKBACK_SECONDS,
              minimumSpeedKmh:
                SPEEDING_MIN_SPEED_KMH,
              minimumSamples:
                SPEEDING_MIN_CONSECUTIVE_SAMPLES,
              minimumDurationSeconds:
                SPEEDING_MIN_DURATION_SECONDS,
            });
        }
        const previousSpeedKmh =
          parseFleetTelemetryNumber(lastPoint.speed_kmh);

        harshBrakingCandidate =
          detectHarshBrakingCandidate({
            source,
            previousSpeedKmh,
            currentSpeedKmh: speedKmh,
            intervalSeconds: timeDiffSeconds,
            minimumPreviousSpeedKmh:
              HARSH_BRAKING_MIN_PREVIOUS_SPEED_KMH,
            minimumSpeedDropKmh:
              HARSH_BRAKING_MIN_SPEED_DROP_KMH,
            minimumIntervalSeconds:
              HARSH_BRAKING_MIN_INTERVAL_SECONDS,
            maximumIntervalSeconds:
              HARSH_BRAKING_MAX_INTERVAL_SECONDS,
            minimumDecelerationMps2:
              HARSH_BRAKING_MIN_DECELERATION_MPS2,
          });
        rapidAccelerationCandidate =
          detectRapidAccelerationCandidate({
            source,
            previousSpeedKmh,
            currentSpeedKmh: speedKmh,
            intervalSeconds: timeDiffSeconds,
            minimumSpeedIncreaseKmh:
              RAPID_ACCELERATION_MIN_SPEED_INCREASE_KMH,
            minimumIntervalSeconds:
              RAPID_ACCELERATION_MIN_INTERVAL_SECONDS,
            maximumIntervalSeconds:
              RAPID_ACCELERATION_MAX_INTERVAL_SECONDS,
            minimumAccelerationMps2:
              RAPID_ACCELERATION_MIN_ACCELERATION_MPS2,
          });
        harshCorneringCandidate =
          detectHarshCorneringCandidate({
            source,
            previousHeading,
            currentHeading: heading,
            normalizedHeadingDeltaDegrees,
            speedKmh,
            intervalSeconds: timeDiffSeconds,
            minimumSpeedKmh:
              HARSH_CORNERING_MIN_SPEED_KMH,
            minimumHeadingChangeDegrees:
              HARSH_CORNERING_MIN_HEADING_CHANGE_DEGREES,
            minimumIntervalSeconds:
              HARSH_CORNERING_MIN_INTERVAL_SECONDS,
            maximumIntervalSeconds:
              HARSH_CORNERING_MAX_INTERVAL_SECONDS,
          });
      }
    }

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

    if (harshBrakingCandidate) {
      await createHarshBrakingAlert({
        supabase,
        organizationId,
        vehicleId,
        tripId: activeTripId,
        latitude,
        longitude,
        candidate: harshBrakingCandidate,
      });
    }
    if (rapidAccelerationCandidate) {
      await createRapidAccelerationAlert({
        supabase,
        organizationId,
        vehicleId,
        tripId: activeTripId,
        latitude,
        longitude,
        candidate: rapidAccelerationCandidate,
      });
    }

    if (harshCorneringCandidate) {
      await createHarshCorneringAlert({
        supabase,
        organizationId,
        vehicleId,
        tripId: activeTripId,
        latitude,
        longitude,
        candidate: harshCorneringCandidate,
      });
    }

    if (speedingCandidate) {
      await createSpeedingAlert({
        supabase,
        organizationId,
        vehicleId,
        tripId: activeTripId,
        latitude,
        longitude,
        candidate: speedingCandidate,
      });
    }

    await updateActiveTripFromLocation({
      supabase,
      organizationId,
      activeTrip,
      requestedStatus,
      occurredAt: now,
    });
    await updateVehicleStopLifecycle({
      supabase,
      organizationId,
      vehicleId,
      tripId: activeTripId,
      latitude,
      longitude,
      speedKmh,
      occurredAt: now,
      stopSpeedKmh: STOP_SPEED_KMH,
      stopMinutes: STOP_MINUTES,
      minimumSlowPoints: MIN_SLOW_POINTS,
    });
    let riskDetectionResult: any = null;

    try {
      riskDetectionResult = await detectFleetRisks({
        supabase,
        organizationId,
      });
    } catch (riskError) {
      console.error("Automatic risk detection failed:", riskError);
    }

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
