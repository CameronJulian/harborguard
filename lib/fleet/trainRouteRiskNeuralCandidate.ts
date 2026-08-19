import {
  ROUTE_RISK_FEATURE_SCHEMA_VERSION,
  ROUTE_RISK_LABEL_SCHEMA_VERSION,
  ROUTE_RISK_TRAINING_CONTRACT_VERSION,
  type RouteRiskTrainingExample,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

export const ROUTE_RISK_NEURAL_CANDIDATE_VERSION =
  "harborguard-route-risk-neural-v1" as const;

export const ROUTE_RISK_NEURAL_FEATURE_ORDER = [
  "overallRiskScore",
  "threatRiskScore",
  "weatherRiskScore",
  "trafficRiskScore",
] as const;

export const ROUTE_RISK_NEURAL_FEATURE_DIVISOR =
  100 as const;

export const ROUTE_RISK_NEURAL_HIDDEN_UNITS =
  4 as const;

export const ROUTE_RISK_NEURAL_DEFAULT_EPOCHS =
  750 as const;

export const ROUTE_RISK_NEURAL_DEFAULT_LEARNING_RATE =
  0.05 as const;

const LOG_LOSS_EPSILON =
  1e-15;

export type RouteRiskNeuralFeatureName =
  (typeof ROUTE_RISK_NEURAL_FEATURE_ORDER)[number];

export type TrainRouteRiskNeuralCandidateOptions = {
  epochs?: number;
  learningRate?: number;
};

export type RouteRiskNeuralCandidateModel = {
  algorithmVersion:
    typeof ROUTE_RISK_NEURAL_CANDIDATE_VERSION;

  trainingContractVersion:
    typeof ROUTE_RISK_TRAINING_CONTRACT_VERSION;

  featureSchemaVersion:
    typeof ROUTE_RISK_FEATURE_SCHEMA_VERSION;

  labelSchemaVersion:
    typeof ROUTE_RISK_LABEL_SCHEMA_VERSION;

  featureOrder:
    typeof ROUTE_RISK_NEURAL_FEATURE_ORDER;

  normalization: {
    divideBy:
      typeof ROUTE_RISK_NEURAL_FEATURE_DIVISOR;
  };

  network: {
    inputUnits: 4;
    hiddenUnits:
      typeof ROUTE_RISK_NEURAL_HIDDEN_UNITS;
    outputUnits: 1;
    hiddenActivation: "tanh";
    outputActivation: "sigmoid";
  };

  parameters: {
    hiddenWeights:
      number[][];
    hiddenBiases:
      number[];
    outputWeights:
      number[];
    outputBias:
      number;
  };

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
  features:
    readonly [
      number,
      number,
      number,
      number,
    ];

  label:
    0 | 1;
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

function normalizeEpochs(
  value: number | undefined
) {
  const epochs =
    value ??
    ROUTE_RISK_NEURAL_DEFAULT_EPOCHS;

  if (
    !Number.isInteger(epochs) ||
    epochs <= 0
  ) {
    throw new Error(
      "Invalid neural epochs: expected a positive integer."
    );
  }

  return epochs;
}

function normalizeLearningRate(
  value: number | undefined
) {
  const learningRate =
    value ??
    ROUTE_RISK_NEURAL_DEFAULT_LEARNING_RATE;

  if (
    !Number.isFinite(learningRate) ||
    learningRate <= 0
  ) {
    throw new Error(
      "Invalid neural learningRate: expected a positive finite number."
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
      `Invalid ${fieldName}: expected a score between 0 and 100.`
    );
  }

  return (
    value /
    ROUTE_RISK_NEURAL_FEATURE_DIVISOR
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

    return (
      1 /
      (1 + exponential)
    );
  }

  const exponential =
    Math.exp(value);

  return (
    exponential /
    (1 + exponential)
  );
}

function deterministicInitialHiddenWeights() {
  return [
    [0.08, -0.04, 0.06, -0.02],
    [-0.05, 0.07, -0.03, 0.09],
    [0.04, 0.02, -0.08, 0.05],
    [-0.07, 0.03, 0.05, -0.06],
  ];
}

function deterministicInitialOutputWeights() {
  return [
    0.06,
    -0.05,
    0.04,
    -0.03,
  ];
}

function forward(
  features: readonly number[],
  hiddenWeights: readonly (readonly number[])[],
  hiddenBiases: readonly number[],
  outputWeights: readonly number[],
  outputBias: number
) {
  const hidden =
    hiddenWeights.map(
      (weights, hiddenIndex) => {
        let value =
          hiddenBiases[hiddenIndex];

        for (
          let featureIndex = 0;
          featureIndex < features.length;
          featureIndex += 1
        ) {
          value +=
            weights[featureIndex] *
            features[featureIndex];
        }

        return Math.tanh(value);
      }
    );

  let outputLinear =
    outputBias;

  for (
    let hiddenIndex = 0;
    hiddenIndex < hidden.length;
    hiddenIndex += 1
  ) {
    outputLinear +=
      outputWeights[hiddenIndex] *
      hidden[hiddenIndex];
  }

  return {
    hidden,
    probability:
      sigmoid(outputLinear),
  };
}

function binaryCrossEntropyLoss(
  rows: readonly NormalizedTrainingRow[],
  hiddenWeights: readonly (readonly number[])[],
  hiddenBiases: readonly number[],
  outputWeights: readonly number[],
  outputBias: number
) {
  let totalLoss = 0;

  for (const row of rows) {
    const { probability } =
      forward(
        row.features,
        hiddenWeights,
        hiddenBiases,
        outputWeights,
        outputBias
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

  return (
    totalLoss /
    rows.length
  );
}

/**
 * Trains HarborGuard's first deterministic neural route-risk candidate.
 *
 * Boundaries:
 *
 * - Uses the same four prediction-time features as the baseline.
 * - Uses fixed deterministic initialization.
 * - Uses full-batch gradient descent.
 * - Uses no randomness or shuffling.
 * - Requires positive and negative labels.
 * - Produces a serializable immutable model artifact.
 * - Performs no persistence, threshold selection, lifecycle mutation,
 *   candidate registration, shadow transition, activation, or Route Safety
 *   production mutation.
 */
export function trainRouteRiskNeuralCandidate(
  examples:
    readonly RouteRiskTrainingExample[],
  options:
    TrainRouteRiskNeuralCandidateOptions = {}
): RouteRiskNeuralCandidateModel {
  if (examples.length === 0) {
    throw new Error(
      "Cannot train route-risk neural candidate from an empty training set."
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
      "Cannot train route-risk neural candidate without positive examples."
    );
  }

  if (negativeCount === 0) {
    throw new Error(
      "Cannot train route-risk neural candidate without negative examples."
    );
  }

  const hiddenWeights =
    deterministicInitialHiddenWeights();

  const hiddenBiases = [
    0,
    0,
    0,
    0,
  ];

  const outputWeights =
    deterministicInitialOutputWeights();

  let outputBias = 0;

  for (
    let epoch = 0;
    epoch < epochs;
    epoch += 1
  ) {
    const hiddenWeightGradients =
      hiddenWeights.map(
        (weights) =>
          weights.map(() => 0)
      );

    const hiddenBiasGradients =
      hiddenBiases.map(() => 0);

    const outputWeightGradients =
      outputWeights.map(() => 0);

    let outputBiasGradient = 0;

    for (const row of rows) {
      const {
        hidden,
        probability,
      } =
        forward(
          row.features,
          hiddenWeights,
          hiddenBiases,
          outputWeights,
          outputBias
        );

      const outputDelta =
        probability -
        row.label;

      outputBiasGradient +=
        outputDelta;

      for (
        let hiddenIndex = 0;
        hiddenIndex < hidden.length;
        hiddenIndex += 1
      ) {
        outputWeightGradients[hiddenIndex] +=
          outputDelta *
          hidden[hiddenIndex];

        const hiddenDelta =
          outputDelta *
          outputWeights[hiddenIndex] *
          (
            1 -
            hidden[hiddenIndex] *
            hidden[hiddenIndex]
          );

        hiddenBiasGradients[hiddenIndex] +=
          hiddenDelta;

        for (
          let featureIndex = 0;
          featureIndex < row.features.length;
          featureIndex += 1
        ) {
          hiddenWeightGradients[hiddenIndex][featureIndex] +=
            hiddenDelta *
            row.features[featureIndex];
        }
      }
    }

    const inverseCount =
      1 /
      rows.length;

    outputBias -=
      learningRate *
      outputBiasGradient *
      inverseCount;

    for (
      let hiddenIndex = 0;
      hiddenIndex < ROUTE_RISK_NEURAL_HIDDEN_UNITS;
      hiddenIndex += 1
    ) {
      outputWeights[hiddenIndex] -=
        learningRate *
        outputWeightGradients[hiddenIndex] *
        inverseCount;

      hiddenBiases[hiddenIndex] -=
        learningRate *
        hiddenBiasGradients[hiddenIndex] *
        inverseCount;

      for (
        let featureIndex = 0;
        featureIndex < 4;
        featureIndex += 1
      ) {
        hiddenWeights[hiddenIndex][featureIndex] -=
          learningRate *
          hiddenWeightGradients[hiddenIndex][featureIndex] *
          inverseCount;
      }
    }
  }

  const finalLoss =
    binaryCrossEntropyLoss(
      rows,
      hiddenWeights,
      hiddenBiases,
      outputWeights,
      outputBias
    );

  const parameters = [
    ...hiddenWeights.flat(),
    ...hiddenBiases,
    ...outputWeights,
    outputBias,
    finalLoss,
  ];

  if (
    parameters.some(
      (value) =>
        !Number.isFinite(value)
    )
  ) {
    throw new Error(
      "Route-risk neural candidate training produced non-finite parameters."
    );
  }

  return {
    algorithmVersion:
      ROUTE_RISK_NEURAL_CANDIDATE_VERSION,

    trainingContractVersion:
      ROUTE_RISK_TRAINING_CONTRACT_VERSION,

    featureSchemaVersion:
      ROUTE_RISK_FEATURE_SCHEMA_VERSION,

    labelSchemaVersion:
      ROUTE_RISK_LABEL_SCHEMA_VERSION,

    featureOrder:
      ROUTE_RISK_NEURAL_FEATURE_ORDER,

    normalization: {
      divideBy:
        ROUTE_RISK_NEURAL_FEATURE_DIVISOR,
    },

    network: {
      inputUnits: 4,
      hiddenUnits:
        ROUTE_RISK_NEURAL_HIDDEN_UNITS,
      outputUnits: 1,
      hiddenActivation: "tanh",
      outputActivation: "sigmoid",
    },

    parameters: {
      hiddenWeights,
      hiddenBiases,
      outputWeights,
      outputBias,
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
