import type {
  RouteRiskTrainingExample,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

import {
  calculateRoutePredictionPerformance,
  type RoutePredictionClassification,
  type RoutePredictionPerformance,
} from "@/lib/fleet/calculateRoutePredictionPerformance";

import {
  ROUTE_RISK_LOGISTIC_BASELINE_VERSION,
  ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR,
  type RouteRiskLogisticBaselineModel,
} from "@/lib/fleet/trainRouteRiskLogisticBaseline";

export const ROUTE_RISK_LOGISTIC_EVALUATION_VERSION =
  "harborguard-route-risk-logistic-evaluation-v1" as const;

export type EvaluateRouteRiskLogisticBaselineInput = {
  model: RouteRiskLogisticBaselineModel;
  examples: readonly RouteRiskTrainingExample[];
  threshold: number;
};

export type RouteRiskLogisticEvaluationRow = {
  tripId: string;
  observedAdverseEvent: boolean;
  predictedProbability: number;
  predictedAdverseEvent: boolean;
  classification: RoutePredictionClassification;
};

export type RouteRiskLogisticEvaluationResult = {
  evaluationVersion:
    typeof ROUTE_RISK_LOGISTIC_EVALUATION_VERSION;

  algorithmVersion:
    typeof ROUTE_RISK_LOGISTIC_BASELINE_VERSION;

  threshold: number;

  exampleCount: number;

  rows:
    RouteRiskLogisticEvaluationRow[];

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

function validateModel(
  model: RouteRiskLogisticBaselineModel
) {
  if (
    model.algorithmVersion !==
    ROUTE_RISK_LOGISTIC_BASELINE_VERSION
  ) {
    throw new Error(
      "Unsupported route-risk logistic model version."
    );
  }

  if (
    !Number.isFinite(model.intercept)
  ) {
    throw new Error(
      "Invalid route-risk logistic model intercept."
    );
  }

  for (const coefficient of Object.values(
    model.coefficients
  )) {
    if (!Number.isFinite(coefficient)) {
      throw new Error(
        "Invalid route-risk logistic model coefficient."
      );
    }
  }
}

function sigmoid(
  value: number
) {
  if (value >= 0) {
    const exponential =
      Math.exp(-value);

    return 1 /
      (1 + exponential);
  }

  const exponential =
    Math.exp(value);

  return exponential /
    (1 + exponential);
}

function scoreExample(
  model: RouteRiskLogisticBaselineModel,
  example: RouteRiskTrainingExample
) {
  const overallRiskScore =
    example.features.overallRiskScore /
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR;

  const threatRiskScore =
    example.features.threatRiskScore /
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR;

  const weatherRiskScore =
    example.features.weatherRiskScore /
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR;

  const trafficRiskScore =
    example.features.trafficRiskScore /
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR;

  const linear =
    model.intercept +
    model.coefficients.overallRiskScore *
      overallRiskScore +
    model.coefficients.threatRiskScore *
      threatRiskScore +
    model.coefficients.weatherRiskScore *
      weatherRiskScore +
    model.coefficients.trafficRiskScore *
      trafficRiskScore;

  return sigmoid(linear);
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
  left: RouteRiskLogisticEvaluationRow,
  right: RouteRiskLogisticEvaluationRow
) {
  return left.tripId.localeCompare(
    right.tripId
  );
}

/**
 * Evaluates a trained route-risk logistic model against supplied
 * validation or test examples.
 *
 * The caller supplies the analysis threshold explicitly.
 * This helper does not search thresholds, select a best threshold,
 * persist results, or change production scoring behavior.
 */
export function evaluateRouteRiskLogisticBaseline({
  model,
  examples,
  threshold,
}: EvaluateRouteRiskLogisticBaselineInput): RouteRiskLogisticEvaluationResult {
  validateModel(model);

  const normalizedThreshold =
    validateThreshold(
      threshold
    );

  const rows =
    examples.map(
      (example): RouteRiskLogisticEvaluationRow => {
        const predictedProbability =
          scoreExample(
            model,
            example
          );

        if (
          !Number.isFinite(predictedProbability) ||
          predictedProbability < 0 ||
          predictedProbability > 1
        ) {
          throw new Error(
            "Route-risk logistic evaluation produced an invalid probability."
          );
        }

        const predictedAdverseEvent =
          predictedProbability >=
          normalizedThreshold;

        const observedAdverseEvent =
          example.label.observedAdverseEvent;

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
      ROUTE_RISK_LOGISTIC_EVALUATION_VERSION,

    algorithmVersion:
      ROUTE_RISK_LOGISTIC_BASELINE_VERSION,

    threshold:
      normalizedThreshold,

    exampleCount:
      rows.length,

    rows,

    performance,
  };
}
