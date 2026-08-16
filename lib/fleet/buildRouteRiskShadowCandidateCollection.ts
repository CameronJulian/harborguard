import {
  buildRouteRiskShadowCandidateRouteIdentity,
  type RouteRiskShadowCandidateRouteIdentity,
} from "./buildRouteRiskShadowCandidateRouteIdentity.ts";

import {
  buildRouteRiskShadowCandidateSetIdentity,
  type RouteRiskShadowCandidateSetIdentity,
} from "./buildRouteRiskShadowCandidateSetIdentity.ts";

import type {
  RouteRiskShadowRouteEvidenceScope,
} from "./buildRouteRiskShadowRouteEvidenceScope.ts";

export const ROUTE_RISK_SHADOW_CANDIDATE_COLLECTION_VERSION =
  "harborguard-route-risk-shadow-candidate-collection-v1" as const;

export type BuildRouteRiskShadowCandidateCollectionInput = {
  candidates: readonly {
    candidateRouteIdentity: RouteRiskShadowCandidateRouteIdentity;
    routeEvidenceScope: RouteRiskShadowRouteEvidenceScope;
  }[];
};

export type RouteRiskShadowCandidateCollectionUnavailableReason =
  | "empty_candidate_collection"
  | "invalid_candidate_member"
  | "candidate_route_identity_mismatch"
  | "candidate_set_identity_unavailable";

export type RouteRiskShadowCandidateCollectionMember = {
  candidateRouteIdentity: RouteRiskShadowCandidateRouteIdentity;
  routeEvidenceScope: RouteRiskShadowRouteEvidenceScope;
};

export type RouteRiskShadowCandidateCollection = {
  collectionVersion:
    typeof ROUTE_RISK_SHADOW_CANDIDATE_COLLECTION_VERSION;
  semantics:
    "DESCRIPTIVE_SHADOW_CANDIDATE_ROUTE_COLLECTION";
  authority: "NON_AUTHORITATIVE";
  collectionState: "AVAILABLE" | "UNAVAILABLE";
  candidateSetIdentity: RouteRiskShadowCandidateSetIdentity;
  candidates: RouteRiskShadowCandidateCollectionMember[];
  unavailableReason:
    RouteRiskShadowCandidateCollectionUnavailableReason | null;
};

function unavailableCollection(
  unavailableReason:
    RouteRiskShadowCandidateCollectionUnavailableReason,
  candidateSetIdentity = buildRouteRiskShadowCandidateSetIdentity({
    candidateRouteIdentities: [],
  })
): RouteRiskShadowCandidateCollection {
  return {
    collectionVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_COLLECTION_VERSION,
    semantics:
      "DESCRIPTIVE_SHADOW_CANDIDATE_ROUTE_COLLECTION",
    authority: "NON_AUTHORITATIVE",
    collectionState: "UNAVAILABLE",
    candidateSetIdentity,
    candidates: [],
    unavailableReason,
  };
}

function sameCandidateRouteIdentity(
  expected: RouteRiskShadowCandidateRouteIdentity,
  actual: RouteRiskShadowCandidateRouteIdentity
) {
  return (
    expected.identityVersion === actual.identityVersion &&
    expected.semantics === actual.semantics &&
    expected.authority === actual.authority &&
    expected.identityState === actual.identityState &&
    expected.algorithm === actual.algorithm &&
    expected.routeFingerprint === actual.routeFingerprint &&
    expected.routeEvidenceScopeVersion ===
      actual.routeEvidenceScopeVersion &&
    expected.scopeSource === actual.scopeSource &&
    expected.unavailableReason === actual.unavailableReason
  );
}

function copyRouteEvidenceScope(
  scope: RouteRiskShadowRouteEvidenceScope
): RouteRiskShadowRouteEvidenceScope {
  return {
    ...scope,
    identityContract: {
      ...scope.identityContract,
      directionBucketLabels: [
        ...scope.identityContract.directionBucketLabels,
      ],
    },
    routePoints: scope.routePoints.map((point) => ({
      ...point,
    })),
    routeSegments: scope.routeSegments.map((segment) => ({
      ...segment,
    })),
  };
}

/**
 * Composes existing route identities and scopes into a deterministic,
 * shadow-only candidate collection. It performs no I/O or scoring.
 */
export function buildRouteRiskShadowCandidateCollection({
  candidates,
}: BuildRouteRiskShadowCandidateCollectionInput): RouteRiskShadowCandidateCollection {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return unavailableCollection("empty_candidate_collection");
  }

  const members: RouteRiskShadowCandidateCollectionMember[] = [];

  for (const candidate of candidates) {
    if (
      !candidate ||
      !candidate.candidateRouteIdentity ||
      !candidate.routeEvidenceScope
    ) {
      return unavailableCollection("invalid_candidate_member");
    }

    const derivedIdentity =
      buildRouteRiskShadowCandidateRouteIdentity({
        routeEvidenceScope:
          candidate.routeEvidenceScope,
      });

    if (
      !sameCandidateRouteIdentity(
        candidate.candidateRouteIdentity,
        derivedIdentity
      )
    ) {
      return unavailableCollection(
        "candidate_route_identity_mismatch"
      );
    }

    if (
      derivedIdentity.identityState !== "AVAILABLE" ||
      derivedIdentity.routeFingerprint === null
    ) {
      return unavailableCollection(
        "invalid_candidate_member"
      );
    }

    members.push({
      candidateRouteIdentity: derivedIdentity,
      routeEvidenceScope: copyRouteEvidenceScope(
        candidate.routeEvidenceScope
      ),
    });
  }

  const candidateSetIdentity =
    buildRouteRiskShadowCandidateSetIdentity({
      candidateRouteIdentities: members.map(
        (member) => member.candidateRouteIdentity
      ),
    });

  if (candidateSetIdentity.identityState !== "AVAILABLE") {
    return unavailableCollection(
      "candidate_set_identity_unavailable",
      candidateSetIdentity
    );
  }

  members.sort((left, right) =>
    left.candidateRouteIdentity.routeFingerprint!.localeCompare(
      right.candidateRouteIdentity.routeFingerprint!
    )
  );

  return {
    collectionVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_COLLECTION_VERSION,
    semantics:
      "DESCRIPTIVE_SHADOW_CANDIDATE_ROUTE_COLLECTION",
    authority: "NON_AUTHORITATIVE",
    collectionState: "AVAILABLE",
    candidateSetIdentity,
    candidates: members,
    unavailableReason: null,
  };
}
