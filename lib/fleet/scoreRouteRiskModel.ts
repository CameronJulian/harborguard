import {
  ROUTE_RISK_LOGISTIC_BASELINE_VERSION,
} from "@/lib/fleet/trainRouteRiskLogisticBaseline";

import {
  scoreRouteRiskLogisticModel,
} from "@/lib/fleet/scoreRouteRiskLogisticModel";

import {
  scoreRouteRiskNeuralCandidate,
} from "@/lib/fleet/scoreRouteRiskNeuralCandidate";

import {
  ROUTE_RISK_NEURAL_CANDIDATE_VERSION,
} from "@/lib/fleet/trainRouteRiskNeuralCandidate";

import {
  parseRouteRiskModelArtifact,
} from "@/lib/fleet/parseRouteRiskModelArtifact";

import type {
  RouteRiskModelArtifact,
  RouteRiskModelPrediction,
  RouteRiskPredictionFeatures,
} from "@/lib/fleet/routeRiskModelArtifact";

export type ScoreRouteRiskModelInput = {
  model: RouteRiskModelArtifact;
  features: RouteRiskPredictionFeatures;
};

/**
 * Generic HarborGuard route-risk probability scoring boundary.
 *
 * The dispatcher validates the persisted artifact first and delegates to
 * the explicitly registered algorithm adapter.
 *
 * Unsupported algorithms fail closed at the parser/dispatcher boundary.
 *
 * It creates no database, persistence, lifecycle, threshold-selection or
 * production Route Safety authority.
 */
export function scoreRouteRiskModel({
  model,
  features,
}: ScoreRouteRiskModelInput): RouteRiskModelPrediction {
  const validatedModel =
    parseRouteRiskModelArtifact(
      model
    );

  switch (validatedModel.algorithmVersion) {
    case ROUTE_RISK_LOGISTIC_BASELINE_VERSION:
      return scoreRouteRiskLogisticModel({
        model:
          validatedModel,

        features,
      });
    case ROUTE_RISK_NEURAL_CANDIDATE_VERSION:
      return scoreRouteRiskNeuralCandidate({
        model:
          validatedModel,

        features,
      });

    default:
      throw new Error(
        "Unsupported route-risk model algorithm version."
      );
  }
}
