import type {
  RouteRiskTrainingExample,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

import {
  calculateRoutePredictionPerformance,
  type RoutePredictionClassification,
  type RoutePredictionPerformance,
} from "@/lib/fleet/calculateRoutePredictionPerformance";

import {
  parseRouteRiskNeuralCandidateModel,
} from "@/lib/fleet/parseRouteRiskNeuralCandidateModel";

import {
  scoreRouteRiskNeuralCandidate,
} from "@/lib/fleet/scoreRouteRiskNeuralCandidate";

import {
  ROUTE_RISK_NEURAL_CANDIDATE_VERSION,
  type RouteRiskNeuralCandidateModel,
} from "@/lib/fleet/trainRouteRiskNeuralCandidate";

export const ROUTE_RISK_NEURAL_EVALUATION_VERSION =
  "harborguard-route-risk-neural-evaluation-v1" as const;

export type EvaluateRouteRiskNeuralCandidateInput = {
  model:
    RouteRiskNeuralCandidateModel;

  examples:
    readonly RouteRiskTrainingExample[];

  threshold:
    number;
};

export type RouteRiskNeuralEvaluationRow = {
  tripId: string;
  observedAdverseEvent: boolean;
  predictedProbability: number;
  predictedAdverseEvent: boolean;
  classification:
    RoutePredictionClassification;
};

export type RouteRiskNeuralEvaluationResult = {
  evaluationVersion:
    typeof ROUTE_RISK_NEURAL_EVALUATION_VERSION;

  algorithmVersion:
    typeof ROUTE_RISK_NEURAL_CANDIDATE_VERSION;

  threshold:
    number;

  exampleCount:
    number;

  rows:
    RouteRiskNeuralEvaluationRow[];

  performance:
    RoutePredictionPerformance;
};

function validateThreshold(
  threshold: number
) {
  if (
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 1
  ) {
    throw new Error(
      "Invalid threshold: expected a finite probability between 0 and 1."
    );
  }

  return threshold;
}

function classify(
  predictedAdverseEvent: boolean,
  observedAdverseEvent: boolean
): RoutePredictionClassification {
  if (
    predictedAdverseEvent &&
    observedAdverseEvent
  ) {
    return "true_positive";
  }

  if (
    predictedAdverseEvent &&
    !observedAdverseEvent
  ) {
    return "false_positive";
  }

  if (
    !predictedAdverseEvent &&
    observedAdverseEvent
  ) {
    return "false_negative";
  }

  return "true_negative";
}

function compareRows(
  left: RouteRiskNeuralEvaluationRow,
  right: RouteRiskNeuralEvaluationRow
) {
  return left.tripId.localeCompare(
    right.tripId
  );
}

/**
 * Evaluates one trained neural route-risk candidate against supplied
 * validation or test examples.
 *
 * The caller supplies the analysis threshold explicitly.
 *
 * This helper:
 *
 * - validates the persisted neural artifact before evaluation;
 * - scores only the supplied examples;
 * - uses the shared HarborGuard route-prediction performance contract;
 * - sorts rows deterministically by trip identity;
 * - does not search or select thresholds;
 * - does not persist results;
 * - does not mutate lifecycle state;
 * - does not register, promote or activate a model;
 * - does not modify production Route Safety behavior.
 */
export function evaluateRouteRiskNeuralCandidate({
  model,
  examples,
  threshold,
}: EvaluateRouteRiskNeuralCandidateInput): RouteRiskNeuralEvaluationResult {
  const validatedModel =
    parseRouteRiskNeuralCandidateModel(
      model
    );

  const normalizedThreshold =
    validateThreshold(
      threshold
    );

  const rows =
    examples.map(
      (
        example
      ): RouteRiskNeuralEvaluationRow => {
        const {
          predictedProbability,
        } =
          scoreRouteRiskNeuralCandidate({
            model:
              validatedModel,

            features:
              example.features,
          });

        if (
          !Number.isFinite(
            predictedProbability
          ) ||
          predictedProbability < 0 ||
          predictedProbability > 1
        ) {
          throw new Error(
            "Route-risk neural evaluation produced an invalid probability."
          );
        }

        const predictedAdverseEvent =
          predictedProbability >=
          normalizedThreshold;

        const observedAdverseEvent =
          example.label
            .observedAdverseEvent;

        return {
          tripId:
            example.provenance.tripId,

          observedAdverseEvent,

          predictedProbability,

          predictedAdverseEvent,

          classification:
            classify(
              predictedAdverseEvent,
              observedAdverseEvent
            ),
        };
      }
    )
    .sort(compareRows);

  const performance =
    calculateRoutePredictionPerformance(
      rows.map(
        (row) => ({
          classification:
            row.classification,
        })
      )
    );

  return {
    evaluationVersion:
      ROUTE_RISK_NEURAL_EVALUATION_VERSION,

    algorithmVersion:
      ROUTE_RISK_NEURAL_CANDIDATE_VERSION,

    threshold:
      normalizedThreshold,

    exampleCount:
      rows.length,

    rows,

    performance,
  };
}
