import {
  buildRouteRiskShadowCandidateRouteNormalization,
  type RouteRiskShadowCandidateRouteNormalization,
} from "./buildRouteRiskShadowCandidateRouteNormalization.ts";

import type {
  RouteEvidenceScopeSource,
} from "./buildRouteRiskShadowRouteEvidenceScope.ts";

export const ROUTE_RISK_SHADOW_PROVIDER_ROUTE_CANDIDATE_ADAPTER_VERSION =
  "harborguard-route-risk-shadow-provider-route-candidate-adapter-v1" as const;

export type BuildRouteRiskShadowProviderRouteCandidateAdapterInput = {
  providerResponse:
    | {
        routes?: readonly unknown[];
      }
    | null
    | undefined;
  scopeSource: RouteEvidenceScopeSource;
  predictionCreatedAt: unknown;
};

export type RouteRiskShadowProviderRouteCandidateAdapterUnavailableReason =
  | "invalid_provider_response"
  | "empty_provider_routes"
  | "malformed_route"
  | "missing_polyline"
  | "malformed_polyline"
  | "invalid_route_points"
  | "insufficient_route_points";

export type RouteRiskShadowProviderRouteCandidateAdapter = {
  adapterVersion:
    typeof ROUTE_RISK_SHADOW_PROVIDER_ROUTE_CANDIDATE_ADAPTER_VERSION;
  semantics:
    "DESCRIPTIVE_SHADOW_PROVIDER_ROUTE_CANDIDATE_ADAPTER";
  authority: "NON_AUTHORITATIVE";
  adapterState: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE";
  candidates: RouteRiskShadowCandidateRouteNormalization[];
  unavailableReasons:
    RouteRiskShadowProviderRouteCandidateAdapterUnavailableReason[];
};

function unavailableAdapter(
  reason:
    RouteRiskShadowProviderRouteCandidateAdapterUnavailableReason
): RouteRiskShadowProviderRouteCandidateAdapter {
  return {
    adapterVersion:
      ROUTE_RISK_SHADOW_PROVIDER_ROUTE_CANDIDATE_ADAPTER_VERSION,
    semantics:
      "DESCRIPTIVE_SHADOW_PROVIDER_ROUTE_CANDIDATE_ADAPTER",
    authority: "NON_AUTHORITATIVE",
    adapterState: "UNAVAILABLE",
    candidates: [],
    unavailableReasons: [reason],
  };
}

function decodeGoogleEncodedPolyline(
  encodedPolyline: unknown
): [number, number][] | null {
  if (
    typeof encodedPolyline !== "string" ||
    encodedPolyline.length === 0
  ) {
    return null;
  }

  const polyline = encodedPolyline;

  let index = 0;
  let latitude = 0;
  let longitude = 0;
  const points: [number, number][] = [];

  function decodeValue(): number | null {
    let result = 0;
    let shift = 0;

    while (index < polyline.length) {
      const byte =
        polyline.charCodeAt(index++) - 63;

      if (byte < 0 || byte > 63) {
        return null;
      }

      result |= (byte & 0x1f) << shift;
      shift += 5;

      if (byte < 0x20) {
        const value =
          result & 1
            ? ~(result >> 1)
            : result >> 1;

        return Number.isSafeInteger(value)
          ? value
          : null;
      }

      if (shift > 30) {
        return null;
      }
    }

    return null;
  }

  while (index < polyline.length) {
    const latitudeDelta = decodeValue();
    const longitudeDelta = decodeValue();

    if (
      latitudeDelta === null ||
      longitudeDelta === null
    ) {
      return null;
    }

    latitude += latitudeDelta;
    longitude += longitudeDelta;

    const point: [number, number] = [
      latitude / 1e5,
      longitude / 1e5,
    ];

    if (
      !Number.isFinite(point[0]) ||
      !Number.isFinite(point[1]) ||
      point[0] < -90 ||
      point[0] > 90 ||
      point[1] < -180 ||
      point[1] > 180
    ) {
      return null;
    }

    points.push(point);
  }

  return points.length > 0 ? points : null;
}

function routePolyline(
  route: unknown
): { status: "valid"; encodedPolyline: string } | {
  status: "malformed_route" | "missing_polyline";
} {
  if (!route || typeof route !== "object") {
    return { status: "malformed_route" };
  }

  const encodedPolyline =
    (route as {
      polyline?: { encodedPolyline?: unknown };
    }).polyline?.encodedPolyline;

  if (
    typeof encodedPolyline !== "string" ||
    encodedPolyline.length === 0
  ) {
    return { status: "missing_polyline" };
  }

  return {
    status: "valid",
    encodedPolyline,
  };
}

/**
 * Adapts already-received Google Routes-shaped route data into the existing
 * B10 normalization contract. It performs no I/O or operational decisions.
 */
export function buildRouteRiskShadowProviderRouteCandidateAdapter({
  providerResponse,
  scopeSource,
  predictionCreatedAt,
}: BuildRouteRiskShadowProviderRouteCandidateAdapterInput): RouteRiskShadowProviderRouteCandidateAdapter {
  if (!providerResponse || typeof providerResponse !== "object") {
    return unavailableAdapter("invalid_provider_response");
  }

  const routes = providerResponse.routes;

  if (!Array.isArray(routes) || routes.length === 0) {
    return unavailableAdapter("empty_provider_routes");
  }

  const candidates: RouteRiskShadowCandidateRouteNormalization[] = [];
  const unavailableReasons: RouteRiskShadowProviderRouteCandidateAdapterUnavailableReason[] = [];

  for (const route of routes) {
    const polyline = routePolyline(route);

    if (polyline.status !== "valid") {
      unavailableReasons.push(polyline.status);
      continue;
    }

    const routePoints = decodeGoogleEncodedPolyline(
      polyline.encodedPolyline
    );

    if (!routePoints) {
      unavailableReasons.push("malformed_polyline");
      continue;
    }

    const normalization =
      buildRouteRiskShadowCandidateRouteNormalization({
        routePoints,
        scopeSource,
        predictionCreatedAt,
      });

    if (
      normalization.normalizationState === "AVAILABLE"
    ) {
      candidates.push(normalization);
    } else {
      unavailableReasons.push(
        normalization.unavailableReason ===
          "insufficient_route_points"
          ? "insufficient_route_points"
          : "invalid_route_points"
      );
    }
  }

  const adapterState =
    candidates.length === 0
      ? "UNAVAILABLE"
      : unavailableReasons.length > 0
        ? "PARTIAL"
        : "AVAILABLE";

  return {
    adapterVersion:
      ROUTE_RISK_SHADOW_PROVIDER_ROUTE_CANDIDATE_ADAPTER_VERSION,
    semantics:
      "DESCRIPTIVE_SHADOW_PROVIDER_ROUTE_CANDIDATE_ADAPTER",
    authority: "NON_AUTHORITATIVE",
    adapterState,
    candidates,
    unavailableReasons,
  };
}
