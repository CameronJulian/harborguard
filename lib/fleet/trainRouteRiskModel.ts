import type {
  RouteRiskTrainingExample,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

import {
  ROUTE_RISK_LOGISTIC_BASELINE_VERSION,
  trainRouteRiskLogisticBaseline,
  type TrainRouteRiskLogisticBaselineOptions,
} from "@/lib/fleet/trainRouteRiskLogisticBaseline";

import type {
  RouteRiskModelArtifact,
  RouteRiskModelAlgorithmVersion,
} from "@/lib/fleet/routeRiskModelArtifact";

/**
 * Generic training configuration.
 *
 * The top-level logistic options are intentionally preserved so existing
 * HarborGuard callers remain source-compatible while model-family
 * dispatch becomes explicit.
 *
 * When additional algorithms are registered, this becomes a
 * discriminated configuration union keyed by algorithmVersion.
 */
export type RouteRiskModelTrainingOptions =
  TrainRouteRiskLogisticBaselineOptions & {
    algorithmVersion?:
      RouteRiskModelAlgorithmVersion;
  };

export type TrainRouteRiskModelInput = {
  examples:
    readonly RouteRiskTrainingExample[];

  training?:
    RouteRiskModelTrainingOptions;
};

/**
 * Generic HarborGuard route-risk training boundary.
 *
 * Algorithm selection is explicit and fail-closed. The logistic baseline
 * remains the sole registered training adapter.
 *
 * This helper performs no dataset preparation, persistence, lifecycle
 * mutation, threshold selection, or production Route Safety mutation.
 */
export function trainRouteRiskModel({
  examples,
  training = {},
}: TrainRouteRiskModelInput): RouteRiskModelArtifact {
  const algorithmVersion =
    training.algorithmVersion ??
    ROUTE_RISK_LOGISTIC_BASELINE_VERSION;

  switch (algorithmVersion) {
    case ROUTE_RISK_LOGISTIC_BASELINE_VERSION:
      return trainRouteRiskLogisticBaseline(
        examples,
        {
          epochs:
            training.epochs,

          learningRate:
            training.learningRate,
        }
      );

    default:
      throw new Error(
        "Unsupported route-risk training algorithm version."
      );
  }
}
