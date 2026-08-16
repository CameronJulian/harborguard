import {
  createHash,
} from "crypto";

import type {
  RouteRiskShadowCandidateRouteIdentity,
} from "./buildRouteRiskShadowCandidateRouteIdentity.ts";

import {
  ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION,
} from "./buildRouteRiskShadowCandidateRouteIdentity.ts";

export const ROUTE_RISK_SHADOW_CANDIDATE_SET_IDENTITY_VERSION =
  "harborguard-route-risk-shadow-candidate-set-identity-v1" as const;

const CANDIDATE_SET_MEMBERSHIP_SEMANTICS =
  "UNORDERED_UNIQUE_ROUTE_FINGERPRINT_SET" as const;

export type RouteRiskShadowCandidateSetIdentityUnavailableReason =
  | "empty_candidate_collection"
  | "unavailable_candidate_route_identity"
  | "unsupported_candidate_route_identity_version"
  | "invalid_candidate_route_fingerprint"
  | "duplicate_candidate_route_fingerprint";

export type BuildRouteRiskShadowCandidateSetIdentityInput = {
  candidateRouteIdentities:
    readonly RouteRiskShadowCandidateRouteIdentity[];
};

export type RouteRiskShadowCandidateSetIdentity = {
  setVersion:
    typeof ROUTE_RISK_SHADOW_CANDIDATE_SET_IDENTITY_VERSION;
  semantics:
    "DESCRIPTIVE_CANDIDATE_ROUTE_MEMBERSHIP_IDENTITY";
  authority:
    "NON_AUTHORITATIVE";
  identityState:
    | "AVAILABLE"
    | "UNAVAILABLE";
  algorithm:
    "SHA-256";
  candidateRouteIdentityVersion:
    typeof ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION;
  memberCount: number;
  memberRouteFingerprints: string[];
  setFingerprint: string | null;
  unavailableReason:
    RouteRiskShadowCandidateSetIdentityUnavailableReason | null;
};

function unavailableIdentity(
  unavailableReason:
    RouteRiskShadowCandidateSetIdentityUnavailableReason,
  memberCount = 0
): RouteRiskShadowCandidateSetIdentity {
  return {
    setVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_SET_IDENTITY_VERSION,
    semantics:
      "DESCRIPTIVE_CANDIDATE_ROUTE_MEMBERSHIP_IDENTITY",
    authority:
      "NON_AUTHORITATIVE",
    identityState:
      "UNAVAILABLE",
    algorithm:
      "SHA-256",
    candidateRouteIdentityVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION,
    memberCount,
    memberRouteFingerprints: [],
    setFingerprint: null,
    unavailableReason,
  };
}

function validFingerprint(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{64}$/.test(value)
  );
}

/**
 * Builds a stable identity for an unordered unique collection of existing
 * candidate-route identities. It performs no I/O or operational decisions.
 */
export function buildRouteRiskShadowCandidateSetIdentity({
  candidateRouteIdentities,
}: BuildRouteRiskShadowCandidateSetIdentityInput): RouteRiskShadowCandidateSetIdentity {
  if (
    !Array.isArray(candidateRouteIdentities) ||
    candidateRouteIdentities.length === 0
  ) {
    return unavailableIdentity(
      "empty_candidate_collection"
    );
  }

  const fingerprints: string[] = [];

  for (const candidateRouteIdentity of candidateRouteIdentities) {
    if (
      candidateRouteIdentity.identityVersion !==
      ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION
    ) {
      return unavailableIdentity(
        "unsupported_candidate_route_identity_version",
        candidateRouteIdentities.length
      );
    }

    if (
      candidateRouteIdentity.identityState !==
        "AVAILABLE"
    ) {
      return unavailableIdentity(
        "unavailable_candidate_route_identity",
        candidateRouteIdentities.length
      );
    }

    if (
      !validFingerprint(
        candidateRouteIdentity.routeFingerprint
      )
    ) {
      return unavailableIdentity(
        "invalid_candidate_route_fingerprint",
        candidateRouteIdentities.length
      );
    }

    fingerprints.push(
      candidateRouteIdentity.routeFingerprint
    );
  }

  const normalizedFingerprints =
    [...fingerprints].sort();

  if (
    new Set(normalizedFingerprints).size !==
    normalizedFingerprints.length
  ) {
    return unavailableIdentity(
      "duplicate_candidate_route_fingerprint",
      candidateRouteIdentities.length
    );
  }

  const fingerprintPayload = {
    setVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_SET_IDENTITY_VERSION,
    candidateRouteIdentityVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION,
    membershipSemantics:
      CANDIDATE_SET_MEMBERSHIP_SEMANTICS,
    memberRouteFingerprints:
      normalizedFingerprints,
  };

  const setFingerprint =
    createHash("sha256")
      .update(
        JSON.stringify(
          fingerprintPayload
        )
      )
      .digest("hex");

  return {
    setVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_SET_IDENTITY_VERSION,
    semantics:
      "DESCRIPTIVE_CANDIDATE_ROUTE_MEMBERSHIP_IDENTITY",
    authority:
      "NON_AUTHORITATIVE",
    identityState:
      "AVAILABLE",
    algorithm:
      "SHA-256",
    candidateRouteIdentityVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION,
    memberCount:
      normalizedFingerprints.length,
    memberRouteFingerprints:
      normalizedFingerprints,
    setFingerprint,
    unavailableReason: null,
  };
}
