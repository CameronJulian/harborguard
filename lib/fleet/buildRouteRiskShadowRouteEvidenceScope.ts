import {
  buildCrowdSegmentKey,
  CROWD_DIRECTION_BUCKET_LABELS,
  CROWD_DIRECTION_BUCKET_VERSION,
  CROWD_SEGMENT_KEY_DECIMAL_PLACES,
  CROWD_SEGMENT_KEY_VERSION,
  resolveCrowdDirectionBucket,
  type CrowdDirectionBucket,
} from "./crowdSegmentIdentity.ts";

export const ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION =
  "harborguard-route-risk-shadow-route-evidence-scope-v1" as const;

export const ROUTE_EVIDENCE_POINT_DECIMAL_PLACES =
  6 as const;

export type RouteEvidenceScopeSource =
  | "provider_geometry"
  | "endpoint_only";

export type BuildRouteRiskShadowRouteEvidenceScopeInput = {
  routePoints:
    readonly (readonly [number, number])[];
  scopeSource: RouteEvidenceScopeSource;
  predictionCreatedAt: unknown;
};

export type RouteRiskShadowRouteEvidenceScope = {
  scopeVersion:
    typeof ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION;
  scopeSource:
    | RouteEvidenceScopeSource
    | "unavailable";
  unavailableReason:
    | "invalid_prediction_timestamp"
    | "invalid_route_points"
    | "insufficient_route_points"
    | null;
  predictionCreatedAt: string | null;
  identityContract: {
    pointDecimalPlaces:
      typeof ROUTE_EVIDENCE_POINT_DECIMAL_PLACES;
    segmentKeyVersion:
      typeof CROWD_SEGMENT_KEY_VERSION;
    segmentKeyDecimalPlaces:
      typeof CROWD_SEGMENT_KEY_DECIMAL_PLACES;
    directionBucketVersion:
      typeof CROWD_DIRECTION_BUCKET_VERSION;
    directionBucketLabels:
      typeof CROWD_DIRECTION_BUCKET_LABELS;
  };
  routePoints: Array<{
    index: number;
    latitude: number;
    longitude: number;
    segmentKey: string;
  }>;
  routeSegments: Array<{
    index: number;
    fromPointIndex: number;
    toPointIndex: number;
    segmentKey: string;
    directionBucket:
      CrowdDirectionBucket | null;
  }>;
};

function identityContract(): RouteRiskShadowRouteEvidenceScope["identityContract"] {
  return {
    pointDecimalPlaces:
      ROUTE_EVIDENCE_POINT_DECIMAL_PLACES,
    segmentKeyVersion:
      CROWD_SEGMENT_KEY_VERSION,
    segmentKeyDecimalPlaces:
      CROWD_SEGMENT_KEY_DECIMAL_PLACES,
    directionBucketVersion:
      CROWD_DIRECTION_BUCKET_VERSION,
    directionBucketLabels:
      CROWD_DIRECTION_BUCKET_LABELS,
  };
}

function unavailableScope(
  reason:
    Exclude<
      RouteRiskShadowRouteEvidenceScope["unavailableReason"],
      null
    >,
  predictionCreatedAt: string | null
): RouteRiskShadowRouteEvidenceScope {
  return {
    scopeVersion:
      ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION,
    scopeSource: "unavailable",
    unavailableReason: reason,
    predictionCreatedAt,
    identityContract:
      identityContract(),
    routePoints: [],
    routeSegments: [],
  };
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

function canonicalCoordinate(
  value: number
) {
  return Number(
    value.toFixed(
      ROUTE_EVIDENCE_POINT_DECIMAL_PLACES
    )
  );
}

/**
 * Builds deterministic route-scope provenance from route points that the
 * Route Safety request has already computed. It performs no I/O, evidence
 * query, coverage assessment, scoring, or production decision-making.
 */
export function buildRouteRiskShadowRouteEvidenceScope({
  routePoints,
  scopeSource,
  predictionCreatedAt,
}: BuildRouteRiskShadowRouteEvidenceScopeInput): RouteRiskShadowRouteEvidenceScope {
  if (
    typeof predictionCreatedAt !== "string" ||
    !Number.isFinite(
      Date.parse(predictionCreatedAt)
    )
  ) {
    return unavailableScope(
      "invalid_prediction_timestamp",
      null
    );
  }

  const normalizedPredictionCreatedAt =
    new Date(
      predictionCreatedAt
    ).toISOString();

  if (
    !Array.isArray(routePoints) ||
    routePoints.length < 2
  ) {
    return unavailableScope(
      "insufficient_route_points",
      normalizedPredictionCreatedAt
    );
  }

  for (const point of routePoints) {
    if (
      !Array.isArray(point) ||
      point.length !== 2 ||
      !validCoordinate(
        point[0],
        point[1]
      )
    ) {
      return unavailableScope(
        "invalid_route_points",
        normalizedPredictionCreatedAt
      );
    }
  }

  const canonicalPoints =
    routePoints.map(
      (
        [latitude, longitude],
        index
      ) => ({
        index,
        latitude:
          canonicalCoordinate(
            latitude
          ),
        longitude:
          canonicalCoordinate(
            longitude
          ),
        segmentKey:
          buildCrowdSegmentKey(
            latitude,
            longitude
          ),
      })
    );

  const routeSegments:
    RouteRiskShadowRouteEvidenceScope["routeSegments"] = [];

  for (
    let index = 1;
    index < routePoints.length;
    index += 1
  ) {
    const previous =
      routePoints[index - 1];
    const current =
      routePoints[index];

    routeSegments.push({
      index:
        index - 1,
      fromPointIndex:
        index - 1,
      toPointIndex:
        index,
      segmentKey:
        canonicalPoints[index]
          .segmentKey,
      directionBucket:
        resolveCrowdDirectionBucket(
          previous[0],
          previous[1],
          current[0],
          current[1]
        ),
    });
  }

  return {
    scopeVersion:
      ROUTE_RISK_SHADOW_ROUTE_EVIDENCE_SCOPE_VERSION,
    scopeSource,
    unavailableReason: null,
    predictionCreatedAt:
      normalizedPredictionCreatedAt,
    identityContract:
      identityContract(),
    routePoints:
      canonicalPoints,
    routeSegments,
  };
}
