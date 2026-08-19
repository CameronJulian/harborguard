import {
  ROUTE_RISK_NEURAL_FEATURE_DIVISOR,
  type RouteRiskNeuralCandidateModel,
} from "@/lib/fleet/trainRouteRiskNeuralCandidate";

import {
  parseRouteRiskNeuralCandidateModel,
} from "@/lib/fleet/parseRouteRiskNeuralCandidateModel";

import type {
  RouteRiskModelPrediction,
  RouteRiskPredictionFeatures,
} from "@/lib/fleet/routeRiskModelArtifact";

export type ScoreRouteRiskNeuralCandidateInput = {
  model:
    RouteRiskNeuralCandidateModel;

  features:
    RouteRiskPredictionFeatures;
};

function validateRiskScore(
  value: number,
  fieldName: string
) {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error(
      `Invalid ${fieldName}: expected a finite score between 0 and 100.`
    );
  }

  return (
    value /
    ROUTE_RISK_NEURAL_FEATURE_DIVISOR
  );
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

/**
 * Scores one persisted neural candidate.
 *
 * No persistence, threshold selection, lifecycle mutation, activation,
 * rerouting or production Route Safety authority is created here.
 */
export function scoreRouteRiskNeuralCandidate({
  model,
  features,
}: ScoreRouteRiskNeuralCandidateInput): RouteRiskModelPrediction {
  const validatedModel =
    parseRouteRiskNeuralCandidateModel(
      model
    );

  const normalized = [
    validateRiskScore(
      features.overallRiskScore,
      "features.overallRiskScore"
    ),

    validateRiskScore(
      features.threatRiskScore,
      "features.threatRiskScore"
    ),

    validateRiskScore(
      features.weatherRiskScore,
      "features.weatherRiskScore"
    ),

    validateRiskScore(
      features.trafficRiskScore,
      "features.trafficRiskScore"
    ),
  ];

  const hidden =
    validatedModel.parameters.hiddenWeights.map(
      (weights, hiddenIndex) => {
        let value =
          validatedModel.parameters
            .hiddenBiases[hiddenIndex];

        for (
          let featureIndex = 0;
          featureIndex < normalized.length;
          featureIndex += 1
        ) {
          value +=
            weights[featureIndex] *
            normalized[featureIndex];
        }

        return Math.tanh(value);
      }
    );

  let outputLinear =
    validatedModel.parameters.outputBias;

  for (
    let hiddenIndex = 0;
    hiddenIndex < hidden.length;
    hiddenIndex += 1
  ) {
    outputLinear +=
      validatedModel.parameters
        .outputWeights[hiddenIndex] *
      hidden[hiddenIndex];
  }

  const predictedProbability =
    sigmoid(
      outputLinear
    );

  if (
    !Number.isFinite(predictedProbability) ||
    predictedProbability < 0 ||
    predictedProbability > 1
  ) {
    throw new Error(
      "Route-risk neural scoring produced an invalid probability."
    );
  }

  return {
    predictedProbability,
  };
}
