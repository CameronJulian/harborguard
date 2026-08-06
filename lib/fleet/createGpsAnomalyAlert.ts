export type CreateGpsAnomalyAlertInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string | null;
  previousLatitude: number;
  previousLongitude: number;
  rejectedLatitude: number;
  rejectedLongitude: number;
  distanceMeters: number;
  intervalSeconds: number;
  calculatedSpeedKmh: number;
  maximumAllowedSpeedKmh: number;
};

export type CreateGpsAnomalyAlertResult = {
  created: boolean;
  skippedByCooldown: boolean;
  error: string | null;
};

const GPS_ANOMALY_COOLDOWN_MINUTES = 10;
const GPS_ANOMALY_INTELLIGENCE_SCORE = 60;

export async function createGpsAnomalyAlert(
  input: CreateGpsAnomalyAlertInput
): Promise<CreateGpsAnomalyAlertResult> {
  const {
    supabase,
    organizationId,
    vehicleId,
    tripId,
    previousLatitude,
    previousLongitude,
    rejectedLatitude,
    rejectedLongitude,
    distanceMeters,
    intervalSeconds,
    calculatedSpeedKmh,
    maximumAllowedSpeedKmh,
  } = input;

  try {
    const cooldownSince = new Date(
      Date.now() -
        GPS_ANOMALY_COOLDOWN_MINUTES *
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
      .eq("alert_type", "gps_anomaly")
      .eq("is_resolved", false)
      .gte("created_at", cooldownSince)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentAlertError) {
      console.error(
        "GPS anomaly cooldown lookup failed:",
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

    const roundedCalculatedSpeedKmh =
      Math.round(calculatedSpeedKmh * 10) / 10;

    const roundedDistanceMeters =
      Math.round(distanceMeters * 10) / 10;

    const roundedIntervalSeconds =
      Math.round(intervalSeconds * 10) / 10;

    const message =
      "GPS anomaly candidate detected: " +
      `${roundedDistanceMeters} meters over ` +
      `${roundedIntervalSeconds} seconds, ` +
      `implying ${roundedCalculatedSpeedKmh} km/h.`;

    const narrative =
      "High-confidence telemetry integrity anomaly. " +
      `Previous coordinates: ${previousLatitude}, ${previousLongitude}. ` +
      `Rejected coordinates: ${rejectedLatitude}, ${rejectedLongitude}. ` +
      "Calculated speed exceeded the " +
      `${maximumAllowedSpeedKmh} km/h validation threshold. ` +
      "The rejected point was not stored as a valid " +
      "vehicle location and has not been classified " +
      "as a verified road incident.";

    const { error: insertError } =
      await supabase
        .from("vehicle_alerts")
        .insert({
          organization_id: organizationId,
          vehicle_id: vehicleId,
          trip_id: tripId,
          alert_type: "gps_anomaly",
          severity: "high",
          message,
          is_resolved: false,
          intelligence_score:
            GPS_ANOMALY_INTELLIGENCE_SCORE,
          behavioral_risk: "high",
          intelligence_narrative: narrative,
        });

    if (insertError) {
      console.error(
        "GPS anomaly alert insert failed:",
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
      "GPS anomaly alerting failed:",
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
