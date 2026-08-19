import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  buildRouteRiskTrainingExample,
  type RouteRiskTrainingExample,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

const DEFAULT_PAGE_SIZE = 250;
const MAX_PAGE_SIZE = 1000;

type ReadRouteRiskTrainingExamplesParams = {
  supabase: SupabaseClient;
  organizationId: string;

  pageSize?: number;

  startOutcomeCompletedAt?: string;
  endOutcomeCompletedAt?: string;
};

type RoutePredictionEvaluationRow = {
  id: string;
  organization_id: string;
  vehicle_id: string | null;
  trip_id: string;
  snapshot_id: string;
  outcome_id: string;
  prediction_created_at: string;
  outcome_completed_at: string;
  observed_adverse_event: boolean;
};

type RoutePredictionSnapshotRow = {
  id: string;
  overall_risk_score: number;
  threat_risk_score: number;
  weather_risk_score: number;
  traffic_risk_score: number;
};

function parseOptionalTimestamp(
  value: string | undefined,
  fieldName: string
) {
  if (value === undefined) {
    return undefined;
  }

  const timestamp = Date.parse(value);

  if (!Number.isFinite(timestamp)) {
    throw new Error(
      `Invalid ${fieldName}: expected a valid timestamp.`
    );
  }

  return new Date(timestamp).toISOString();
}

function normalizePageSize(
  value: number | undefined
) {
  if (value === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  if (
    !Number.isInteger(value) ||
    value <= 0 ||
    value > MAX_PAGE_SIZE
  ) {
    throw new Error(
      `Invalid pageSize: expected an integer between 1 and ${MAX_PAGE_SIZE}.`
    );
  }

  return value;
}

function requireNonEmptyString(
  value: string,
  fieldName: string
) {
  if (value.trim().length === 0) {
    throw new Error(
      `Invalid ${fieldName}: expected a non-empty string.`
    );
  }

  return value;
}

export async function readRouteRiskTrainingExamples({
  supabase,
  organizationId,
  pageSize: requestedPageSize,
  startOutcomeCompletedAt,
  endOutcomeCompletedAt,
}: ReadRouteRiskTrainingExamplesParams): Promise<
  RouteRiskTrainingExample[]
> {
  requireNonEmptyString(
    organizationId,
    "organizationId"
  );

  const pageSize =
    normalizePageSize(
      requestedPageSize
    );

  const normalizedStart =
    parseOptionalTimestamp(
      startOutcomeCompletedAt,
      "startOutcomeCompletedAt"
    );

  const normalizedEnd =
    parseOptionalTimestamp(
      endOutcomeCompletedAt,
      "endOutcomeCompletedAt"
    );

  if (
    normalizedStart !== undefined &&
    normalizedEnd !== undefined &&
    Date.parse(normalizedStart) >
      Date.parse(normalizedEnd)
  ) {
    throw new Error(
      "Invalid date range: startOutcomeCompletedAt cannot be after endOutcomeCompletedAt."
    );
  }

  const examples:
    RouteRiskTrainingExample[] = [];

  let cursorOutcomeCompletedAt:
    string | undefined;

  let cursorId:
    string | undefined;

  while (true) {
    let evaluationsQuery =
      supabase
        .from(
          "route_prediction_evaluations"
        )
        .select(
          "id,organization_id,vehicle_id,trip_id,snapshot_id,outcome_id,prediction_created_at,outcome_completed_at,observed_adverse_event"
        )
        .eq(
          "organization_id",
          organizationId
        )
        .order(
          "outcome_completed_at",
          {
            ascending: true,
          }
        )
        .order(
          "id",
          {
            ascending: true,
          }
        )
        .limit(
          pageSize
        );

    if (
      cursorOutcomeCompletedAt !== undefined &&
      cursorId !== undefined
    ) {
      evaluationsQuery =
        evaluationsQuery.or(
          [
            `outcome_completed_at.gt.${cursorOutcomeCompletedAt}`,
            [
              "and(",
              `outcome_completed_at.eq.${cursorOutcomeCompletedAt},`,
              `id.gt.${cursorId}`,
              ")",
            ].join(""),
          ].join(",")
        );
    }
    if (normalizedStart !== undefined) {
      evaluationsQuery =
        evaluationsQuery.gte(
          "outcome_completed_at",
          normalizedStart
        );
    }

    if (normalizedEnd !== undefined) {
      evaluationsQuery =
        evaluationsQuery.lte(
          "outcome_completed_at",
          normalizedEnd
        );
    }

    const {
      data: evaluationData,
      error: evaluationError,
    } =
      await evaluationsQuery;

    if (evaluationError) {
      throw evaluationError;
    }

    const evaluations =
      (evaluationData ?? []) as
        RoutePredictionEvaluationRow[];

    if (evaluations.length === 0) {
      break;
    }

    const snapshotIds =
      Array.from(
        new Set(
          evaluations.map(
            (evaluation) =>
              evaluation.snapshot_id
          )
        )
      );

    const {
      data: snapshotData,
      error: snapshotError,
    } =
      await supabase
        .from(
          "route_prediction_snapshots"
        )
        .select(
          "id,overall_risk_score,threat_risk_score,weather_risk_score,traffic_risk_score"
        )
        .eq(
          "organization_id",
          organizationId
        )
        .in(
          "id",
          snapshotIds
        );

    if (snapshotError) {
      throw snapshotError;
    }

    const snapshots =
      (snapshotData ?? []) as
        RoutePredictionSnapshotRow[];

    const snapshotById =
      new Map(
        snapshots.map(
          (snapshot) => [
            snapshot.id,
            snapshot,
          ]
        )
      );

    for (const evaluation of evaluations) {
      if (
        evaluation.organization_id !==
        organizationId
      ) {
        throw new Error(
          `Invalid evaluation ${evaluation.id}: organization mismatch.`
        );
      }

      const snapshot =
        snapshotById.get(
          evaluation.snapshot_id
        );

      if (!snapshot) {
        throw new Error(
          `Invalid evaluation ${evaluation.id}: referenced prediction snapshot ${evaluation.snapshot_id} was not found.`
        );
      }

      examples.push(
        buildRouteRiskTrainingExample({
          organizationId:
            evaluation.organization_id,

          vehicleId:
            evaluation.vehicle_id,

          tripId:
            evaluation.trip_id,

          snapshotId:
            evaluation.snapshot_id,

          outcomeId:
            evaluation.outcome_id,

          predictionCreatedAt:
            evaluation.prediction_created_at,

          outcomeCompletedAt:
            evaluation.outcome_completed_at,

          overallRiskScore:
            snapshot.overall_risk_score,

          threatRiskScore:
            snapshot.threat_risk_score,

          weatherRiskScore:
            snapshot.weather_risk_score,

          trafficRiskScore:
            snapshot.traffic_risk_score,

          observedAdverseEvent:
            evaluation.observed_adverse_event,
        })
      );
    }

    if (evaluations.length < pageSize) {
      break;
    }

    const finalEvaluation =
      evaluations[
        evaluations.length - 1
      ];

    cursorOutcomeCompletedAt =
      finalEvaluation.outcome_completed_at;

    cursorId =
      finalEvaluation.id;
  }

  return examples;
}
