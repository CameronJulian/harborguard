import {
  ROUTE_RISK_FEATURE_SCHEMA_VERSION,
  ROUTE_RISK_LABEL_SCHEMA_VERSION,
  ROUTE_RISK_TRAINING_CONTRACT_VERSION,
} from "@/lib/fleet/buildRouteRiskTrainingExample";

import {
  ROUTE_RISK_LOGISTIC_BASELINE_VERSION,
  type RouteRiskLogisticBaselineModel,
} from "@/lib/fleet/trainRouteRiskLogisticBaseline";

export type RouteRiskPredictionFeatures = {
  overallRiskScore: number;
  threatRiskScore: number;
  weatherRiskScore: number;
  trafficRiskScore: number;
};

export type RouteRiskModelPrediction = {
  predictedProbability: number;
};

export type RouteRiskModelArtifactBase = {
  algorithmVersion: string;
  trainingContractVersion:
    typeof ROUTE_RISK_TRAINING_CONTRACT_VERSION;
  featureSchemaVersion:
    typeof ROUTE_RISK_FEATURE_SCHEMA_VERSION;
  labelSchemaVersion:
    typeof ROUTE_RISK_LABEL_SCHEMA_VERSION;
};

export type RouteRiskModelArtifact =
  RouteRiskLogisticBaselineModel;

export type RouteRiskModelAlgorithmVersion =
  RouteRiskModelArtifact["algorithmVersion"];

export const SUPPORTED_ROUTE_RISK_MODEL_ALGORITHM_VERSIONS =
  [
    ROUTE_RISK_LOGISTIC_BASELINE_VERSION,
  ] as const;

export function isSupportedRouteRiskModelAlgorithmVersion(
  value: unknown
): value is RouteRiskModelAlgorithmVersion {
  return (
    typeof value === "string" &&
    (
      SUPPORTED_ROUTE_RISK_MODEL_ALGORITHM_VERSIONS as
        readonly string[]
    ).includes(value)
  );
}
