export const ROUTE_RISK_SHADOW_TRAVEL_COST_PROVENANCE_VERSION =
  "harborguard-route-risk-shadow-travel-cost-provenance-v1" as const;

export type RouteRiskShadowTravelCostProvenanceIssue =
  | "invalid_prediction_timestamp"
  | "route_estimate_unavailable"
  | "invalid_distance_meters"
  | "invalid_traffic_aware_duration"
  | "invalid_static_duration";

export type BuildRouteRiskShadowTravelCostProvenanceInput = {
  routeEstimate:
    | {
        distanceMeters?: unknown;
        duration?: unknown;
        staticDuration?: unknown;
      }
    | null
    | undefined;
  predictionCreatedAt: unknown;
};

export type RouteRiskShadowTravelCostProvenance = {
  provenanceVersion:
    typeof ROUTE_RISK_SHADOW_TRAVEL_COST_PROVENANCE_VERSION;
  semantics:
    "DESCRIPTIVE_PROVIDER_TRAVEL_COST";
  authority:
    "NON_AUTHORITATIVE";
  predictionCreatedAt: string | null;
  source: {
    provider: "GOOGLE_ROUTES_V2";
    travelMode: "DRIVE";
    routingPreference: "TRAFFIC_AWARE";
    alternativeRoutesRequested: false;
  };
  availability:
    | "AVAILABLE"
    | "PARTIAL"
    | "UNAVAILABLE";
  availabilityIssues:
    RouteRiskShadowTravelCostProvenanceIssue[];
  providerTravelCost: {
    distanceMeters: number | null;
    trafficAwareDurationSeconds:
      number | null;
    staticDurationSeconds:
      number | null;
  };
};

function normalizeTimestamp(
  value: unknown
) {
  if (
    typeof value !== "string" ||
    !Number.isFinite(Date.parse(value))
  ) {
    return null;
  }

  return new Date(value).toISOString();
}

function parseDistanceMeters(
  value: unknown
) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function parseGoogleDurationSeconds(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const match =
    /^(0|[1-9]\d*)(?:\.(\d{1,9}))?s$/.exec(
      value
    );

  if (!match) {
    return null;
  }

  const wholeSeconds = Number(match[1]);

  if (!Number.isSafeInteger(wholeSeconds)) {
    return null;
  }

  const fractionalSeconds = match[2]
    ? Number(
        match[2].padEnd(9, "0")
      ) / 1_000_000_000
    : 0;

  const seconds =
    wholeSeconds + fractionalSeconds;

  return Number.isFinite(seconds)
    ? seconds
    : null;
}

/**
 * Normalizes travel-cost provenance that the Route Safety request has
 * already received from Google Routes. It performs no I/O, routing, risk
 * scoring, calibration, ranking, selection, or production decision-making.
 */
export function buildRouteRiskShadowTravelCostProvenance({
  routeEstimate,
  predictionCreatedAt,
}: BuildRouteRiskShadowTravelCostProvenanceInput): RouteRiskShadowTravelCostProvenance {
  const normalizedPredictionCreatedAt =
    normalizeTimestamp(
      predictionCreatedAt
    );
  const availabilityIssues:
    RouteRiskShadowTravelCostProvenanceIssue[] = [];

  if (!normalizedPredictionCreatedAt) {
    availabilityIssues.push(
      "invalid_prediction_timestamp"
    );
  }

  let distanceMeters: number | null = null;
  let trafficAwareDurationSeconds:
    number | null = null;
  let staticDurationSeconds:
    number | null = null;

  if (!routeEstimate) {
    availabilityIssues.push(
      "route_estimate_unavailable"
    );
  } else {
    distanceMeters =
      parseDistanceMeters(
        routeEstimate.distanceMeters
      );
    trafficAwareDurationSeconds =
      parseGoogleDurationSeconds(
        routeEstimate.duration
      );
    staticDurationSeconds =
      parseGoogleDurationSeconds(
        routeEstimate.staticDuration
      );

    if (distanceMeters === null) {
      availabilityIssues.push(
        "invalid_distance_meters"
      );
    }

    if (
      trafficAwareDurationSeconds === null
    ) {
      availabilityIssues.push(
        "invalid_traffic_aware_duration"
      );
    }

    if (staticDurationSeconds === null) {
      availabilityIssues.push(
        "invalid_static_duration"
      );
    }
  }

  const availableValueCount = [
    distanceMeters,
    trafficAwareDurationSeconds,
    staticDurationSeconds,
  ].filter((value) => value !== null).length;

  const availability =
    !normalizedPredictionCreatedAt ||
    availableValueCount === 0
      ? "UNAVAILABLE"
      : availableValueCount === 3
        ? "AVAILABLE"
        : "PARTIAL";

  return {
    provenanceVersion:
      ROUTE_RISK_SHADOW_TRAVEL_COST_PROVENANCE_VERSION,
    semantics:
      "DESCRIPTIVE_PROVIDER_TRAVEL_COST",
    authority:
      "NON_AUTHORITATIVE",
    predictionCreatedAt:
      normalizedPredictionCreatedAt,
    source: {
      provider: "GOOGLE_ROUTES_V2",
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      alternativeRoutesRequested: false,
    },
    availability,
    availabilityIssues,
    providerTravelCost: {
      distanceMeters,
      trafficAwareDurationSeconds,
      staticDurationSeconds,
    },
  };
}
