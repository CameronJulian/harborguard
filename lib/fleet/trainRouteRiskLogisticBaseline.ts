import {
  ROUTE_RISK_FEATURE_SCHEMA_VERSION,
  ROUTE_RISK_LABEL_SCHEMA_VERSION,
  ROUTE_RISK_TRAINING_CONTRACT_VERSION,
  type RouteRiskTrainingExample,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

export const ROUTE_RISK_LOGISTIC_BASELINE_VERSION =
  "harborguard-route-risk-logistic-v1" as const;

export const ROUTE_RISK_LOGISTIC_FEATURE_ORDER = [
  "overallRiskScore",
  "threatRiskScore",
  "weatherRiskScore",
  "trafficRiskScore",
] as const;

export const ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR =
  100 as const;

export const ROUTE_RISK_LOGISTIC_DEFAULT_EPOCHS =
  1000 as const;

export const ROUTE_RISK_LOGISTIC_DEFAULT_LEARNING_RATE =
  0.1 as const;

const LOG_LOSS_EPSILON = 1e-15;

export type RouteRiskLogisticFeatureName =
  (typeof ROUTE_RISK_LOGISTIC_FEATURE_ORDER)[number];

export type TrainRouteRiskLogisticBaselineOptions = {
  epochs?: number;
  learningRate?: number;
};

export type RouteRiskLogisticBaselineModel = {
  algorithmVersion:
    typeof ROUTE_RISK_LOGISTIC_BASELINE_VERSION;

  trainingContractVersion:
    typeof ROUTE_RISK_TRAINING_CONTRACT_VERSION;

  featureSchemaVersion:
    typeof ROUTE_RISK_FEATURE_SCHEMA_VERSION;

  labelSchemaVersion:
    typeof ROUTE_RISK_LABEL_SCHEMA_VERSION;

  featureOrder:
    typeof ROUTE_RISK_LOGISTIC_FEATURE_ORDER;

  normalization: {
    divideBy:
      typeof ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR;
  };

  intercept: number;

  coefficients:
    Record<RouteRiskLogisticFeatureName, number>;

  training: {
    exampleCount: number;
    positiveCount: number;
    negativeCount: number;
    epochs: number;
    learningRate: number;
    finalLoss: number;
  };
};

type NormalizedTrainingRow = {
  features: readonly [
    number,
    number,
    number,
    number,
  ];

  label: 0 | 1;
};

function requireFiniteNumber(
  value: number,
  fieldName: string
) {
  if (!Number.isFinite(value)) {
    throw new Error(
      "Invalid " +
        fieldName +
        ": expected a finite number."
    );
  }

  return value;
}

function normalizeEpochs(
  value: number | undefined
) {
  const epochs =
    value ??
    ROUTE_RISK_LOGISTIC_DEFAULT_EPOCHS;

  if (
    !Number.isInteger(epochs) ||
    epochs <= 0
  ) {
    throw new Error(
      "Invalid epochs: expected a positive integer."
    );
  }

  return epochs;
}

function normalizeLearningRate(
  value: number | undefined
) {
  const learningRate =
    value ??
    ROUTE_RISK_LOGISTIC_DEFAULT_LEARNING_RATE;

  if (
    !Number.isFinite(learningRate) ||
    learningRate <= 0
  ) {
    throw new Error(
      "Invalid learningRate: expected a positive finite number."
    );
  }

  return learningRate;
}

function normalizeRiskScore(
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
      "Invalid " +
        fieldName +
        ": expected a score between 0 and 100."
    );
  }

  return (
    value /
    ROUTE_RISK_LOGISTIC_FEATURE_DIVISOR
  );
}

function validateExampleContract(
  example: RouteRiskTrainingExample
) {
  if (
    example.contractVersion !==
    ROUTE_RISK_TRAINING_CONTRACT_VERSION
  ) {
    throw new Error(
      "Unsupported route-risk training contract version."
    );
  }

  if (
    example.featureSchemaVersion !==
    ROUTE_RISK_FEATURE_SCHEMA_VERSION
  ) {
    throw new Error(
      "Unsupported route-risk feature schema version."
    );
  }

  if (
    example.labelSchemaVersion !==
    ROUTE_RISK_LABEL_SCHEMA_VERSION
  ) {
    throw new Error(
      "Unsupported route-risk label schema version."
    );
  }
}

