import {
  resolveMainDrainageContext,
} from "../environmental-context/mainDrainageProvider.ts";

import type {
  MainDrainageContext,
  ResolveMainDrainageContextParams,
} from "../environmental-context/mainDrainageTypes.ts";

export type MainDrainageRouteCoordinate = readonly [
  latitude: number,
  longitude: number,
];

export type MainDrainageContextResolver = (
  params: ResolveMainDrainageContextParams
) => Promise<MainDrainageContext | null>;

function isValidRouteCoordinate(
  point: readonly unknown[]
): point is MainDrainageRouteCoordinate {
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
 * Selects a representative route point for main-drainage
 * infrastructure lookup.
 *
 * This intentionally mirrors the existing route-level
 * open-watercourse sampling strategy.
 *
 * For an odd number of valid route points, the actual middle
 * point is used. For an even number, the two central points
 * are averaged.
 */
export function selectRouteMainDrainageSamplePoint(
  routePoints: readonly (readonly unknown[])[]
): MainDrainageRouteCoordinate | null {
  const validPoints = routePoints
    .filter(isValidRouteCoordinate)
    .map(
      (point): MainDrainageRouteCoordinate => [
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
 * Resolves City of Cape Town main-drainage infrastructure
 * context for the existing HarborGuard route geometry.
 *
 * This is explanatory infrastructure context only.
 * Proximity to a drain does not imply active flooding,
 * drainage failure, or increased route risk and therefore
 * does not participate directly in route-risk scoring.
 */
export async function resolveRouteMainDrainageContext({
  routePoints,
  resolveContext =
    resolveMainDrainageContext,
  searchRadiusMeters = 100,
}: {
  routePoints: readonly (readonly unknown[])[];
  resolveContext?: MainDrainageContextResolver;
  searchRadiusMeters?: number;
}): Promise<MainDrainageContext | null> {
  const samplePoint =
    selectRouteMainDrainageSamplePoint(
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
      "[Route main drainage context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}
