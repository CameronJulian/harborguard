import { NextResponse } from "next/server";
import { requireOrganization, requireRole } from "@/lib/server-auth";
import { detectFleetRisks } from "@/lib/fleet/risk-detection";
import { findHarshBrakingCorroboration } from "@/lib/fleet/harshBrakingCorroboration";
import {
  createTelemetryObservation,
} from "@/lib/route-safety/createTelemetryObservation";

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
const HARSH_BRAKING_COOLDOWN_MINUTES = 10;
const HARSH_BRAKING_INTELLIGENCE_SCORE = 35;

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
            try {
              const gpsAnomalyCooldownSince = new Date(
                Date.now() -
                  GPS_ANOMALY_COOLDOWN_MINUTES *
                    60 *
                    1000
              ).toISOString();

              const {
                data: recentGpsAnomalyAlert,
                error: recentGpsAnomalyAlertError,
              } = await supabase
                .from("vehicle_alerts")
                .select("id")
                .eq("organization_id", organizationId)
                .eq("vehicle_id", vehicleId)
                .eq("alert_type", "gps_anomaly")
                .eq("is_resolved", false)
                .gte(
                  "created_at",
                  gpsAnomalyCooldownSince
                )
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (recentGpsAnomalyAlertError) {
                console.error(
                  "GPS anomaly cooldown lookup failed:",
                  recentGpsAnomalyAlertError
                );
              } else if (!recentGpsAnomalyAlert) {
                const roundedCalculatedSpeedKmh =
                  Math.round(calculatedSpeedKmh * 10) /
                  10;

                const roundedDistanceMeters =
                  Math.round(distance * 10) / 10;

                const roundedIntervalSeconds =
                  Math.round(timeDiffSeconds * 10) /
                  10;

                const gpsAnomalyMessage =
                  "GPS anomaly candidate detected: " +
                  `${roundedDistanceMeters} meters over ` +
                  `${roundedIntervalSeconds} seconds, ` +
                  `implying ${roundedCalculatedSpeedKmh} km/h.`;

                const gpsAnomalyNarrative =
                  "High-confidence telemetry integrity anomaly. " +
                  `Previous coordinates: ${previousLat}, ${previousLng}. ` +
                  `Rejected coordinates: ${latitude}, ${longitude}. ` +
                  `Calculated speed exceeded the ` +
                  `${MAX_ALLOWED_SPEED_KMH} km/h validation threshold. ` +
                  "The rejected point was not stored as a valid " +
                  "vehicle location and has not been classified " +
                  "as a verified road incident.";

                const { error: gpsAnomalyAlertError } =
                  await supabase
                    .from("vehicle_alerts")
                    .insert({
                      organization_id:
                        organizationId,
                      vehicle_id: vehicleId,
                      trip_id: tripId,
                      alert_type: "gps_anomaly",
                      severity: "high",
                      message: gpsAnomalyMessage,
                      is_resolved: false,
                      intelligence_score:
                        GPS_ANOMALY_INTELLIGENCE_SCORE,
                      behavioral_risk: "high",
                      intelligence_narrative:
                        gpsAnomalyNarrative,
                    });

                if (gpsAnomalyAlertError) {
                  console.error(
                    "GPS anomaly alert insert failed:",
                    gpsAnomalyAlertError
                  );
                }
              }
            } catch (gpsAnomalyError) {
              console.error(
                "GPS anomaly alerting failed:",
                gpsAnomalyError
              );
            }
          }

          return NextResponse.json({
            success: true,
            skipped: "gps_spike",
            message: "Location ignored because it looked like a GPS spike.",
          });
        }

        if (
          source !== "manual" &&
          Number.isFinite(speedKmh) &&
          speedKmh >= SPEEDING_MIN_SPEED_KMH
        ) {
          const speedingLookbackSince = new Date(
            Date.now() -
              SPEEDING_LOOKBACK_SECONDS *
                1000
          ).toISOString();

          const {
            data: recentSpeedingPoints,
            error: recentSpeedingPointsError,
          } = await supabase
            .from("vehicle_locations")
            .select("speed_kmh, recorded_at")
            .eq("organization_id", organizationId)
            .eq("vehicle_id", vehicleId)
            .gte("recorded_at", speedingLookbackSince)
            .order("recorded_at", { ascending: false })
            .limit(20);

          if (recentSpeedingPointsError) {
            console.error(
              "Sustained speeding history lookup failed:",
              recentSpeedingPointsError
            );
          } else {
            const consecutiveSpeedingSamples = [
              {
                speedKmh,
                recordedAt: now,
              },
            ];

            for (
              const point of recentSpeedingPoints || []
            ) {
              const historicalSpeedKmh =
                parseNumber(point.speed_kmh);

              if (
                !Number.isFinite(historicalSpeedKmh) ||
                historicalSpeedKmh <
                  SPEEDING_MIN_SPEED_KMH
              ) {
                break;
              }

              consecutiveSpeedingSamples.push({
                speedKmh: historicalSpeedKmh,
                recordedAt: point.recorded_at,
              });
            }

            const oldestSpeedingSample =
              consecutiveSpeedingSamples[
                consecutiveSpeedingSamples.length - 1
              ];

            const sustainedDurationSeconds =
              oldestSpeedingSample
                ? (
                    new Date(now).getTime() -
                    new Date(
                      oldestSpeedingSample.recordedAt
                    ).getTime()
                  ) / 1000
                : 0;

            if (
              consecutiveSpeedingSamples.length >=
                SPEEDING_MIN_CONSECUTIVE_SAMPLES &&
              sustainedDurationSeconds >=
                SPEEDING_MIN_DURATION_SECONDS
            ) {
              speedingCandidate = {
                speedKmh:
                  Math.round(speedKmh * 10) / 10,
                thresholdKmh:
                  SPEEDING_MIN_SPEED_KMH,
                durationSeconds:
                  Math.round(
                    sustainedDurationSeconds * 10
                  ) / 10,
                consecutiveSamples:
                  consecutiveSpeedingSamples.length,
              };
            }
          }
        }

        const previousSpeedKmh =
          parseNumber(lastPoint.speed_kmh);

        const speedDropKmh =
          previousSpeedKmh - speedKmh;

        const decelerationMps2 =
          timeDiffSeconds > 0
            ? (speedDropKmh / 3.6) /
              timeDiffSeconds
            : 0;

        const validTelemetrySample =
          source !== "manual" &&
          Number.isFinite(previousSpeedKmh) &&
          Number.isFinite(speedKmh) &&
          speedKmh >= 0 &&
          timeDiffSeconds >=
            HARSH_BRAKING_MIN_INTERVAL_SECONDS &&
          timeDiffSeconds <=
            HARSH_BRAKING_MAX_INTERVAL_SECONDS;

        if (
          validTelemetrySample &&
          previousSpeedKmh >=
            HARSH_BRAKING_MIN_PREVIOUS_SPEED_KMH &&
          speedDropKmh >=
            HARSH_BRAKING_MIN_SPEED_DROP_KMH &&
          decelerationMps2 >=
            HARSH_BRAKING_MIN_DECELERATION_MPS2
        ) {
          harshBrakingCandidate = {
            previousSpeedKmh:
              Math.round(previousSpeedKmh * 10) / 10,
            currentSpeedKmh:
              Math.round(speedKmh * 10) / 10,
            speedDropKmh:
              Math.round(speedDropKmh * 10) / 10,
            intervalSeconds:
              Math.round(timeDiffSeconds * 10) / 10,
            decelerationMps2:
              Math.round(decelerationMps2 * 100) / 100,
          };
        }

        const speedIncreaseKmh =
          speedKmh - previousSpeedKmh;

        const accelerationMps2 =
          timeDiffSeconds > 0
            ? (speedIncreaseKmh / 3.6) /
              timeDiffSeconds
            : 0;

        const validAccelerationSample =
          source !== "manual" &&
          Number.isFinite(previousSpeedKmh) &&
          Number.isFinite(speedKmh) &&
          previousSpeedKmh >= 0 &&
          speedKmh >= 0 &&
          timeDiffSeconds >=
            RAPID_ACCELERATION_MIN_INTERVAL_SECONDS &&
          timeDiffSeconds <=
            RAPID_ACCELERATION_MAX_INTERVAL_SECONDS;

        if (
          validAccelerationSample &&
          speedIncreaseKmh >=
            RAPID_ACCELERATION_MIN_SPEED_INCREASE_KMH &&
          accelerationMps2 >=
            RAPID_ACCELERATION_MIN_ACCELERATION_MPS2
        ) {
          rapidAccelerationCandidate = {
            previousSpeedKmh:
              Math.round(previousSpeedKmh * 10) / 10,
            currentSpeedKmh:
              Math.round(speedKmh * 10) / 10,
            speedIncreaseKmh:
              Math.round(speedIncreaseKmh * 10) / 10,
            intervalSeconds:
              Math.round(timeDiffSeconds * 10) / 10,
            accelerationMps2:
              Math.round(accelerationMps2 * 100) / 100,
          };
        }

        const validCorneringSample =
          source !== "manual" &&
          normalizedHeadingDeltaDegrees !== null &&
          Number.isFinite(normalizedHeadingDeltaDegrees) &&
          Number.isFinite(previousHeading) &&
          Number.isFinite(heading) &&
          Number.isFinite(speedKmh) &&
          speedKmh >=
            HARSH_CORNERING_MIN_SPEED_KMH &&
          timeDiffSeconds >=
            HARSH_CORNERING_MIN_INTERVAL_SECONDS &&
          timeDiffSeconds <=
            HARSH_CORNERING_MAX_INTERVAL_SECONDS;

        if (validCorneringSample) {
          const headingChangeDegrees =
            normalizedHeadingDeltaDegrees!;

          if (
            headingChangeDegrees >=
            HARSH_CORNERING_MIN_HEADING_CHANGE_DEGREES
          ) {
            harshCorneringCandidate = {
              previousHeading:
                Math.round(previousHeading * 10) / 10,
              currentHeading:
                Math.round(heading * 10) / 10,
              headingChangeDegrees:
                Math.round(
                  headingChangeDegrees * 10
                ) / 10,
              speedKmh:
                Math.round(speedKmh * 10) / 10,
              intervalSeconds:
                Math.round(timeDiffSeconds * 10) / 10,
            };
          }
        }
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
      try {
        const cooldownSince = new Date(
          Date.now() -
            HARSH_BRAKING_COOLDOWN_MINUTES *
              60 *
              1000
        ).toISOString();

        const {
          data: recentHarshBrakingAlert,
          error: recentHarshBrakingAlertError,
        } = await supabase
          .from("vehicle_alerts")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("vehicle_id", vehicleId)
          .eq("alert_type", "harsh_braking")
          .eq("is_resolved", false)
          .gte("created_at", cooldownSince)
          .order(
            "created_at",
            { ascending: false }
          )
          .limit(1)
          .maybeSingle();

        if (recentHarshBrakingAlertError) {
          console.error(
            "Harsh braking cooldown lookup failed:",
            recentHarshBrakingAlertError
          );
        } else if (!recentHarshBrakingAlert) {
          const telemetryMessage =
            "Harsh braking candidate detected: " +
            `${harshBrakingCandidate.previousSpeedKmh} km/h to ` +
            `${harshBrakingCandidate.currentSpeedKmh} km/h over ` +
            `${harshBrakingCandidate.intervalSeconds} seconds ` +
            `(${harshBrakingCandidate.decelerationMps2} m/s2).`;

          const telemetryNarrative =
            "Low-confidence fleet telemetry candidate. " +
            "Speed reduction: " +
            `${harshBrakingCandidate.speedDropKmh} km/h. ` +
            `Coordinates: ${latitude}, ${longitude}. ` +
            "This event requires corroboration and has not " +
            "been classified as a verified road incident.";

          const { error: harshBrakingAlertError } =
            await supabase
              .from("vehicle_alerts")
              .insert({
                organization_id: organizationId,
                vehicle_id: vehicleId,
                trip_id: activeTripId,
                latitude,
                longitude,
                alert_type: "harsh_braking",
                severity: "medium",
                message: telemetryMessage,
                is_resolved: false,
                intelligence_score:
                  HARSH_BRAKING_INTELLIGENCE_SCORE,
                behavioral_risk: "medium",
                intelligence_narrative:
                  telemetryNarrative,
              });

          if (harshBrakingAlertError) {
            console.error(
              "Harsh braking alert insert failed:",
              harshBrakingAlertError
            );
          } else {
            try {
              const corroboration =
                await findHarshBrakingCorroboration({
                  supabase,
                  organizationId,
                  currentVehicleId: vehicleId,
                  latitude,
                  longitude,
                });

              const telemetryObservation =
                await createTelemetryObservation({
                  organizationId,
                  latitude,
                  longitude,
                  corroboration,
                  occurredAt:
                    new Date().toISOString(),
                  sourceVehicleId: vehicleId,
                });

              console.info(
                "[harsh-braking telemetry observation]",
                telemetryObservation
              );

              console.info(
                "[harsh-braking corroboration diagnostic]",
                {
                  organizationId,
                  vehicleId,
                  latitude,
                  longitude,
                  thresholdMet:
                    corroboration.thresholdMet,
                  distinctVehicleCount:
                    corroboration.distinctVehicleCount,
                  distinctVehicleIds:
                    corroboration.distinctVehicleIds,
                  otherVehicleIds:
                    corroboration.otherVehicleIds,
                  nearbyAlertCount:
                    corroboration.nearbyAlertCount,
                  radiusMeters:
                    corroboration.radiusMeters,
                  timeWindowMinutes:
                    corroboration.timeWindowMinutes,
                  windowStartedAt:
                    corroboration.windowStartedAt,
                  windowEndedAt:
                    corroboration.windowEndedAt,
                }
              );
            } catch (corroborationError) {
              console.error(
                "[harsh-braking corroboration diagnostic failed]",
                corroborationError
              );
            }
          }
        }
      } catch (harshBrakingError) {
        console.error(
          "Harsh braking detection failed:",
          harshBrakingError
        );
      }
    }

    if (rapidAccelerationCandidate) {
      try {
        const rapidAccelerationCooldownSince = new Date(
          Date.now() -
            RAPID_ACCELERATION_COOLDOWN_MINUTES *
              60 *
              1000
        ).toISOString();

        const {
          data: recentRapidAccelerationAlert,
          error: recentRapidAccelerationAlertError,
        } = await supabase
          .from("vehicle_alerts")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("vehicle_id", vehicleId)
          .eq("alert_type", "rapid_acceleration")
          .eq("is_resolved", false)
          .gte("created_at", rapidAccelerationCooldownSince)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentRapidAccelerationAlertError) {
          console.error(
            "Rapid acceleration cooldown lookup failed:",
            recentRapidAccelerationAlertError
          );
        } else if (!recentRapidAccelerationAlert) {
          const rapidAccelerationMessage =
            "Rapid acceleration candidate detected: " +
            `${rapidAccelerationCandidate.previousSpeedKmh} km/h to ` +
            `${rapidAccelerationCandidate.currentSpeedKmh} km/h over ` +
            `${rapidAccelerationCandidate.intervalSeconds} seconds ` +
            `(${rapidAccelerationCandidate.accelerationMps2} m/s2).`;

          const rapidAccelerationNarrative =
            "Low-confidence fleet telemetry candidate. " +
            "Speed increase: " +
            `${rapidAccelerationCandidate.speedIncreaseKmh} km/h. ` +
            `Coordinates: ${latitude}, ${longitude}. ` +
            "This event requires corroboration and has not " +
            "been classified as a verified road incident.";

          const { error: rapidAccelerationAlertError } =
            await supabase
              .from("vehicle_alerts")
              .insert({
                organization_id: organizationId,
                vehicle_id: vehicleId,
                trip_id: activeTripId,
                latitude,
                longitude,
                alert_type: "rapid_acceleration",
                severity: "medium",
                message: rapidAccelerationMessage,
                is_resolved: false,
                intelligence_score:
                  RAPID_ACCELERATION_INTELLIGENCE_SCORE,
                behavioral_risk: "medium",
                intelligence_narrative:
                  rapidAccelerationNarrative,
              });

          if (rapidAccelerationAlertError) {
            console.error(
              "Rapid acceleration alert insert failed:",
              rapidAccelerationAlertError
            );
          }
        }
      } catch (rapidAccelerationError) {
        console.error(
          "Rapid acceleration detection failed:",
          rapidAccelerationError
        );
      }
    }

    if (harshCorneringCandidate) {
      try {
        const harshCorneringCooldownSince = new Date(
          Date.now() -
            HARSH_CORNERING_COOLDOWN_MINUTES *
              60 *
              1000
        ).toISOString();

        const {
          data: recentHarshCorneringAlert,
          error: recentHarshCorneringAlertError,
        } = await supabase
          .from("vehicle_alerts")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("vehicle_id", vehicleId)
          .eq("alert_type", "harsh_cornering")
          .eq("is_resolved", false)
          .gte("created_at", harshCorneringCooldownSince)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentHarshCorneringAlertError) {
          console.error(
            "Harsh cornering cooldown lookup failed:",
            recentHarshCorneringAlertError
          );
        } else if (!recentHarshCorneringAlert) {
          const harshCorneringMessage =
            "Harsh cornering candidate detected: " +
            `${harshCorneringCandidate.headingChangeDegrees} degree heading change ` +
            `at ${harshCorneringCandidate.speedKmh} km/h over ` +
            `${harshCorneringCandidate.intervalSeconds} seconds.`;

          const harshCorneringNarrative =
            "Low-confidence fleet telemetry candidate. " +
            `Heading changed from ${harshCorneringCandidate.previousHeading} degrees ` +
            `to ${harshCorneringCandidate.currentHeading} degrees. ` +
            `Coordinates: ${latitude}, ${longitude}. ` +
            "This event requires corroboration and has not " +
            "been classified as a verified road incident.";

          const { error: harshCorneringAlertError } =
            await supabase
              .from("vehicle_alerts")
              .insert({
                organization_id: organizationId,
                vehicle_id: vehicleId,
                trip_id: activeTripId,
                latitude,
                longitude,
                alert_type: "harsh_cornering",
                severity: "medium",
                message: harshCorneringMessage,
                is_resolved: false,
                intelligence_score:
                  HARSH_CORNERING_INTELLIGENCE_SCORE,
                behavioral_risk: "medium",
                intelligence_narrative:
                  harshCorneringNarrative,
              });

          if (harshCorneringAlertError) {
            console.error(
              "Harsh cornering alert insert failed:",
              harshCorneringAlertError
            );
          }
        }
      } catch (harshCorneringError) {
        console.error(
          "Harsh cornering detection failed:",
          harshCorneringError
        );
      }
    }

    if (speedingCandidate) {
      try {
        const speedingCooldownSince = new Date(
          Date.now() -
            SPEEDING_COOLDOWN_MINUTES *
              60 *
              1000
        ).toISOString();

        const {
          data: recentSpeedingAlert,
          error: recentSpeedingAlertError,
        } = await supabase
          .from("vehicle_alerts")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("vehicle_id", vehicleId)
          .eq("alert_type", "speeding")
          .eq("is_resolved", false)
          .gte("created_at", speedingCooldownSince)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (recentSpeedingAlertError) {
          console.error(
            "Speeding cooldown lookup failed:",
            recentSpeedingAlertError
          );
        } else if (!recentSpeedingAlert) {
          const speedingMessage =
            "Sustained speeding detected: " +
            `${speedingCandidate.speedKmh} km/h, ` +
            `above the fixed ${speedingCandidate.thresholdKmh} km/h threshold ` +
            `for ${speedingCandidate.durationSeconds} seconds across ` +
            `${speedingCandidate.consecutiveSamples} consecutive samples.`;

          const speedingNarrative =
            "Corroborated fleet telemetry candidate based on consecutive samples. " +
            "This fixed threshold is not yet based on the road-specific speed limit. " +
            `Coordinates: ${latitude}, ${longitude}. ` +
            "The sequence requires contextual review and has not " +
            "been classified as a verified road incident.";

          const { error: speedingAlertError } =
            await supabase
              .from("vehicle_alerts")
              .insert({
                organization_id: organizationId,
                vehicle_id: vehicleId,
                trip_id: activeTripId,
                alert_type: "speeding",
                severity: "medium",
                message: speedingMessage,
                is_resolved: false,
                intelligence_score:
                  SPEEDING_INTELLIGENCE_SCORE,
                behavioral_risk: "medium",
                intelligence_narrative:
                  speedingNarrative,
              });

          if (speedingAlertError) {
            console.error(
              "Speeding alert insert failed:",
              speedingAlertError
            );
          }
        }
      } catch (speedingError) {
        console.error(
          "Speeding detection failed:",
          speedingError
        );
      }
    }

    if (activeTrip) {
      if (activeTrip.status === "scheduled") {
        await supabase
          .from("vehicle_trips")
          .update({
            status: requestedStatus || "en_route_to_port",
            actual_departure: now,
          })
          .eq("id", activeTrip.id)
          .eq("organization_id", organizationId);
      } else if (requestedStatus && requestedStatus !== activeTrip.status) {
        const updates: Record<string, string> = {
          status: requestedStatus,
        };

        if (requestedStatus === "delivered") {
          updates.actual_arrival = now;
        }

        await supabase
          .from("vehicle_trips")
          .update(updates)
          .eq("id", activeTrip.id)
          .eq("organization_id", organizationId);
      }
    }

    if (speedKmh <= STOP_SPEED_KMH) {
      const since = new Date(
        Date.now() - STOP_MINUTES * 60 * 1000
      ).toISOString();

      const { data: recentSlowPoints } = await supabase
        .from("vehicle_locations")
        .select("id")
        .eq("vehicle_id", vehicleId)
        .eq("organization_id", organizationId)
        .gte("recorded_at", since)
        .lte("speed_kmh", STOP_SPEED_KMH);

      if ((recentSlowPoints || []).length >= MIN_SLOW_POINTS) {
        const { data: openStop } = await supabase
          .from("vehicle_stops")
          .select("id")
          .eq("vehicle_id", vehicleId)
          .eq("organization_id", organizationId)
          .is("ended_at", null)
          .maybeSingle();

        if (!openStop) {
          await supabase.from("vehicle_stops").insert({
            organization_id: organizationId,
            vehicle_id: vehicleId,
            trip_id: activeTripId,
            latitude,
            longitude,
            started_at: since,
          });
        }
      }
    } else {
      const { data: openStop } = await supabase
        .from("vehicle_stops")
        .select("id, started_at")
        .eq("vehicle_id", vehicleId)
        .eq("organization_id", organizationId)
        .is("ended_at", null)
        .maybeSingle();

      if (openStop) {
        const durationSeconds = Math.floor(
          (Date.now() - new Date(openStop.started_at).getTime()) / 1000
        );

        await supabase
          .from("vehicle_stops")
          .update({
            ended_at: now,
            duration_seconds: durationSeconds,
          })
          .eq("id", openStop.id)
          .eq("organization_id", organizationId);
      }
    }

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
