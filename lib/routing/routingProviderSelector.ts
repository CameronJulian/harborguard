import "server-only";

import { calculateHereRoutes } from "@/lib/routing/hereRouting";
import { calculateTomTomRoutes } from "@/lib/routing/tomTomRouting";
import {
  normalizeRoutingProfile,
  type RoadRiskSegment,
  type RoutingProfile,
} from "@/lib/routing/routeRiskRanking";

export type RoutingProvider =
  | "here"
  | "tomtom";

export type RoutingProviderPoint = {
  lat: number;
  lng: number;
  sideOfStreetHint?: {
    lat?: number;
    lng?: number;
  } | null;
};

export type RoutingProviderRequest = {
  origin: RoutingProviderPoint;
  destination: RoutingProviderPoint;
  roadRiskSegments?: RoadRiskSegment[];
  routingProfile?: RoutingProfile | string | null;
};

export function normalizeRoutingProvider(
  value: unknown,
): RoutingProvider {
  const normalized =
    String(value ?? "")
      .trim()
      .toLowerCase();

  if (normalized === "tomtom") {
    return "tomtom";
  }

  return "here";
}

export async function calculateRoutesWithProvider(
  request: RoutingProviderRequest,
  provider: RoutingProvider = "here",
) {
  const selectedProvider =
    normalizeRoutingProvider(provider);

  const routingProfile =
    normalizeRoutingProfile(
      request.routingProfile,
    );

  const roadRiskSegments =
    Array.isArray(
      request.roadRiskSegments,
    )
      ? request.roadRiskSegments
      : [];

  if (selectedProvider === "tomtom") {
    return calculateTomTomRoutes({
      origin:
        request.origin,

      destination:
        request.destination,

      routingProfile,

      roadRiskSegments,
    });
  }

  return calculateHereRoutes(
    request.origin,
    request.destination,
    roadRiskSegments,
    routingProfile,
  );
}
