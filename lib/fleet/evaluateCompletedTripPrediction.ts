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
      "id, overall_risk_score, overall_risk_level, created_at"
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
