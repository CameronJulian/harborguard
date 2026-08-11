type EvaluateCompletedTripPredictionInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  tripId: string;
};

const PREDICTION_POSITIVE_THRESHOLD = 35;

function evaluationClassification(
  predictedAdverseEvent: boolean,
  observedAdverseEvent: boolean
) {
  if (predictedAdverseEvent && observedAdverseEvent) {
    return "true_positive";
  }

  if (predictedAdverseEvent && !observedAdverseEvent) {
    return "false_positive";
  }

  if (!predictedAdverseEvent && observedAdverseEvent) {
    return "false_negative";
  }

  return "true_negative";
}

export async function evaluateCompletedTripPrediction({
  supabase,
  organizationId,
  vehicleId,
  tripId,
}: EvaluateCompletedTripPredictionInput) {
  const { data: existingEvaluation, error: existingEvaluationError } =
    await supabase
      .from("route_prediction_evaluations")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("trip_id", tripId)
      .maybeSingle();

  if (existingEvaluationError) {
    throw existingEvaluationError;
  }

  if (existingEvaluation) {
    return {
      created: false,
      alreadyExists: true,
    };
  }

  const { data: outcome, error: outcomeError } = await supabase
    .from("route_prediction_outcomes")
    .select(
      "id, completed_at, adverse_event_occurred"
    )
    .eq("organization_id", organizationId)
    .eq("vehicle_id", vehicleId)
    .eq("trip_id", tripId)
    .maybeSingle();

  if (outcomeError) {
    throw outcomeError;
  }

  if (!outcome) {
    return {
      created: false,
      alreadyExists: false,
      skipped: "missing_outcome",
    };
  }

  const { data: snapshot, error: snapshotError } = await supabase
    .from("route_prediction_snapshots")
    .select(
      "id, overall_risk_score, overall_risk_level, created_at, metadata"
    )
    .eq("organization_id", organizationId)
    .eq("vehicle_id", vehicleId)
    .eq("trip_id", tripId)
    .lte("created_at", outcome.completed_at)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapshotError) {
    throw snapshotError;
  }

  if (!snapshot) {
    return {
      created: false,
      alreadyExists: false,
      skipped: "missing_prediction_snapshot",
    };
  }

  const predictedRiskScore = Math.min(
    100,
    Math.max(0, Number(snapshot.overall_risk_score) || 0)
  );

  const predictedAdverseEvent =
    predictedRiskScore >= PREDICTION_POSITIVE_THRESHOLD;

  const observedAdverseEvent =
    Boolean(outcome.adverse_event_occurred);

  const classification = evaluationClassification(
    predictedAdverseEvent,
    observedAdverseEvent
  );

  const snapshotMetadata =
    snapshot.metadata &&
    typeof snapshot.metadata === "object"
      ? snapshot.metadata
      : {};

  const routeSoftCapShadow =
    snapshotMetadata.routeSoftCapShadow &&
    typeof snapshotMetadata.routeSoftCapShadow === "object"
      ? snapshotMetadata.routeSoftCapShadow
      : null;

  const shadowThreatRiskScore = Number(
    routeSoftCapShadow?.diagnosticRouteSoftCapThreatRiskScore
  );

  const shadowWeatherContribution = Number(
    snapshotMetadata.weatherContribution
  );

  const shadowTrafficContribution = Number(
    snapshotMetadata.trafficContribution
  );

  let routeSoftCapShadowEvaluation:
    | Record<string, unknown>
    | undefined;

  if (
    routeSoftCapShadow?.version === 1 &&
    Number.isFinite(shadowThreatRiskScore) &&
    shadowThreatRiskScore >= 0 &&
    shadowThreatRiskScore <= 100 &&
    Number.isFinite(shadowWeatherContribution) &&
    shadowWeatherContribution >= 0 &&
    shadowWeatherContribution <= 20 &&
    Number.isFinite(shadowTrafficContribution) &&
    shadowTrafficContribution >= 0 &&
    shadowTrafficContribution <= 20
  ) {
    const shadowOverallRiskScore =
      Math.min(
        100,
        shadowThreatRiskScore +
          shadowWeatherContribution +
          shadowTrafficContribution
      );

    const shadowOverallRiskLevel =
      shadowOverallRiskScore >= 80
        ? "CRITICAL"
        : shadowOverallRiskScore >= 60
          ? "HIGH"
          : shadowOverallRiskScore >= 35
            ? "MEDIUM"
            : "LOW";

    const shadowPredictedAdverseEvent =
      shadowOverallRiskScore >=
      PREDICTION_POSITIVE_THRESHOLD;

    const shadowClassification =
      evaluationClassification(
        shadowPredictedAdverseEvent,
        observedAdverseEvent
      );

    routeSoftCapShadowEvaluation = {
      version: 1,
      productionOverallRiskScore:
        predictedRiskScore,
      shadowThreatRiskScore,
      weatherContribution:
        shadowWeatherContribution,
      trafficContribution:
        shadowTrafficContribution,
      shadowOverallRiskScore,
      shadowOverallRiskLevel,
      predictionPositiveThreshold:
        PREDICTION_POSITIVE_THRESHOLD,
      shadowPredictedAdverseEvent,
      observedAdverseEvent,
      shadowClassification,
      productionClassification:
        classification,
      classificationAgreement:
        shadowClassification === classification,
      overallRiskScoreDelta:
        predictedRiskScore -
        shadowOverallRiskScore,
    };
  }

  const { error: insertError } = await supabase
    .from("route_prediction_evaluations")
    .insert({
      organization_id: organizationId,
      vehicle_id: vehicleId,
      trip_id: tripId,
      snapshot_id: snapshot.id,
      outcome_id: outcome.id,
      prediction_created_at: snapshot.created_at,
      outcome_completed_at: outcome.completed_at,
      predicted_risk_score: predictedRiskScore,
      predicted_risk_level: snapshot.overall_risk_level,
      prediction_positive_threshold:
        PREDICTION_POSITIVE_THRESHOLD,
      predicted_adverse_event: predictedAdverseEvent,
      observed_adverse_event: observedAdverseEvent,
      classification,
      metadata: {
        snapshotSelection:
          "latest_trip_prediction_at_or_before_completion",
        ...(routeSoftCapShadowEvaluation
          ? {
              routeSoftCapShadowEvaluation,
            }
          : {}),
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
    classification,
  };
}
