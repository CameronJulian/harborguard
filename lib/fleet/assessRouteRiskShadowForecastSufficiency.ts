import type {
  RouteRiskShadowEvidenceAssessment,
} from "@/lib/fleet/assessRouteRiskShadowEvidence";

import type {
  RouteRiskShadowRouteEvidenceScope,
} from "@/lib/fleet/buildRouteRiskShadowRouteEvidenceScope";

export const ROUTE_RISK_SHADOW_FORECAST_SUFFICIENCY_VERSION =
  "harborguard-route-risk-shadow-forecast-sufficiency-v1" as const;

export type RouteRiskShadowForecastSufficiencyState =
  | "INSUFFICIENT_EVIDENCE"
  | "UNVALIDATED";

export type AssessRouteRiskShadowForecastSufficiencyInput = {
  evidenceAssessment: RouteRiskShadowEvidenceAssessment;
  routeEvidenceScope: RouteRiskShadowRouteEvidenceScope;
};

export type RouteRiskShadowForecastSufficiency = {
  assessmentVersion:
    typeof ROUTE_RISK_SHADOW_FORECAST_SUFFICIENCY_VERSION;

  state: RouteRiskShadowForecastSufficiencyState;

  authority: "NON_AUTHORITATIVE";

  predictionSemantics:
    "UNCALIBRATED_MODEL_OUTPUT";

  usableForProductionDecision: false;

  reasonCodes: string[];

  requiredEvidence: {
    structuralTrainingEvidence: boolean;
    calibration: false;
    representativeness: false;
    featureRangeFamiliarity: false;
    geographicCoverage: false;
    crowdIntelligence: false;
    temporalFreshnessPolicy: false;
    validRouteEvidenceScope: boolean;
  };
};

/**
 * Describes whether an existing HarborGuard shadow forecast has enough
 * evidence to be interpreted beyond a raw experimental model output.
 *
 * This helper deliberately:
 *
 * - does not estimate confidence;
 * - does not estimate statistical uncertainty;
 * - does not calibrate model probabilities;
 * - does not invent evidence thresholds;
 * - does not query Crowd Intelligence;
 * - does not alter model scoring;
 * - does not rank or recommend routes;
 * - does not influence production Route Safety.
 *
 * Until real-world calibration and representativeness evidence exists,
 * the strongest possible state is UNVALIDATED.
 */
export function assessRouteRiskShadowForecastSufficiency({
  evidenceAssessment,
  routeEvidenceScope,
}: AssessRouteRiskShadowForecastSufficiencyInput): RouteRiskShadowForecastSufficiency {
  const reasonCodes = [
    ...evidenceAssessment.reasonCodes,
  ];

  const structuralTrainingEvidence =
    evidenceAssessment.state !==
    "INSUFFICIENT_EVIDENCE";

  const validRouteEvidenceScope =
    routeEvidenceScope.scopeSource !==
      "unavailable" &&
    routeEvidenceScope.unavailableReason === null &&
    routeEvidenceScope.routePoints.length >= 2 &&
    routeEvidenceScope.routeSegments.length >= 1;

  if (!validRouteEvidenceScope) {
    reasonCodes.push(
      "ROUTE_EVIDENCE_SCOPE_INSUFFICIENT"
    );
  }

  const state:
    RouteRiskShadowForecastSufficiencyState =
    !structuralTrainingEvidence ||
    !validRouteEvidenceScope
      ? "INSUFFICIENT_EVIDENCE"
      : "UNVALIDATED";

  return {
    assessmentVersion:
      ROUTE_RISK_SHADOW_FORECAST_SUFFICIENCY_VERSION,

    state,

    authority:
      "NON_AUTHORITATIVE",

    predictionSemantics:
      "UNCALIBRATED_MODEL_OUTPUT",

    usableForProductionDecision:
      false,

    reasonCodes: [
      ...new Set(reasonCodes),
    ],

    requiredEvidence: {
      structuralTrainingEvidence,
      calibration: false,
      representativeness: false,
      featureRangeFamiliarity: false,
      geographicCoverage: false,
      crowdIntelligence: false,
      temporalFreshnessPolicy: false,
      validRouteEvidenceScope,
    },
  };
}
