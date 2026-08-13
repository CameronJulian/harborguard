import {
  resolveKoebergProtectiveActionZoneContext,
} from "../environmental-context/koebergProtectiveActionZoneProvider.ts";

import type {
  KoebergProtectiveActionZoneContext,
  ResolveKoebergProtectiveActionZoneContextParams,
} from "../environmental-context/koebergProtectiveActionZoneTypes.ts";

export type KoebergProtectiveActionZoneRouteCoordinate = readonly [
  latitude: number,
  longitude: number,
];

export type KoebergProtectiveActionZoneContextResolver = (
  params: ResolveKoebergProtectiveActionZoneContextParams
) => Promise<KoebergProtectiveActionZoneContext | null>;

function isValidRouteCoordinate(
  point: readonly unknown[]
): point is KoebergProtectiveActionZoneRouteCoordinate {
  if (point.length < 2) {
    return false;
  }

  const latitude =
    Number(point[0]);

  const longitude =
    Number(point[1]);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/**
 * Returns valid route coordinates in route order.
 *
 * Consecutive duplicate coordinates are collapsed so provider
 * lookups are not repeated unnecessarily.
 *
 * Unlike HarborGuard's representative-midpoint environmental
 * resolvers, Protective Action Zone membership is evaluated
 * across the route because midpoint-only sampling could miss a
 * route that enters and later exits the published planning zone.
 */
export function selectRouteKoebergProtectiveActionZoneSamplePoints(
  routePoints: readonly (readonly unknown[])[]
): KoebergProtectiveActionZoneRouteCoordinate[] {
  const result:
    KoebergProtectiveActionZoneRouteCoordinate[] =
    [];

  for (const point of routePoints) {
    if (!isValidRouteCoordinate(point)) {
      continue;
    }

    const normalized:
      KoebergProtectiveActionZoneRouteCoordinate =
      [
        Number(point[0]),
        Number(point[1]),
      ];

    const previous =
      result[
        result.length - 1
      ];

    if (
      previous &&
      previous[0] === normalized[0] &&
      previous[1] === normalized[1]
    ) {
      continue;
    }

    result.push(
      normalized
    );
  }

  return result;
}

/**
 * Resolves published Koeberg Protective Action Zone context
 * anywhere along the existing HarborGuard route geometry.
 *
 * Route points are evaluated in travel order. The first
 * published PAZ membership encountered is returned.
 *
 * Individual lookup failures fail open and do not prevent later
 * route points from being evaluated.
 *
 * This is emergency-planning context only. It does not indicate
 * an active incident, evacuation order, radiological condition,
 * or elevated route risk and must not directly participate in
 * HarborGuard risk scoring.
 */
export async function resolveRouteKoebergProtectiveActionZoneContext({
  routePoints,
  resolveContext =
    resolveKoebergProtectiveActionZoneContext,
}: {
  routePoints: readonly (readonly unknown[])[];
  resolveContext?: KoebergProtectiveActionZoneContextResolver;
}): Promise<KoebergProtectiveActionZoneContext | null> {
  const samplePoints =
    selectRouteKoebergProtectiveActionZoneSamplePoints(
      routePoints
    );

  if (samplePoints.length === 0) {
    return null;
  }

  for (const [
    latitude,
    longitude,
  ] of samplePoints) {
    try {
      const context =
        await resolveContext({
          latitude,
          longitude,
        });

      if (context) {
        return context;
      }
    } catch (error) {
      console.warn(
        "[Route Koeberg PAZ context] Sample lookup unavailable:",
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  }

  return null;
}
