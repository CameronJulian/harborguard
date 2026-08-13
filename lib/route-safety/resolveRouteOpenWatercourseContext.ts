import {
  resolveOpenWatercourseContext,
} from "../environmental-context/openWatercourseProvider.ts";

import type {
  OpenWatercourseContext,
  ResolveOpenWatercourseContextParams,
} from "../environmental-context/openWatercourseTypes.ts";

export type RouteCoordinate = readonly [
  latitude: number,
  longitude: number,
];

export type OpenWatercourseContextResolver = (
  params: ResolveOpenWatercourseContextParams
) => Promise<OpenWatercourseContext | null>;

function isValidRouteCoordinate(
  point: readonly unknown[]
): point is RouteCoordinate {
  if (point.length < 2) {
    return false;
  }

  const latitude = Number(point[0]);
  const longitude = Number(point[1]);

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
 * Selects a representative point from the route geometry for
 * environmental-context lookup.
 *
 * For an odd number of valid route points, the actual middle
 * route point is used.
 *
 * For an even number, the two central route points are averaged.
 * This means a route containing only origin and destination
 * naturally falls back to their geographic midpoint.
 */
export function selectRouteOpenWatercourseSamplePoint(
  routePoints: readonly (readonly unknown[])[]
): RouteCoordinate | null {
  const validPoints = routePoints
    .filter(isValidRouteCoordinate)
    .map(
      (point): RouteCoordinate => [
        Number(point[0]),
        Number(point[1]),
      ]
    );

  if (validPoints.length === 0) {
    return null;
  }

  const middleIndex =
    Math.floor(validPoints.length / 2);

  if (validPoints.length % 2 === 1) {
    return validPoints[middleIndex];
  }

  const beforeMiddle =
    validPoints[middleIndex - 1];

  const afterMiddle =
    validPoints[middleIndex];

  return [
    (
      beforeMiddle[0] +
      afterMiddle[0]
    ) / 2,
    (
      beforeMiddle[1] +
      afterMiddle[1]
    ) / 2,
  ];
}

/**
 * Resolves City open-watercourse proximity for the existing
 * HarborGuard route geometry.
 *
 * This is explanatory environmental context only.
 * It must not be interpreted as evidence of active flooding
 * and does not participate in route-risk scoring.
 */
export async function resolveRouteOpenWatercourseContext({
  routePoints,
  resolveContext =
    resolveOpenWatercourseContext,
  searchRadiusMeters = 100,
}: {
  routePoints: readonly (readonly unknown[])[];
  resolveContext?: OpenWatercourseContextResolver;
  searchRadiusMeters?: number;
}): Promise<OpenWatercourseContext | null> {
  const samplePoint =
    selectRouteOpenWatercourseSamplePoint(
      routePoints
    );

  if (!samplePoint) {
    return null;
  }

  try {
    return await resolveContext({
      latitude: samplePoint[0],
      longitude: samplePoint[1],
      searchRadiusMeters,
    });
  } catch (error) {
    console.warn(
      "[Route open watercourse context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}