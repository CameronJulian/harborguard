import {
  ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR,
  type RouteRiskLogisticBaselineModel,
} from "@/lib/fleet/trainRouteRiskLogisticBaseline";

import {
  parseRouteRiskLogisticBaselineModel,
} from "@/lib/fleet/parseRouteRiskLogisticBaselineModel";

export type RouteRiskLogisticPredictionFeatures = {
  overallRiskScore: number;
  threatRiskScore: number;
  weatherRiskScore: number;
  trafficRiskScore: number;
};

export type ScoreRouteRiskLogisticModelInput = {
  model: RouteRiskLogisticBaselineModel;
  features: RouteRiskLogisticPredictionFeatures;
};

export type RouteRiskLogisticPrediction = {
  predictedProbability: number;
};

function requireFiniteNumber(
  value: number,
  fieldName: string
) {
  if (!Number.isFinite(value)) {
    throw new Error(
      `Invalid ${fieldName}: expected a finite number.`
    );
  }

  return value;
}

function validateRiskScore(
  value: number,
  fieldName: string
) {
  requireFiniteNumber(
    value,
    fieldName
  );

  if (
    value < 0 ||
    value > 100
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a score between 0 and 100.`
    );
  }

  return value;
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

/**
 * Scores HarborGuard's persisted route-risk logistic model using only
 * prediction-time features.
 *
 * Important boundaries:
 *
 * - The function is deterministic.
 * - It performs no database reads.
 * - It performs no persistence.
 * - It performs no registry or lifecycle mutation.
 * - It performs no threshold selection or adverse-event classification.
 * - It performs no production Route Safety integration.
 * - It validates the full persisted model contract before scoring.
 */
export function scoreRouteRiskLogisticModel({
  model,
  features,
}: ScoreRouteRiskLogisticModelInput): RouteRiskLogisticPrediction {
  const validatedModel =
    parseRouteRiskLogisticBaselineModel(
      model
    );

  const overallRiskScore =
    validateRiskScore(
      features.overallRiskScore,
      "features.overallRiskScore"
    ) /
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR;

  const threatRiskScore =
    validateRiskScore(
      features.threatRiskScore,
      "features.threatRiskScore"
    ) /
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR;

  const weatherRiskScore =
    validateRiskScore(
      features.weatherRiskScore,
      "features.weatherRiskScore"
    ) /
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR;

  const trafficRiskScore =
    validateRiskScore(
      features.trafficRiskScore,
      "features.trafficRiskScore"
    ) /
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR;

  const linear =
    validatedModel.intercept +
    validatedModel.coefficients.overallRiskScore *
      overallRiskScore +
    validatedModel.coefficients.threatRiskScore *
      threatRiskScore +
    validatedModel.coefficients.weatherRiskScore *
      weatherRiskScore +
    validatedModel.coefficients.trafficRiskScore *
      trafficRiskScore;

  const predictedProbability =
    sigmoid(
      linear
    );

  if (
    !Number.isFinite(predictedProbability) ||
    predictedProbability < 0 ||
    predictedProbability > 1
  ) {
    throw new Error(
      "Route-risk logistic scoring produced an invalid probability."
    );
  }

  return {
    predictedProbability,
  };
}
