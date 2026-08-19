import {
  ROUTE_RISK_FEATURE_SCHEMA_VERSION,
  ROUTE_RISK_LABEL_SCHEMA_VERSION,
  ROUTE_RISK_TRAINING_CONTRACT_VERSION,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

import {
  ROUTE_RISK_NEURAL_CANDIDATE_VERSION,
  ROUTE_RISK_NEURAL_FEATURE_DIVISOR,
  ROUTE_RISK_NEURAL_FEATURE_ORDER,
  ROUTE_RISK_NEURAL_HIDDEN_UNITS,
  type RouteRiskNeuralCandidateModel,
} from "@/lib/fleet/trainRouteRiskNeuralCandidate";

function record(
  value: unknown,
  fieldName: string
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected an object.`
    );
  }

  return value as
    Record<string, unknown>;
}

function finite(
  value: unknown,
  fieldName: string
) {
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

function positiveInteger(
  value: unknown,
  fieldName: string
) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a positive integer.`
    );
  }

  return value;
}

function finiteVector(
  value: unknown,
  length: number,
  fieldName: string
) {
  if (
    !Array.isArray(value) ||
    value.length !== length
  ) {
    throw new Error(
      `Invalid ${fieldName}: unexpected vector shape.`
    );
  }

  return value.map(
    (item, index) =>
      finite(
        item,
        `${fieldName}[${index}]`
      )
  );
}

function finiteMatrix(
  value: unknown,
  rows: number,
  columns: number,
  fieldName: string
) {
  if (
    !Array.isArray(value) ||
    value.length !== rows
  ) {
    throw new Error(
      `Invalid ${fieldName}: unexpected matrix shape.`
    );
  }

  return value.map(
    (row, rowIndex) =>
      finiteVector(
        row,
        columns,
        `${fieldName}[${rowIndex}]`
      )
  );
}

export function parseRouteRiskNeuralCandidateModel(
  value: unknown
): RouteRiskNeuralCandidateModel {
  const model =
    record(
      value,
      "route-risk neural model"
    );

  if (
    model.algorithmVersion !==
    ROUTE_RISK_NEURAL_CANDIDATE_VERSION
  ) {
    throw new Error(
      "Unsupported route-risk neural model version."
    );
  }

  if (
    model.trainingContractVersion !==
    ROUTE_RISK_TRAINING_CONTRACT_VERSION ||
    model.featureSchemaVersion !==
    ROUTE_RISK_FEATURE_SCHEMA_VERSION ||
    model.labelSchemaVersion !==
    ROUTE_RISK_LABEL_SCHEMA_VERSION
  ) {
    throw new Error(
      "Unsupported route-risk neural model schema contract."
    );
  }

  if (
    !Array.isArray(model.featureOrder) ||
    model.featureOrder.length !==
      ROUTE_RISK_NEURAL_FEATURE_ORDER.length ||
    model.featureOrder.some(
      (feature, index) =>
        feature !==
        ROUTE_RISK_NEURAL_FEATURE_ORDER[index]
    )
  ) {
    throw new Error(
      "Invalid route-risk neural feature order."
    );
  }

  const normalization =
    record(
      model.normalization,
      "neural normalization"
    );

  if (
    normalization.divideBy !==
    ROUTE_RISK_NEURAL_FEATURE_DIVISOR
  ) {
    throw new Error(
      "Invalid route-risk neural normalization."
    );
  }

  const network =
    record(
      model.network,
      "neural network"
    );

  if (
    network.inputUnits !== 4 ||
    network.hiddenUnits !==
      ROUTE_RISK_NEURAL_HIDDEN_UNITS ||
    network.outputUnits !== 1 ||
    network.hiddenActivation !== "tanh" ||
    network.outputActivation !== "sigmoid"
  ) {
    throw new Error(
      "Invalid route-risk neural network architecture."
    );
  }

  const parameters =
    record(
      model.parameters,
      "neural parameters"
    );

  const hiddenWeights =
    finiteMatrix(
      parameters.hiddenWeights,
      ROUTE_RISK_NEURAL_HIDDEN_UNITS,
      4,
      "parameters.hiddenWeights"
    );

  const hiddenBiases =
    finiteVector(
      parameters.hiddenBiases,
      ROUTE_RISK_NEURAL_HIDDEN_UNITS,
      "parameters.hiddenBiases"
    );

  const outputWeights =
    finiteVector(
      parameters.outputWeights,
      ROUTE_RISK_NEURAL_HIDDEN_UNITS,
      "parameters.outputWeights"
    );

  const outputBias =
    finite(
      parameters.outputBias,
      "parameters.outputBias"
    );

  const training =
    record(
      model.training,
      "neural training metadata"
    );

  const exampleCount =
    positiveInteger(
      training.exampleCount,
      "training.exampleCount"
    );

  const positiveCount =
    positiveInteger(
      training.positiveCount,
      "training.positiveCount"
    );

  const negativeCount =
    positiveInteger(
      training.negativeCount,
      "training.negativeCount"
    );

  if (
    positiveCount +
      negativeCount !==
    exampleCount
  ) {
    throw new Error(
      "Invalid neural training class counts."
    );
  }

  const epochs =
    positiveInteger(
      training.epochs,
      "training.epochs"
    );

  const learningRate =
    finite(
      training.learningRate,
      "training.learningRate"
    );

  if (learningRate <= 0) {
    throw new Error(
      "Invalid training.learningRate."
    );
  }

  const finalLoss =
    finite(
      training.finalLoss,
      "training.finalLoss"
    );

  if (finalLoss < 0) {
    throw new Error(
      "Invalid training.finalLoss."
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
      exampleCount,
      positiveCount,
      negativeCount,
      epochs,
      learningRate,
      finalLoss,
    },
  };
}
