import {
  findHarshCorneringCorroboration,
} from "@/lib/fleet/harshCorneringCorroboration";

export type HarshCorneringCandidate = {
  previousHeading: number;
  currentHeading: number;
  headingChangeDegrees: number;
  speedKmh: number;
  intervalSeconds: number;
};

export type CreateHarshCorneringAlertInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  latitude: number;
  longitude: number;
  candidate: HarshCorneringCandidate;
};

export type CreateHarshCorneringAlertResult = {
  created: boolean;
  skippedByCooldown: boolean;
  error: string | null;
};

const HARSH_CORNERING_COOLDOWN_MINUTES = 10;
const HARSH_CORNERING_INTELLIGENCE_SCORE = 35;

export async function createHarshCorneringAlert(
  input: CreateHarshCorneringAlertInput
): Promise<CreateHarshCorneringAlertResult> {
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
        HARSH_CORNERING_COOLDOWN_MINUTES *
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
      .eq("alert_type", "harsh_cornering")
      .eq("is_resolved", false)
      .gte("created_at", cooldownSince)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentAlertError) {
      console.error(
        "Harsh cornering cooldown lookup failed:",
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
      "Harsh cornering candidate detected: " +
      `${candidate.headingChangeDegrees} degree heading change ` +
      `at ${candidate.speedKmh} km/h over ` +
      `${candidate.intervalSeconds} seconds.`;

    const narrative =
      "Low-confidence fleet telemetry candidate. " +
      `Heading changed from ${candidate.previousHeading} degrees ` +
      `to ${candidate.currentHeading} degrees. ` +
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
          alert_type: "harsh_cornering",
          severity: "medium",
          message,
          is_resolved: false,
          intelligence_score:
            HARSH_CORNERING_INTELLIGENCE_SCORE,
          behavioral_risk: "medium",
          intelligence_narrative: narrative,
          telemetry_evidence: candidate,
        });

    if (insertError) {
      console.error(
        "Harsh cornering alert insert failed:",
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

    try {
      const corroboration =
        await findHarshCorneringCorroboration({
          supabase,
          organizationId,
          currentVehicleId: vehicleId,
          latitude,
          longitude,
        });

      console.info(
        "[harsh-cornering corroboration diagnostic]",
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
        "[harsh-cornering corroboration diagnostic failed]",
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
      "Harsh cornering detection failed:",
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
