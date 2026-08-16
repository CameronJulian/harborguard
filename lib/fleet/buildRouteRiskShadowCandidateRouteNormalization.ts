import {
  buildRouteRiskShadowCandidateRouteIdentity,
  type RouteRiskShadowCandidateRouteIdentity,
} from "./buildRouteRiskShadowCandidateRouteIdentity.ts";

import {
  buildRouteRiskShadowRouteEvidenceScope,
  type RouteEvidenceScopeSource,
  type RouteRiskShadowRouteEvidenceScope,
} from "./buildRouteRiskShadowRouteEvidenceScope.ts";

export const ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_NORMALIZATION_VERSION =
  "harborguard-route-risk-shadow-candidate-route-normalization-v1" as const;

export type BuildRouteRiskShadowCandidateRouteNormalizationInput = {
  routePoints: readonly (readonly [number, number])[];
  scopeSource: RouteEvidenceScopeSource;
  predictionCreatedAt: unknown;
};

export type RouteRiskShadowCandidateRouteNormalizationUnavailableReason =
  | "invalid_prediction_timestamp"
  | "invalid_route_points"
  | "insufficient_route_points"
  | "route_evidence_scope_unavailable"
  | "unsupported_route_evidence_scope_version"
  | "invalid_route_identity_contract"
  | "invalid_route_scope_source";

export type RouteRiskShadowCandidateRouteNormalization = {
  normalizationVersion:
    typeof ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_NORMALIZATION_VERSION;
  semantics:
    "DESCRIPTIVE_SHADOW_CANDIDATE_ROUTE_NORMALIZATION";
  authority: "NON_AUTHORITATIVE";
  normalizationState: "AVAILABLE" | "UNAVAILABLE";
  routeEvidenceScope: RouteRiskShadowRouteEvidenceScope;
  candidateRouteIdentity: RouteRiskShadowCandidateRouteIdentity;
  unavailableReason:
    RouteRiskShadowCandidateRouteNormalizationUnavailableReason | null;
};

function unavailableReasonFor(
  routeEvidenceScope: RouteRiskShadowRouteEvidenceScope,
  candidateRouteIdentity: RouteRiskShadowCandidateRouteIdentity
): RouteRiskShadowCandidateRouteNormalizationUnavailableReason {
  if (routeEvidenceScope.unavailableReason) {
    return routeEvidenceScope.unavailableReason;
  }

  if (candidateRouteIdentity.unavailableReason) {
    return candidateRouteIdentity.unavailableReason;
  }

  return "route_evidence_scope_unavailable";
}

/**
 * Normalizes one already-supplied route candidate into the canonical
 * shadow identity contracts. It performs no I/O, routing, scoring, or
 * operational decision-making.
 */
export function buildRouteRiskShadowCandidateRouteNormalization({
  routePoints,
  scopeSource,
  predictionCreatedAt,
}: BuildRouteRiskShadowCandidateRouteNormalizationInput): RouteRiskShadowCandidateRouteNormalization {
  const routeEvidenceScope =
    buildRouteRiskShadowRouteEvidenceScope({
      routePoints,
      scopeSource,
      predictionCreatedAt,
    });

  const candidateRouteIdentity =
    buildRouteRiskShadowCandidateRouteIdentity({
      routeEvidenceScope,
    });

  if (
    routeEvidenceScope.scopeSource === "unavailable" ||
    candidateRouteIdentity.identityState !== "AVAILABLE"
  ) {
    return {
      normalizationVersion:
        ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_NORMALIZATION_VERSION,
      semantics:
        "DESCRIPTIVE_SHADOW_CANDIDATE_ROUTE_NORMALIZATION",
      authority: "NON_AUTHORITATIVE",
      normalizationState: "UNAVAILABLE",
      routeEvidenceScope,
      candidateRouteIdentity,
      unavailableReason: unavailableReasonFor(
        routeEvidenceScope,
        candidateRouteIdentity
      ),
    };
  }

  return {
    normalizationVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_NORMALIZATION_VERSION,
    semantics:
      "DESCRIPTIVE_SHADOW_CANDIDATE_ROUTE_NORMALIZATION",
    authority: "NON_AUTHORITATIVE",
    normalizationState: "AVAILABLE",
    routeEvidenceScope,
    candidateRouteIdentity,
    unavailableReason: null,
  };
}
