import {
  resolveFireStationContext,
} from "../environmental-context/fireStationProvider.ts";

import type {
  FireStationContext,
  ResolveFireStationContextParams,
} from "../environmental-context/fireStationTypes.ts";

export type FireStationRouteCoordinate = readonly [
  latitude: number,
  longitude: number,
];

export type FireStationContextResolver = (
  params: ResolveFireStationContextParams
) => Promise<FireStationContext | null>;

const DEFAULT_ROUTE_FIRE_STATION_SEARCH_RADIUS_METERS =
  10_000;

function isValidRouteCoordinate(
  point: readonly unknown[]
): point is FireStationRouteCoordinate {
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
 * Selects a representative point from the route geometry for
 * Fire Station context lookup.
 *
 * This intentionally mirrors the existing HarborGuard
 * route-level environmental-context sampling strategy.
 *
 * For an odd number of valid points, the actual middle point
 * is used. For an even number, the two central points are
 * averaged.
 */
export function selectRouteFireStationSamplePoint(
  routePoints: readonly (readonly unknown[])[]
): FireStationRouteCoordinate | null {
  const validPoints =
    routePoints
      .filter(isValidRouteCoordinate)
      .map(
        (point): FireStationRouteCoordinate => [
          Number(point[0]),
          Number(point[1]),
        ]
      );

  if (validPoints.length === 0) {
    return null;
  }

  const middleIndex =
    Math.floor(
      validPoints.length / 2
    );

  if (
    validPoints.length % 2 === 1
  ) {
    return validPoints[
      middleIndex
    ];
  }

  const beforeMiddle =
    validPoints[
      middleIndex - 1
    ];

  const afterMiddle =
    validPoints[
      middleIndex
    ];

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
 * Resolves nearest City of Cape Town Fire Station context for
 * the existing HarborGuard route geometry.
 *
 * Fire Station proximity is explanatory operational context.
 * It does not represent incident severity, emergency response
 * time, station availability, or increased route risk and
 * does not participate directly in route-risk scoring.
 */
export async function resolveRouteFireStationContext({
  routePoints,
  resolveContext =
    resolveFireStationContext,
  searchRadiusMeters =
    DEFAULT_ROUTE_FIRE_STATION_SEARCH_RADIUS_METERS,
}: {
  routePoints: readonly (readonly unknown[])[];
  resolveContext?: FireStationContextResolver;
  searchRadiusMeters?: number;
}): Promise<FireStationContext | null> {
  const samplePoint =
    selectRouteFireStationSamplePoint(
      routePoints
    );

  if (!samplePoint) {
    return null;
  }

  try {
    return await resolveContext({
      latitude:
        samplePoint[0],

      longitude:
        samplePoint[1],

      searchRadiusMeters,
    });
  } catch (error) {
    console.warn(
      "[Route fire station context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}
