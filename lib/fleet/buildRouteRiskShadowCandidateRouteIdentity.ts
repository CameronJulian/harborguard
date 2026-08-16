import {
  createHash,
} from "crypto";

import {
  ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION,
  type RouteRiskShadowRouteEvidenceScope,
} from "./buildRouteRiskShadowRouteEvidenceScope.ts";

export const ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION =
  "harborguard-route-risk-shadow-candidate-route-identity-v1" as const;

export type RouteRiskShadowCandidateRouteIdentityUnavailableReason =
  | "invalid_prediction_timestamp"
  | "invalid_route_points"
  | "insufficient_route_points"
  | "route_evidence_scope_unavailable"
  | "unsupported_route_evidence_scope_version"
  | "invalid_route_identity_contract"
  | "invalid_route_scope_source";

export type BuildRouteRiskShadowCandidateRouteIdentityInput = {
  routeEvidenceScope:
    RouteRiskShadowRouteEvidenceScope;
};

export type RouteRiskShadowCandidateRouteIdentity = {
  identityVersion:
    typeof ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION;
  semantics:
    "DESCRIPTIVE_CANONICAL_ROUTE_GEOMETRY_IDENTITY";
  authority:
    "NON_AUTHORITATIVE";
  identityState:
    | "AVAILABLE"
    | "UNAVAILABLE";
  algorithm:
    "SHA-256";
  routeFingerprint: string | null;
  routeEvidenceScopeVersion:
    typeof ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION;
  scopeSource:
    RouteRiskShadowRouteEvidenceScope["scopeSource"];
  unavailableReason:
    RouteRiskShadowCandidateRouteIdentityUnavailableReason | null;
};

function unavailableIdentity(
  routeEvidenceScope:
    RouteRiskShadowRouteEvidenceScope,
  unavailableReason:
    RouteRiskShadowCandidateRouteIdentityUnavailableReason
): RouteRiskShadowCandidateRouteIdentity {
  return {
    identityVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION,
    semantics:
      "DESCRIPTIVE_CANONICAL_ROUTE_GEOMETRY_IDENTITY",
    authority:
      "NON_AUTHORITATIVE",
    identityState:
      "UNAVAILABLE",
    algorithm:
      "SHA-256",
    routeFingerprint: null,
    routeEvidenceScopeVersion:
      routeEvidenceScope.scopeVersion,
    scopeSource:
      routeEvidenceScope.scopeSource,
    unavailableReason,
  };
}

function nonBlankString(
  value: unknown
) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function validDecimalPlaces(
  value: unknown
) {
  return (
    Number.isInteger(value) &&
    (value as number) >= 0 &&
    (value as number) <= 15
  );
}

function validIdentityContract(
  identityContract:
    RouteRiskShadowRouteEvidenceScope["identityContract"]
) {
  return (
    identityContract &&
    validDecimalPlaces(
      identityContract.pointDecimalPlaces
    ) &&
    nonBlankString(
      identityContract.segmentKeyVersion
    ) &&
    validDecimalPlaces(
      identityContract.segmentKeyDecimalPlaces
    ) &&
    nonBlankString(
      identityContract.directionBucketVersion
    )
  );
}

function validCoordinate(
  latitude: number,
  longitude: number
) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function validCanonicalRoutePoints(
  routeEvidenceScope:
    RouteRiskShadowRouteEvidenceScope
) {
  const pointDecimalPlaces =
    routeEvidenceScope.identityContract
      .pointDecimalPlaces;

  return routeEvidenceScope.routePoints.every(
    (point, index) =>
      point &&
      point.index === index &&
      validCoordinate(
        point.latitude,
        point.longitude
      ) &&
      point.latitude ===
        Number(
          point.latitude.toFixed(
            pointDecimalPlaces
          )
        ) &&
      point.longitude ===
        Number(
          point.longitude.toFixed(
            pointDecimalPlaces
          )
        )
  );
}

/**
 * Derives a stable, direction-sensitive identity from an existing canonical
 * route-evidence scope. It performs no I/O or operational decision-making.
 */
export function buildRouteRiskShadowCandidateRouteIdentity({
  routeEvidenceScope,
}: BuildRouteRiskShadowCandidateRouteIdentityInput): RouteRiskShadowCandidateRouteIdentity {
  if (
    routeEvidenceScope.scopeVersion !==
    ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION
  ) {
    return unavailableIdentity(
      routeEvidenceScope,
      "unsupported_route_evidence_scope_version"
    );
  }

  if (
    routeEvidenceScope.scopeSource ===
    "unavailable"
  ) {
    return unavailableIdentity(
      routeEvidenceScope,
      routeEvidenceScope.unavailableReason ??
        "route_evidence_scope_unavailable"
    );
  }

  if (
    routeEvidenceScope.scopeSource !==
      "provider_geometry" &&
    routeEvidenceScope.scopeSource !==
      "endpoint_only"
  ) {
    return unavailableIdentity(
      routeEvidenceScope,
      "invalid_route_scope_source"
    );
  }

  if (
    !validIdentityContract(
      routeEvidenceScope.identityContract
    )
  ) {
    return unavailableIdentity(
      routeEvidenceScope,
      "invalid_route_identity_contract"
    );
  }

  if (
    !Array.isArray(
      routeEvidenceScope.routePoints
    ) ||
    routeEvidenceScope.routePoints.length < 2
  ) {
    return unavailableIdentity(
      routeEvidenceScope,
      "insufficient_route_points"
    );
  }

  if (
    !validCanonicalRoutePoints(
      routeEvidenceScope
    )
  ) {
    return unavailableIdentity(
      routeEvidenceScope,
      "invalid_route_points"
    );
  }

  const fingerprintPayload = {
    identityVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION,
    routeEvidenceScopeVersion:
      routeEvidenceScope.scopeVersion,
    scopeSource:
      routeEvidenceScope.scopeSource,
    identityContract: {
      pointDecimalPlaces:
        routeEvidenceScope.identityContract
          .pointDecimalPlaces,
      segmentKeyVersion:
        routeEvidenceScope.identityContract
          .segmentKeyVersion,
      segmentKeyDecimalPlaces:
        routeEvidenceScope.identityContract
          .segmentKeyDecimalPlaces,
      directionBucketVersion:
        routeEvidenceScope.identityContract
          .directionBucketVersion,
    },
    routePoints:
      routeEvidenceScope.routePoints.map(
        (point) => ({
          index: point.index,
          latitude: point.latitude,
          longitude: point.longitude,
        })
      ),
  };

  const routeFingerprint =
    createHash("sha256")
      .update(
        JSON.stringify(
          fingerprintPayload
        )
      )
      .digest("hex");

  return {
    identityVersion:
      ROUTE_RISK_SHADOW_CANDIDATE_ROUTE_IDENTITY_VERSION,
    semantics:
      "DESCRIPTIVE_CANONICAL_ROUTE_GEOMETRY_IDENTITY",
    authority:
      "NON_AUTHORITATIVE",
    identityState:
      "AVAILABLE",
    algorithm:
      "SHA-256",
    routeFingerprint,
    routeEvidenceScopeVersion:
      routeEvidenceScope.scopeVersion,
    scopeSource:
      routeEvidenceScope.scopeSource,
    unavailableReason: null,
  };
}
