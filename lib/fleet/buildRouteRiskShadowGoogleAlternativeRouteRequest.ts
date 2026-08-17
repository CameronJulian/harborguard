export const ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_REQUEST_VERSION =
  "harborguard-route-risk-shadow-google-alternative-route-request-v1" as const;

export const ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_FIELD_MASK =
  "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline" as const;

type CoordinateInput = {
  latitude: unknown;
  longitude: unknown;
};

export type BuildRouteRiskShadowGoogleAlternativeRouteRequestInput = {
  origin: CoordinateInput;
  destination: CoordinateInput;
};

export type RouteRiskShadowGoogleAlternativeRouteRequestUnavailableReason =
  | "invalid_origin_coordinates"
  | "invalid_destination_coordinates";

export type RouteRiskShadowGoogleAlternativeRouteRequest = {
  requestVersion:
    typeof ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_REQUEST_VERSION;
  semantics: "DESCRIPTIVE_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_REQUEST";
  authority: "NON_AUTHORITATIVE";
  requestState: "AVAILABLE" | "UNAVAILABLE";
  provider: "GOOGLE_ROUTES_V2";
  method: "POST";
  endpoint: "https://routes.googleapis.com/directions/v2:computeRoutes";
  fieldMask: typeof ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_FIELD_MASK;
  body: {
    origin: {
      location: { latLng: { latitude: number; longitude: number } };
    };
    destination: {
      location: { latLng: { latitude: number; longitude: number } };
    };
    travelMode: "DRIVE";
    routingPreference: "TRAFFIC_AWARE";
    computeAlternativeRoutes: true;
    units: "METRIC";
  } | null;
  unavailableReason:
    RouteRiskShadowGoogleAlternativeRouteRequestUnavailableReason | null;
};

function validCoordinate(value: CoordinateInput): value is {
  latitude: number;
  longitude: number;
} {
  return (
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    (value.latitude as number) >= -90 &&
    (value.latitude as number) <= 90 &&
    (value.longitude as number) >= -180 &&
    (value.longitude as number) <= 180
  );
}

function unavailable(
  reason: RouteRiskShadowGoogleAlternativeRouteRequestUnavailableReason
): RouteRiskShadowGoogleAlternativeRouteRequest {
  return {
    requestVersion:
      ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_REQUEST_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_REQUEST",
    authority: "NON_AUTHORITATIVE",
    requestState: "UNAVAILABLE",
    provider: "GOOGLE_ROUTES_V2",
    method: "POST",
    endpoint: "https://routes.googleapis.com/directions/v2:computeRoutes",
    fieldMask: ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_FIELD_MASK,
    body: null,
    unavailableReason: reason,
  };
}

/** Describes a future shadow Google Routes request without performing it. */
export function buildRouteRiskShadowGoogleAlternativeRouteRequest({
  origin,
  destination,
}: BuildRouteRiskShadowGoogleAlternativeRouteRequestInput): RouteRiskShadowGoogleAlternativeRouteRequest {
  if (!validCoordinate(origin)) {
    return unavailable("invalid_origin_coordinates");
  }

  if (!validCoordinate(destination)) {
    return unavailable("invalid_destination_coordinates");
  }

  return {
    requestVersion:
      ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_REQUEST_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_REQUEST",
    authority: "NON_AUTHORITATIVE",
    requestState: "AVAILABLE",
    provider: "GOOGLE_ROUTES_V2",
    method: "POST",
    endpoint: "https://routes.googleapis.com/directions/v2:computeRoutes",
    fieldMask: ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_FIELD_MASK,
    body: {
      origin: {
        location: {
          latLng: {
            latitude: origin.latitude,
            longitude: origin.longitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destination.latitude,
            longitude: destination.longitude,
          },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: true,
      units: "METRIC",
    },
    unavailableReason: null,
  };
}
