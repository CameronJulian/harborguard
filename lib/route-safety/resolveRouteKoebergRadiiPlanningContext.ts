import {
  resolveKoebergRadiiPlanningContext,
} from "../environmental-context/koebergRadiiPlanningProvider.ts";

import type {
  KoebergRadiiPlanningContext,
  ResolveKoebergRadiiPlanningContextParams,
} from "../environmental-context/koebergRadiiPlanningTypes.ts";

export type KoebergRadiiPlanningRouteCoordinate = readonly [
  latitude: number,
  longitude: number,
];

export type KoebergRadiiPlanningContextResolver = (
  params: ResolveKoebergRadiiPlanningContextParams
) => Promise<KoebergRadiiPlanningContext | null>;

function isValidRouteCoordinate(
  point: readonly unknown[]
): point is KoebergRadiiPlanningRouteCoordinate {
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
 * Returns valid route coordinates in travel order.
 *
 * Consecutive duplicate coordinates are collapsed so repeated
 * provider requests are avoided without changing route order.
 */
export function selectRouteKoebergRadiiPlanningSamplePoints(
  routePoints: readonly (readonly unknown[])[]
): KoebergRadiiPlanningRouteCoordinate[] {
  const result:
    KoebergRadiiPlanningRouteCoordinate[] =
    [];

  for (const point of routePoints) {
    if (!isValidRouteCoordinate(point)) {
      continue;
    }

    const normalized:
      KoebergRadiiPlanningRouteCoordinate =
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
 * Resolves the smallest published Koeberg Radii Planning
 * distance band encountered anywhere along the HarborGuard
 * route geometry.
 *
 * Every valid route sample is evaluated because midpoint-only
 * sampling could miss a smaller planning-distance band entered
 * elsewhere on the route.
 *
 * Equal minimum planning distances preserve the first
 * occurrence in route travel order.
 *
 * Individual lookup failures fail open and do not prevent later
 * route samples from being evaluated.
 *
 * This represents published emergency-planning geography only.
 * It does not indicate an active incident, evacuation order,
 * radiological condition, or elevated route risk and must not
 * directly participate in HarborGuard risk scoring.
 */
export async function resolveRouteKoebergRadiiPlanningContext({
  routePoints,
  resolveContext =
    resolveKoebergRadiiPlanningContext,
}: {
  routePoints: readonly (readonly unknown[])[];
  resolveContext?: KoebergRadiiPlanningContextResolver;
}): Promise<KoebergRadiiPlanningContext | null> {
  const samplePoints =
    selectRouteKoebergRadiiPlanningSamplePoints(
      routePoints
    );

  if (samplePoints.length === 0) {
    return null;
  }

  let bestContext:
    KoebergRadiiPlanningContext | null =
    null;

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

      if (!context) {
        continue;
      }

      if (
        !Number.isFinite(
          context.planningDistanceKm
        ) ||
        context.planningDistanceKm <= 0
      ) {
        continue;
      }

      if (
        bestContext === null ||
        context.planningDistanceKm <
          bestContext.planningDistanceKm
      ) {
        bestContext =
          context;
      }
    } catch (error) {
      console.warn(
        "[Route Koeberg radii planning context] Sample lookup unavailable:",
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  }

  return bestContext;
}
