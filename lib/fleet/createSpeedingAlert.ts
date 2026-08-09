export type SpeedingCandidate = {
  speedKmh: number;
  thresholdKmh: number;
  durationSeconds: number;
  consecutiveSamples: number;
};

export type CreateSpeedingAlertInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  latitude: number;
  longitude: number;
  candidate: SpeedingCandidate;
};

export type CreateSpeedingAlertResult = {
  created: boolean;
  skippedByCooldown: boolean;
  error: string | null;
};

const SPEEDING_COOLDOWN_MINUTES = 10;
const SPEEDING_INTELLIGENCE_SCORE = 30;

export async function createSpeedingAlert(
  input: CreateSpeedingAlertInput
): Promise<CreateSpeedingAlertResult> {
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
        SPEEDING_COOLDOWN_MINUTES *
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
      .eq("alert_type", "speeding")
      .eq("is_resolved", false)
      .gte("created_at", cooldownSince)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentAlertError) {
      console.error(
        "Speeding cooldown lookup failed:",
        recentAlertError
      );

      return {
        created: false,
        skippedByCooldown: false,
        error:
          recentAlertError.message ||
          String(recentAlertError),
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
      "Sustained speeding detected: " +
      `${candidate.speedKmh} km/h, ` +
      `above the effective ${candidate.thresholdKmh} km/h threshold ` +
      `for ${candidate.durationSeconds} seconds across ` +
      `${candidate.consecutiveSamples} consecutive samples.`;

    const narrative =
      "Sustained fleet telemetry candidate based on consecutive samples. " +
      "Speeding analysis uses available road-speed context and falls back to the configured threshold when road-speed context is unavailable. " +
      `Coordinates: ${latitude}, ${longitude}. ` +
      "The sequence requires contextual review and has not " +
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
          alert_type: "speeding",
          severity: "medium",
          message,
          is_resolved: false,
          intelligence_score:
            SPEEDING_INTELLIGENCE_SCORE,
          behavioral_risk: "medium",
          intelligence_narrative: narrative,
        });

    if (insertError) {
      console.error(
        "Speeding alert insert failed:",
        insertError
      );

      return {
        created: false,
        skippedByCooldown: false,
        error:
          insertError.message ||
          String(insertError),
      };
    }

    return {
      created: true,
      skippedByCooldown: false,
      error: null,
    };
  } catch (error) {
    console.error(
      "Speeding detection failed:",
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