function toNormalizedTrainingRow(
  example: RouteRiskTrainingExample
): NormalizedTrainingRow {
  validateExampleContract(
    example
  );

  return {
    features: [
      normalizeRiskScore(
        example.features.overallRiskScore,
        "overallRiskScore"
      ),

      normalizeRiskScore(
        example.features.threatRiskScore,
        "threatRiskScore"
      ),

      normalizeRiskScore(
        example.features.weatherRiskScore,
        "weatherRiskScore"
      ),

      normalizeRiskScore(
        example.features.trafficRiskScore,
        "trafficRiskScore"
      ),
    ],

    label:
      example.label.observedAdverseEvent
        ? 1
        : 0,
  };
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

function linearScore(
  intercept: number,
  weights: readonly number[],
  features: readonly number[]
) {
  let score = intercept;

  for (
    let index = 0;
    index < weights.length;
    index += 1
  ) {
    score +=
      weights[index] *
      features[index];
  }

  return score;
}

function binaryCrossEntropyLoss(
  rows: readonly NormalizedTrainingRow[],
  intercept: number,
  weights: readonly number[]
) {
  let totalLoss = 0;

  for (const row of rows) {
    const probability =
      sigmoid(
        linearScore(
          intercept,
          weights,
          row.features
        )
      );

    const clippedProbability =
      Math.min(
        1 - LOG_LOSS_EPSILON,
        Math.max(
          LOG_LOSS_EPSILON,
          probability
        )
      );

    totalLoss +=
      -(
        row.label *
          Math.log(clippedProbability) +
        (1 - row.label) *
          Math.log(
            1 - clippedProbability
          )
      );
  }

  return totalLoss / rows.length;
}

/**
 * Trains HarborGuard's first offline route-risk ML baseline.
 *
 * Contract boundaries:
 *
 * - Training uses only the supplied training examples.
 * - Four existing prediction-time risk scores are normalized to 0..1.
 * - Identifiers and provenance are never model features.
 * - Initialization is deterministic: intercept and coefficients start at 0.
 * - Optimization uses full-batch gradient descent.
 * - No randomness or example shuffling is used.
 * - No class weighting or sampling policy is introduced.
 * - Both positive and negative labels must be represented.
 * - No threshold selection occurs here.
 * - No persistence, database access, API call, or production scoring occurs.
 */
export function trainRouteRiskLogisticBaseline(
  examples: readonly RouteRiskTrainingExample[],
  options: TrainRouteRiskLogisticBaselineOptions = {}
): RouteRiskLogisticBaselineModel {
  if (examples.length === 0) {
    throw new Error(
      "Cannot train route-risk baseline from an empty training set."
    );
  }

  const epochs =
    normalizeEpochs(
      options.epochs
    );

  const learningRate =
    normalizeLearningRate(
      options.learningRate
    );

  const rows =
    examples.map(
      toNormalizedTrainingRow
    );

  const positiveCount =
    rows.reduce(
      (count, row) =>
        count + row.label,
      0
    );

  const negativeCount =
    rows.length -
    positiveCount;

  if (positiveCount === 0) {
    throw new Error(
      "Cannot train route-risk baseline without positive examples."
    );
  }

  if (negativeCount === 0) {
    throw new Error(
      "Cannot train route-risk baseline without negative examples."
    );
  }

  let intercept = 0;

  const weights = [
    0,
    0,
    0,
    0,
  ];

  for (
    let epoch = 0;
    epoch < epochs;
    epoch += 1
  ) {
    let interceptGradient = 0;

    const weightGradients = [
      0,
      0,
      0,
      0,
    ];

    for (const row of rows) {
      const probability =
        sigmoid(
          linearScore(
            intercept,
            weights,
            row.features
          )
        );

      const error =
        probability -
        row.label;

      interceptGradient +=
        error;

      for (
        let featureIndex = 0;
        featureIndex < weights.length;
        featureIndex += 1
      ) {
        weightGradients[featureIndex] +=
          error *
          row.features[featureIndex];
      }
    }

    const inverseCount =
      1 / rows.length;

    intercept -=
      learningRate *
      interceptGradient *
      inverseCount;

    for (
      let featureIndex = 0;
      featureIndex < weights.length;
      featureIndex += 1
    ) {
      weights[featureIndex] -=
        learningRate *
        weightGradients[featureIndex] *
        inverseCount;
    }
  }

  const finalLoss =
    binaryCrossEntropyLoss(
      rows,
      intercept,
      weights
    );

  if (
    !Number.isFinite(intercept) ||
    weights.some(
      (weight) =>
        !Number.isFinite(weight)
    ) ||
    !Number.isFinite(finalLoss)
  ) {
    throw new Error(
      "Route-risk baseline training produced non-finite parameters."
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
      overallRiskScore:
        weights[0],

      threatRiskScore:
        weights[1],

      weatherRiskScore:
        weights[2],

      trafficRiskScore:
        weights[3],
    },

    training: {
      exampleCount:
        rows.length,

      positiveCount,

      negativeCount,

      epochs,

      learningRate,

      finalLoss,
    },
  };
}
