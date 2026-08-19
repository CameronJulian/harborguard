import type {
  RouteRiskTrainingExample,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

import {
  evaluateRouteRiskLogisticBaseline,
  type RouteRiskLogisticEvaluationResult,
} from "@/lib/fleet/evaluateRouteRiskLogisticBaseline";

import {
  evaluateRouteRiskNeuralCandidate,
  type RouteRiskNeuralEvaluationResult,
} from "@/lib/fleet/evaluateRouteRiskNeuralCandidate";

import {
  ROUTE_RISK_LOGISTIC_BASELINE_VERSION,
} from "@/lib/fleet/trainRouteRiskLogisticBaseline";
import {
  ROUTE_RISK_NEURAL_CANDIDATE_VERSION,
} from "@/lib/fleet/trainRouteRiskNeuralCandidate";

import type {
  RouteRiskModelArtifact,
} from "@/lib/fleet/routeRiskModelArtifact";

export type RouteRiskModelEvaluation =
  | RouteRiskLogisticEvaluationResult
  | RouteRiskNeuralEvaluationResult;

export type EvaluateRouteRiskModelInput = {
  model:
    RouteRiskModelArtifact;

  examples:
    readonly RouteRiskTrainingExample[];

  threshold:
    number;
};

/**
 * Generic HarborGuard route-risk evaluation boundary.
 *
 * Evaluation dispatch is determined by immutable model algorithm identity.
 * The logistic evaluator remains the sole registered evaluation adapter.
 *
 * This helper performs no threshold search, persistence, lifecycle mutation,
 * candidate registration, activation, or production Route Safety mutation.
 */
export function evaluateRouteRiskModel({
  model,
  examples,
  threshold,
}: EvaluateRouteRiskModelInput): RouteRiskModelEvaluation {
  switch (model.algorithmVersion) {
    case ROUTE_RISK_LOGISTIC_BASELINE_VERSION:
      return evaluateRouteRiskLogisticBaseline({
        model,
        examples,
        threshold,
      });

    case ROUTE_RISK_NEURAL_CANDIDATE_VERSION:
      return evaluateRouteRiskNeuralCandidate({
        model,
        examples,
        threshold,
      });

    default:
      throw new Error(
        "Unsupported route-risk evaluation algorithm version."
      );
  }
}
