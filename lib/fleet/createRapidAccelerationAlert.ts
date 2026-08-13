import type {
  BehaviorTrafficCalmingContext,
} from "@/lib/fleet/resolveBehaviorTrafficCalmingContext";
import type {
  BehaviorPedestrianContext,
} from "@/lib/fleet/resolveBehaviorPedestrianContext";
import {
  findRapidAccelerationCorroboration,
} from "@/lib/fleet/rapidAccelerationCorroboration";

export type RapidAccelerationCandidate = {
  previousSpeedKmh: number;
  currentSpeedKmh: number;
  speedIncreaseKmh: number;
  intervalSeconds: number;
  accelerationMps2: number;
};

export type CreateRapidAccelerationAlertInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  latitude: number;
  longitude: number;
  source: "mobile" | "hardware" | "manual";
  trafficCalmingContext:
    | BehaviorTrafficCalmingContext
    | null;
  pedestrianContext:
    | BehaviorPedestrianContext
    | null;
  candidate: RapidAccelerationCandidate;
};

export type CreateRapidAccelerationAlertResult = {
  created: boolean;
  skippedByCooldown: boolean;
  error: string | null;
};

const RAPID_ACCELERATION_COOLDOWN_MINUTES = 10;
const RAPID_ACCELERATION_INTELLIGENCE_SCORE = 35;

export async function createRapidAccelerationAlert(
  input: CreateRapidAccelerationAlertInput
): Promise<CreateRapidAccelerationAlertResult> {
  const {
    supabase,
    organizationId,
    vehicleId,
    tripId,
    latitude,
    longitude,
    source,
    trafficCalmingContext,
    pedestrianContext,
    candidate,
  } = input;

  try {
    const cooldownSince = new Date(
      Date.now() -
        RAPID_ACCELERATION_COOLDOWN_MINUTES *
          60 *
          1000
    ).toISOString();

    const {
      data: recentAlert,
      error: recentAlertError,
    } = await supabase
      .from("vehicle_alerts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("vehicle_id", vehicleId)
      .eq("alert_type", "rapid_acceleration")
      .eq("is_resolved", false)
      .gte("created_at", cooldownSince)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentAlertError) {
      console.error(
        "Rapid acceleration cooldown lookup failed:",
        recentAlertError
      );

      return {
        created: false,
        skippedByCooldown: false,
        error: recentAlertError.message || String(recentAlertError),
      };
    }

    if (recentAlert) {
      return {
        created: false,
        skippedByCooldown: true,
        error: null,
      };
    }

    const message =
      "Rapid acceleration candidate detected: " +
      `${candidate.previousSpeedKmh} km/h to ` +
      `${candidate.currentSpeedKmh} km/h over ` +
      `${candidate.intervalSeconds} seconds ` +
      `(${candidate.accelerationMps2} m/s2).`;

    const narrative =
      "Low-confidence fleet telemetry candidate. " +
      "Speed increase: " +
      `${candidate.speedIncreaseKmh} km/h. ` +
      `Coordinates: ${latitude}, ${longitude}. ` +
      "This event requires corroboration and has not " +
      "been classified as a verified road incident.";

    const { error: insertError } =
      await supabase
        .from("vehicle_alerts")
        .insert({
          organization_id: organizationId,
          vehicle_id: vehicleId,
          trip_id: tripId,
          latitude,
          longitude,
          alert_type: "rapid_acceleration",
          severity: "medium",
          message,
          is_resolved: false,
          intelligence_score:
            RAPID_ACCELERATION_INTELLIGENCE_SCORE,
          behavioral_risk: "medium",
          intelligence_narrative: narrative,
          telemetry_evidence: {
            ...candidate,
            source,
            trafficCalmingContext,
            pedestrianContext,
          },
        });

    if (insertError) {
      console.error(
        "Rapid acceleration alert insert failed:",
        insertError
      );

      return {
        created: false,
        skippedByCooldown: false,
        error: insertError.message || String(insertError),
      };
    }

    try {
      const corroboration =
        await findRapidAccelerationCorroboration({
          supabase,
          organizationId,
          currentVehicleId: vehicleId,
          latitude,
          longitude,
        });

      console.info(
        "[rapid-acceleration corroboration diagnostic]",
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
    }
    catch (corroborationError) {
      console.error(
        "[rapid-acceleration corroboration diagnostic failed]",
        corroborationError
      );
    }
    return {
      created: true,
      skippedByCooldown: false,
      error: null,
    };
  } catch (error) {
    console.error(
      "Rapid acceleration detection failed:",
      error
    );

    return {
      created: false,
      skippedByCooldown: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}
