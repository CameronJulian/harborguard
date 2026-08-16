import type {
  RouteRiskShadowEvidenceAssessment,
} from "@/lib/fleet/assessRouteRiskShadowEvidence";

import type {
  RouteRiskShadowRouteEvidenceScope,
} from "@/lib/fleet/buildRouteRiskShadowRouteEvidenceScope";

import type {
  RouteRiskShadowModelArtifact,
} from "@/lib/fleet/readRouteRiskShadowModelArtifact";

import type {
  RouteRiskLogisticPrediction,
} from "@/lib/fleet/scoreRouteRiskLogisticModel";

export const ROUTE_RISK_SHADOW_ADVISORY_FORECAST_VERSION =
  "harborguard-route-risk-shadow-advisory-forecast-v1" as const;

export type BuildRouteRiskShadowAdvisoryForecastInput = {
  artifact: RouteRiskShadowModelArtifact;
  prediction: RouteRiskLogisticPrediction;
  evidenceAssessment:
    RouteRiskShadowEvidenceAssessment;
  routeEvidenceScope:
    RouteRiskShadowRouteEvidenceScope;
};

export type RouteRiskShadowAdvisoryForecast = {
  forecastVersion:
    typeof ROUTE_RISK_SHADOW_ADVISORY_FORECAST_VERSION;
  forecastMode:
    "SINGLE_ROUTE_SHADOW_ADVISORY";
  authority:
    "NON_AUTHORITATIVE";
  predictionCreatedAt:
    string | null;
  modelProvenance: {
    organizationId: string;
    modelRegistryId: string;
    trainingRunId: string;
    runVersion: string;
    datasetFingerprint: string;
    algorithmVersion: string;
    trainingContractVersion: string;
    featureSchemaVersion: string;
    labelSchemaVersion: string;
  };
  rawModelOutput: {
    semantics:
      "UNCALIBRATED_LOGISTIC_MODEL_OUTPUT";
    predictedProbability: number;
  };
  evidenceAssessment:
    RouteRiskShadowEvidenceAssessment;
  routeEvidenceScope:
    RouteRiskShadowRouteEvidenceScope;
};

function requireProbability(
  value: number
) {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      "Invalid prediction.predictedProbability: expected a probability between 0 and 1."
    );
  }

  return value;
}

/**
 * Composes existing canonical shadow artifacts into one descriptive,
 * single-route advisory forecast contract. It performs no scoring, I/O,
 * calibration, ranking, selection, or production decision-making.
 */
export function buildRouteRiskShadowAdvisoryForecast({
  artifact,
  prediction,
  evidenceAssessment,
  routeEvidenceScope,
}: BuildRouteRiskShadowAdvisoryForecastInput): RouteRiskShadowAdvisoryForecast {
  const predictedProbability =
    requireProbability(
      prediction.predictedProbability
    );

  return {
    forecastVersion:
      ROUTE_RISK_SHADOW_ADVISORY_FORECAST_VERSION,
    forecastMode:
      "SINGLE_ROUTE_SHADOW_ADVISORY",
    authority:
      "NON_AUTHORITATIVE",
    predictionCreatedAt:
      routeEvidenceScope.predictionCreatedAt,
    modelProvenance: {
      organizationId:
        artifact.organizationId,
      modelRegistryId:
        artifact.registryId,
      trainingRunId:
        artifact.trainingRunId,
      runVersion:
        artifact.runVersion,
      datasetFingerprint:
        artifact.datasetFingerprint,
      algorithmVersion:
        artifact.model.algorithmVersion,
      trainingContractVersion:
        artifact.model.trainingContractVersion,
      featureSchemaVersion:
        artifact.model.featureSchemaVersion,
      labelSchemaVersion:
        artifact.model.labelSchemaVersion,
    },
    rawModelOutput: {
      semantics:
        evidenceAssessment.probabilitySemantics,
      predictedProbability,
    },
    evidenceAssessment:
      structuredClone(
        evidenceAssessment
      ),
    routeEvidenceScope:
      structuredClone(
        routeEvidenceScope
      ),
  };
}
