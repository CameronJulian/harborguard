type CompletedTripOutcomeInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string;
};

const OUTCOME_ALERT_TYPES = [
  "panic",
  "route_safety_threat",
  "harsh_braking",
  "harsh_cornering",
  "rapid_acceleration",
  "speeding",
  "gps_anomaly",
  "long_stop",
  "suspicious_stop",
] as const;

const SEVERITY_RANK: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export async function createCompletedTripOutcome({
  supabase,
  organizationId,
  vehicleId,
  tripId,
}: CompletedTripOutcomeInput) {
  const { data: existingOutcome, error: existingOutcomeError } =
    await supabase
      .from("route_prediction_outcomes")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("trip_id", tripId)
      .maybeSingle();

  if (existingOutcomeError) {
    throw existingOutcomeError;
  }

  if (existingOutcome) {
    return {
      created: false,
      alreadyExists: true,
    };
  }

  const { data: trip, error: tripError } = await supabase
    .from("vehicle_trips")
    .select(
      "id, vehicle_id, actual_departure, actual_arrival, status"
    )
    .eq("id", tripId)
    .eq("organization_id", organizationId)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (tripError) {
    throw tripError;
  }

  if (
    !trip ||
    trip.status !== "delivered" ||
    !trip.actual_departure ||
    !trip.actual_arrival
  ) {
    return {
      created: false,
      alreadyExists: false,
      skipped: true,
    };
  }

  const observationStartedAt = String(trip.actual_departure);
  const observationEndedAt = String(trip.actual_arrival);

  const { data: alerts, error: alertsError } = await supabase
    .from("vehicle_alerts")
    .select("id, alert_type, severity, created_at")
    .eq("organization_id", organizationId)
    .eq("vehicle_id", vehicleId)
    .eq("trip_id", tripId)
    .in("alert_type", [...OUTCOME_ALERT_TYPES])
    .gte("created_at", observationStartedAt)
    .lte("created_at", observationEndedAt)
    .order("created_at", { ascending: true });

  if (alertsError) {
    throw alertsError;
  }

  const observedAlerts = alerts || [];

  const countByType = (alertType: string) =>
    observedAlerts.filter(
      (alert: any) => alert.alert_type === alertType
    ).length;

  const highestAlertSeverity =
    observedAlerts.reduce(
      (
        highest: string | null,
        alert: any
      ) => {
        const severity = String(alert.severity || "").toLowerCase();

        if (!SEVERITY_RANK[severity]) {
          return highest;
        }

        if (!highest) {
          return severity;
        }

        return SEVERITY_RANK[severity] >
          SEVERITY_RANK[highest]
          ? severity
          : highest;
      },
      null
    );

  const { error: insertError } = await supabase
    .from("route_prediction_outcomes")
    .insert({
      organization_id: organizationId,
      vehicle_id: vehicleId,
      trip_id: tripId,
      completed_at: observationEndedAt,
      adverse_event_occurred: observedAlerts.length > 0,
      highest_alert_severity: highestAlertSeverity,
      total_alert_count: observedAlerts.length,
      panic_count: countByType("panic"),
      route_safety_threat_count:
        countByType("route_safety_threat"),
      harsh_braking_count: countByType("harsh_braking"),
      harsh_cornering_count:
        countByType("harsh_cornering"),
      rapid_acceleration_count:
        countByType("rapid_acceleration"),
      speeding_count: countByType("speeding"),
      gps_anomaly_count: countByType("gps_anomaly"),
      long_stop_count: countByType("long_stop"),
      suspicious_stop_count:
        countByType("suspicious_stop"),
      metadata: {
        observationStartedAt,
        observationEndedAt,
        evidenceSource: "trip_linked_vehicle_alerts",
      },
    });

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        created: false,
        alreadyExists: true,
      };
    }

    throw insertError;
  }

  return {
    created: true,
    alreadyExists: false,
  };
}
