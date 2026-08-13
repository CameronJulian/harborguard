import {
  resolveDrainageCatchmentContext,
} from "../environmental-context/drainageCatchmentProvider.ts";

import type {
  DrainageCatchmentContext,
  ResolveDrainageCatchmentContextParams,
} from "../environmental-context/drainageCatchmentTypes.ts";

export type DrainageCatchmentRouteCoordinate = readonly [
  latitude: number,
  longitude: number,
];

export type DrainageCatchmentContextResolver = (
  params: ResolveDrainageCatchmentContextParams
) => Promise<DrainageCatchmentContext | null>;

function isValidRouteCoordinate(
  point: readonly unknown[]
): point is DrainageCatchmentRouteCoordinate {
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
 * Selects a representative route point for drainage-catchment
 * membership lookup.
 *
 * This intentionally mirrors the existing route-level
 * environmental-context sampling strategy.
 *
 * For an odd number of valid route points, the actual middle
 * point is used. For an even number, the two central points
 * are averaged.
 */
export function selectRouteDrainageCatchmentSamplePoint(
  routePoints: readonly (readonly unknown[])[]
): DrainageCatchmentRouteCoordinate | null {
  const validPoints = routePoints
    .filter(isValidRouteCoordinate)
    .map(
      (point): DrainageCatchmentRouteCoordinate => [
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
 * Resolves City of Cape Town drainage-catchment context for
 * the existing HarborGuard route geometry.
 *
 * Catchment membership is explanatory environmental context
 * only. It does not itself imply active flooding, drainage
 * failure, or elevated route risk and does not participate
 * directly in route-risk scoring.
 */
export async function resolveRouteDrainageCatchmentContext({
  routePoints,
  resolveContext =
    resolveDrainageCatchmentContext,
}: {
  routePoints: readonly (readonly unknown[])[];
  resolveContext?: DrainageCatchmentContextResolver;
}): Promise<DrainageCatchmentContext | null> {
  const samplePoint =
    selectRouteDrainageCatchmentSamplePoint(
      routePoints
    );

  if (!samplePoint) {
    return null;
  }

  try {
    return await resolveContext({
      latitude: samplePoint[0],
      longitude: samplePoint[1],
    });
  } catch (error) {
    console.warn(
      "[Route drainage catchment context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}
