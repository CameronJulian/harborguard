import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export type EvaluateCompletedTripRouteRiskShadowPredictionsInput = {
  supabase: SupabaseClient;
  organizationId: string;
  vehicleId: string;
  tripId: string;
};

export type EvaluateCompletedTripRouteRiskShadowPredictionsResult = {
  created: number;
  alreadyExists: number;
  skipped:
    | "missing_outcome"
    | null;
};

function requireNonBlankString(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a non-blank string.`
    );
  }

  return value;
}

function requireTimestamp(
  value: unknown,
  fieldName: string
): string {
  const timestamp =
    requireNonBlankString(
      value,
      fieldName
    );

  if (
    Number.isNaN(
      new Date(timestamp).getTime()
    )
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a timestamp.`
    );
  }

  return timestamp;
}

function requireProbability(
  value: unknown
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "Invalid shadow prediction probability."
    );
  }

  return value;
}

export async function evaluateCompletedTripRouteRiskShadowPredictions({
  supabase,
  organizationId,
  vehicleId,
  tripId,
}: EvaluateCompletedTripRouteRiskShadowPredictionsInput): Promise<
  EvaluateCompletedTripRouteRiskShadowPredictionsResult
> {
  const normalizedOrganizationId =
    requireNonBlankString(
      organizationId,
      "organizationId"
    );

  const normalizedVehicleId =
    requireNonBlankString(
      vehicleId,
      "vehicleId"
    );

  const normalizedTripId =
    requireNonBlankString(
      tripId,
      "tripId"
    );

  const {
    data: outcome,
    error: outcomeError,
  } =
    await supabase
      .from(
        "route_prediction_outcomes"
      )
      .select(
        "id, organization_id, vehicle_id, trip_id, completed_at, adverse_event_occurred"
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .eq(
        "vehicle_id",
        normalizedVehicleId
      )
      .eq(
        "trip_id",
        normalizedTripId
      )
      .maybeSingle();

  if (outcomeError) {
    throw new Error(
      "Failed to read completed-trip route prediction outcome: " +
        outcomeError.message
    );
  }

  if (!outcome) {
    return {
      created: 0,
      alreadyExists: 0,
      skipped: "missing_outcome",
    };
  }

  const outcomeId =
    requireNonBlankString(
      outcome.id,
      "outcome.id"
    );

  const outcomeCompletedAt =
    requireTimestamp(
      outcome.completed_at,
      "outcome.completed_at"
    );

  if (
    typeof outcome.adverse_event_occurred !==
    "boolean"
  ) {
    throw new Error(
      "Invalid outcome.adverse_event_occurred."
    );
  }

  const {
    data: snapshots,
    error: snapshotsError,
  } =
    await supabase
      .from(
        "route_prediction_snapshots"
      )
      .select(
        "id"
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .eq(
        "trip_id",
        normalizedTripId
      );

  if (snapshotsError) {
    throw new Error(
      "Failed to read completed-trip production snapshots: " +
        snapshotsError.message
    );
  }

  const snapshotIds =
    (snapshots || []).map(
      (snapshot) =>
        requireNonBlankString(
          snapshot.id,
          "snapshot.id"
        )
    );

  if (snapshotIds.length === 0) {
    return {
      created: 0,
      alreadyExists: 0,
      skipped: null,
    };
  }

  const {
    data: predictions,
    error: predictionsError,
  } =
    await supabase
      .from(
        "route_risk_shadow_predictions"
      )
      .select(
        "id, organization_id, production_snapshot_id, model_registry_id, training_run_id, evidence_cycle_id, predicted_probability, created_at"
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .in(
        "production_snapshot_id",
        snapshotIds
      )
      .lte(
        "created_at",
        outcomeCompletedAt
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

  if (predictionsError) {
    throw new Error(
      "Failed to read completed-trip route-risk shadow predictions: " +
        predictionsError.message
    );
  }

  if (!predictions?.length) {
    return {
      created: 0,
      alreadyExists: 0,
      skipped: null,
    };
  }

  const predictionIds =
    predictions.map(
      (prediction) =>
        requireNonBlankString(
          prediction.id,
          "prediction.id"
        )
    );

  const {
    data: existingEvaluations,
    error: existingEvaluationsError,
  } =
    await supabase
      .from(
        "route_risk_shadow_evaluations"
      )
      .select(
        "shadow_prediction_id"
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .in(
        "shadow_prediction_id",
        predictionIds
      );

  if (existingEvaluationsError) {
    throw new Error(
      "Failed to read existing route-risk shadow evaluations: " +
        existingEvaluationsError.message
    );
  }

  const existingPredictionIds =
    new Set(
      (existingEvaluations || []).map(
        (evaluation) =>
          requireNonBlankString(
            evaluation.shadow_prediction_id,
            "evaluation.shadow_prediction_id"
          )
      )
    );

  let created = 0;
  let alreadyExists =
    existingPredictionIds.size;

  for (const prediction of predictions) {
    const shadowPredictionId =
      requireNonBlankString(
        prediction.id,
        "prediction.id"
      );

    if (
      existingPredictionIds.has(
        shadowPredictionId
      )
    ) {
      continue;
    }

    const predictionCreatedAt =
      requireTimestamp(
        prediction.created_at,
        "prediction.created_at"
      );

    const { error: insertError } =
      await supabase
        .from(
          "route_risk_shadow_evaluations"
        )
        .insert({
          organization_id:
            normalizedOrganizationId,
          shadow_prediction_id:
            shadowPredictionId,
          production_snapshot_id:
            requireNonBlankString(
              prediction.production_snapshot_id,
              "prediction.production_snapshot_id"
            ),
          outcome_id:
            outcomeId,
          trip_id:
            normalizedTripId,
          model_registry_id:
            requireNonBlankString(
              prediction.model_registry_id,
              "prediction.model_registry_id"
            ),
          training_run_id:
            requireNonBlankString(
              prediction.training_run_id,
              "prediction.training_run_id"
            ),
          evidence_cycle_id:
            requireNonBlankString(
              prediction.evidence_cycle_id,
              "prediction.evidence_cycle_id"
            ),
          prediction_created_at:
            predictionCreatedAt,
          outcome_completed_at:
            outcomeCompletedAt,
          predicted_probability:
            requireProbability(
              prediction.predicted_probability
            ),
          observed_adverse_event:
            outcome.adverse_event_occurred,
          metadata: {},
        });

    if (insertError) {
      if (insertError.code === "23505") {
        alreadyExists += 1;
        continue;
      }

      throw new Error(
        "Failed to persist completed-trip route-risk shadow evaluation: " +
          insertError.message
      );
    }

    created += 1;
  }

  return {
    created,
    alreadyExists,
    skipped: null,
  };
}
