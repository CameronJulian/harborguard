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

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireRecord(
  value: unknown,
  fieldName: string
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(
      `Invalid ${fieldName}: expected an object.`
    );
  }

  return value;
}

function requireFiniteNumber(
  value: unknown,
  fieldName: string
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a finite number.`
    );
  }

  return value;
}

function requireNonNegativeInteger(
  value: unknown,
  fieldName: string
): number {
  const numberValue =
    requireFiniteNumber(
      value,
      fieldName
    );

  if (
    !Number.isInteger(numberValue) ||
    numberValue < 0
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a non-negative integer.`
    );
  }

  return numberValue;
}

function requirePositiveInteger(
  value: unknown,
  fieldName: string
): number {
  const numberValue =
    requireFiniteNumber(
      value,
      fieldName
    );

  if (
    !Number.isInteger(numberValue) ||
    numberValue <= 0
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a positive integer.`
    );
  }

  return numberValue;
}

function requirePositiveFiniteNumber(
  value: unknown,
  fieldName: string
): number {
  const numberValue =
    requireFiniteNumber(
      value,
      fieldName
    );

  if (numberValue <= 0) {
    throw new Error(
      `Invalid ${fieldName}: expected a positive finite number.`
    );
  }

  return numberValue;
}

/**
 * Converts persisted unknown JSON into HarborGuard's exact supported
 * deterministic logistic baseline model contract.
 *
 * This parser performs no database access, scoring, persistence,
 * lifecycle mutation, threshold selection or Route Safety integration.
 */
export function parseRouteRiskLogisticBaselineModel(
  value: unknown
): RouteRiskLogisticBaselineModel {
  const model =
    requireRecord(
      value,
      "route-risk logistic model"
    );

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

  if (!Array.isArray(model.featureOrder)) {
    throw new Error(
      "Invalid route-risk logistic feature order."
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

  const normalization =
    requireRecord(
      model.normalization,
      "model.normalization"
    );

  if (
    normalization.divideBy !==
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR
  ) {
    throw new Error(
      "Unsupported route-risk logistic normalization."
    );
  }

  const intercept =
    requireFiniteNumber(
      model.intercept,
      "model.intercept"
    );

  const coefficients =
    requireRecord(
      model.coefficients,
      "model.coefficients"
    );

  const overallRiskScore =
    requireFiniteNumber(
      coefficients.overallRiskScore,
      "model.coefficients.overallRiskScore"
    );

  const threatRiskScore =
    requireFiniteNumber(
      coefficients.threatRiskScore,
      "model.coefficients.threatRiskScore"
    );

  const weatherRiskScore =
    requireFiniteNumber(
      coefficients.weatherRiskScore,
      "model.coefficients.weatherRiskScore"
    );

  const trafficRiskScore =
    requireFiniteNumber(
      coefficients.trafficRiskScore,
      "model.coefficients.trafficRiskScore"
    );

  const training =
    requireRecord(
      model.training,
      "model.training"
    );

  const exampleCount =
    requireNonNegativeInteger(
      training.exampleCount,
      "model.training.exampleCount"
    );

  const positiveCount =
    requireNonNegativeInteger(
      training.positiveCount,
      "model.training.positiveCount"
    );

  const negativeCount =
    requireNonNegativeInteger(
      training.negativeCount,
      "model.training.negativeCount"
    );

  if (
    positiveCount +
      negativeCount !==
    exampleCount
  ) {
    throw new Error(
      "Invalid route-risk logistic training counts."
    );
  }

  const epochs =
    requirePositiveInteger(
      training.epochs,
      "model.training.epochs"
    );

  const learningRate =
    requirePositiveFiniteNumber(
      training.learningRate,
      "model.training.learningRate"
    );

  const finalLoss =
    requireFiniteNumber(
      training.finalLoss,
      "model.training.finalLoss"
    );

  if (finalLoss < 0) {
    throw new Error(
      "Invalid model.training.finalLoss: expected a non-negative finite number."
    );
  }

  return {
    algorithmVersion:
      ROUTE_RISK_LOGISTIC_BASELINE_VERSION,

    trainingContractVersion:
      ROUTE_RISK_TRAINING_CONTRACT_VERSION,

    featureSchemaVersion:
      ROUTE_RISK_FEATURE_SCHEMA_VERSION,

    labelSchemaVersion:
      ROUTE_RISK_LABEL_SCHEMA_VERSION,

    featureOrder:
      ROUTE_RISK_LOGISTIC_FEATURE_ORDER,

    normalization: {
      divideBy:
        ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR,
    },

    intercept,

    coefficients: {
      overallRiskScore,
      threatRiskScore,
      weatherRiskScore,
      trafficRiskScore,
    },

    training: {
      exampleCount,
      positiveCount,
      negativeCount,
      epochs,
      learningRate,
      finalLoss,
    },
  };
}
