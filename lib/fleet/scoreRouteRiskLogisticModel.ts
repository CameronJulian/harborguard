import {
  ROUTE_RISK_FEATURE_SCHEMA_VERSION,
  ROUTE_RISK_LABEL_SCHEMA_VERSION,
  ROUTE_RISK_TRAINING_CONTRACT_VERSION,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

import {
  ROUTE_RISK_LOGISTIC_BASELINE_VERSION,
  ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR,
  ROUTE_RISK_LOGISTIC_FEATURE_ORDER,
  type RouteRiskLogisticBaselineModel,
} from "@/lib/fleet/trainRouteRiskLogisticBaseline";

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
    model.trainingContractVersion !==
    ROUTE_RISK_TRAINING_CONTRACT_VERSION
  ) {
    throw new Error(
      "Unsupported route-risk training contract version."
    );
  }

  if (
    model.featureSchemaVersion !==
    ROUTE_RISK_FEATURE_SCHEMA_VERSION
  ) {
    throw new Error(
      "Unsupported route-risk feature schema version."
    );
  }

  if (
    model.labelSchemaVersion !==
    ROUTE_RISK_LABEL_SCHEMA_VERSION
  ) {
    throw new Error(
      "Unsupported route-risk label schema version."
    );
  }

  if (
    model.featureOrder.length !==
    ROUTE_RISK_LOGISTIC_FEATURE_ORDER.length
  ) {
    throw new Error(
      "Unsupported route-risk logistic feature order."
    );
  }

  for (
    let index = 0;
    index <
    ROUTE_RISK_LOGISTIC_FEATURE_ORDER.length;
    index += 1
  ) {
    if (
      model.featureOrder[index] !==
      ROUTE_RISK_LOGISTIC_FEATURE_ORDER[index]
    ) {
      throw new Error(
        "Unsupported route-risk logistic feature order."
      );
    }
  }

  if (
    model.normalization.divideBy !==
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR
  ) {
    throw new Error(
      "Unsupported route-risk logistic normalization."
    );
  }

  requireFiniteNumber(
    model.intercept,
    "model.intercept"
  );

  for (
    const featureName of
    ROUTE_RISK_LOGISTIC_FEATURE_ORDER
  ) {
    requireFiniteNumber(
      model.coefficients[featureName],
      `model.coefficients.${featureName}`
    );
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
 * - It validates the persisted model contract before scoring.
 */
export function scoreRouteRiskLogisticModel({
  model,
  features,
}: ScoreRouteRiskLogisticModelInput): RouteRiskLogisticPrediction {
  validateModel(
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
    model.intercept +
    model.coefficients.overallRiskScore *
      overallRiskScore +
    model.coefficients.threatRiskScore *
      threatRiskScore +
    model.coefficients.weatherRiskScore *
      weatherRiskScore +
    model.coefficients.trafficRiskScore *
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
