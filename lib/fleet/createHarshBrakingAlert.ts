import {
  findHarshBrakingCorroboration,
} from "@/lib/fleet/harshBrakingCorroboration";
import {
  createTelemetryObservation,
} from "@/lib/route-safety/createTelemetryObservation";
import {
  promoteHarshBrakingTelemetry,
} from "@/lib/route-safety/promoteHarshBrakingTelemetry";

export type HarshBrakingCandidate = {
  previousSpeedKmh: number;
  currentSpeedKmh: number;
  speedDropKmh: number;
  intervalSeconds: number;
  decelerationMps2: number;
};

export type CreateHarshBrakingAlertInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  latitude: number;
  longitude: number;
  candidate: HarshBrakingCandidate;
};

export type CreateHarshBrakingAlertResult = {
  created: boolean;
  skippedByCooldown: boolean;
  telemetryObservationCreated: boolean;
  error: string | null;
};

const HARSH_BRAKING_COOLDOWN_MINUTES = 10;
const HARSH_BRAKING_INTELLIGENCE_SCORE = 35;

export async function createHarshBrakingAlert(
  input: CreateHarshBrakingAlertInput
): Promise<CreateHarshBrakingAlertResult> {
  const {
    supabase,
    organizationId,
    vehicleId,
    tripId,
    latitude,
    longitude,
    candidate,
  } = input;

  try {
    const cooldownSince = new Date(
      Date.now() -
        HARSH_BRAKING_COOLDOWN_MINUTES *
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
      .eq("alert_type", "harsh_braking")
      .eq("is_resolved", false)
      .gte("created_at", cooldownSince)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentAlertError) {
      console.error(
        "Harsh braking cooldown lookup failed:",
        recentAlertError
      );

      return {
        created: false,
        skippedByCooldown: false,
        telemetryObservationCreated: false,
        error:
          recentAlertError.message ||
          String(recentAlertError),
      };
    }

    if (recentAlert) {
      return {
        created: false,
        skippedByCooldown: true,
        telemetryObservationCreated: false,
        error: null,
      };
    }

    const message =
      "Harsh braking candidate detected: " +
      `${candidate.previousSpeedKmh} km/h to ` +
      `${candidate.currentSpeedKmh} km/h over ` +
      `${candidate.intervalSeconds} seconds ` +
      `(${candidate.decelerationMps2} m/s2).`;

    const narrative =
      "Low-confidence fleet telemetry candidate. " +
      "Speed reduction: " +
      `${candidate.speedDropKmh} km/h. ` +
      `Coordinates: ${latitude}, ${longitude}. ` +
      "This event requires corroboration and has not " +
      "been classified as a verified road incident.";

    const {
      data: insertedAlert,
      error: insertError,
    } =
      await supabase
        .from("vehicle_alerts")
        .insert({
          organization_id: organizationId,
          vehicle_id: vehicleId,
          trip_id: tripId,
          latitude,
          longitude,
          alert_type: "harsh_braking",
          severity: "medium",
          message,
          is_resolved: false,
          intelligence_score:
            HARSH_BRAKING_INTELLIGENCE_SCORE,
          behavioral_risk: "medium",
          intelligence_narrative: narrative,
          telemetry_evidence: candidate,
        })
        .select("id")
        .single();

    if (insertError) {
      console.error(
        "Harsh braking alert insert failed:",
        insertError
      );

      return {
        created: false,
        skippedByCooldown: false,
        telemetryObservationCreated: false,
        error:
          insertError.message ||
          String(insertError),
      };
    }

    let telemetryObservationCreated = false;

    try {
      const corroboration =
        await findHarshBrakingCorroboration({
          supabase,
          organizationId,
          currentVehicleId: vehicleId,
          latitude,
          longitude,
        });

      const occurredAt =
        new Date().toISOString();

      const telemetryObservation =
        await createTelemetryObservation({
          organizationId,
          latitude,
          longitude,
          corroboration,
          occurredAt,
          sourceVehicleId: vehicleId,
        });

      telemetryObservationCreated = true;

      if (
        corroboration.thresholdMet &&
        insertedAlert?.id
      ) {
        const promotion =
          await promoteHarshBrakingTelemetry({
            supabase,
            organizationId,
            vehicleAlertId:
              String(insertedAlert.id),
            vehicleId,
            tripId,
            latitude,
            longitude,
            occurredAt,
            candidate,
            corroboration,
          });

        console.info(
          "[harsh-braking road intelligence promotion]",
          promotion
        );
      }

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

    return {
      created: true,
      skippedByCooldown: false,
      telemetryObservationCreated,
      error: null,
    };
  } catch (error) {
    console.error(
      "Harsh braking detection failed:",
      error
    );

    return {
      created: false,
      skippedByCooldown: false,
      telemetryObservationCreated: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}
