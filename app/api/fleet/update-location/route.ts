import { NextResponse } from "next/server";
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

type UpdateLocationBody = {
  vehicleId?: string;
  tripId?: string | null;
  latitude?: number | string;
  longitude?: number | string;
  speedKmh?: number | string;
  heading?: number | string;
  source?: "mobile" | "hardware" | "manual";
  status?:
    | "scheduled"
    | "en_route_to_port"
    | "collecting"
    | "en_route_to_fishery"
    | "delivered"
    | "cancelled"
    | "emergency";
};

function parseNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return NaN;
}

function getDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371e3;
  const p1 = (a.lat * Math.PI) / 180;
  const p2 = (b.lat * Math.PI) / 180;
  const dp = ((b.lat - a.lat) * Math.PI) / 180;
  const dl = ((b.lng - a.lng) * Math.PI) / 180;

  const x =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) *
      Math.cos(p2) *
      Math.sin(dl / 2) *
      Math.sin(dl / 2);

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, role } = await requireOrganization();

    requireRole(role, ["owner", "admin", "operator"]);

    const body = (await req.json()) as UpdateLocationBody;

    const vehicleId = body.vehicleId;
    const tripId = body.tripId ?? null;
    const latitude = parseNumber(body.latitude);
    const longitude = parseNumber(body.longitude);
    const speedKmh = Number.isFinite(parseNumber(body.speedKmh))
      ? parseNumber(body.speedKmh)
      : 0;
    const heading = Number.isFinite(parseNumber(body.heading))
      ? parseNumber(body.heading)
      : 0;
    const source = body.source || "mobile";
    const requestedStatus = body.status;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required." },
        { status: 400 }
      );
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: "Latitude must be between -90 and 90." },
        { status: 400 }
      );
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: "Longitude must be between -180 and 180." },
        { status: 400 }
      );
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select(`
        id,
        is_active,
        nickname,
        registration_number,
        organization_id
      `)
      .eq("id", vehicleId)
      .eq("organization_id", organizationId)
      .single();

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

    const { data: lastPoint } = await supabase
      .from("vehicle_locations")
      .select("latitude, longitude, speed_kmh, heading, recorded_at")
      .eq("vehicle_id", vehicleId)
      .eq("organization_id", organizationId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPoint) {
      const previousLat = parseNumber(lastPoint.latitude);
      const previousLng = parseNumber(lastPoint.longitude);
      const previousHeading =
        parseNumber(lastPoint.heading);

      if (Number.isFinite(previousLat) && Number.isFinite(previousLng)) {
        const distance = getDistanceMeters(
          { lat: previousLat, lng: previousLng },
          { lat: latitude, lng: longitude }
        );

        const timeDiffSeconds =
          (new Date(now).getTime() -
            new Date(lastPoint.recorded_at).getTime()) /
          1000;

        let normalizedHeadingDeltaDegrees: number | null = null;

        if (
          Number.isFinite(previousHeading) &&
          Number.isFinite(heading)
        ) {
          const normalizedPreviousHeading =
            ((previousHeading % 360) + 360) % 360;

          const normalizedCurrentHeading =
            ((heading % 360) + 360) % 360;

          const rawHeadingDeltaDegrees = Math.abs(
            normalizedCurrentHeading -
              normalizedPreviousHeading
          );

          normalizedHeadingDeltaDegrees = Math.min(
            rawHeadingDeltaDegrees,
            360 - rawHeadingDeltaDegrees
          );
        }

        const calculatedSpeedKmh =
          timeDiffSeconds > 0
            ? (distance / timeDiffSeconds) * 3.6
            : 0;

        if (distance < MIN_DISTANCE_METERS) {
          return NextResponse.json({
            success: true,
            skipped: "jitter",
            message: "Location ignored because movement was too small.",
          });
        }

        if (calculatedSpeedKmh > MAX_ALLOWED_SPEED_KMH) {
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
            message: "Location ignored because it looked like a GPS spike.",
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
              parseNumber,
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
          parseNumber(lastPoint.speed_kmh);

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

    const { error: locationError } = await supabase
      .from("vehicle_locations")
      .insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        trip_id: tripId,
        latitude,
        longitude,
        speed_kmh: speedKmh,
        heading,
        recorded_at: now,
        source,
      });

    if (locationError) {
      return NextResponse.json(
        { error: locationError.message },
        { status: 500 }
      );
    }

    const { data: activeTrip } = await supabase
      .from("vehicle_trips")
      .select("id, status")
      .eq("vehicle_id", vehicleId)
      .eq("organization_id", organizationId)
      .in("status", [
        "scheduled",
        "en_route_to_port",
        "collecting",
        "en_route_to_fishery",
        "emergency",
      ])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

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
