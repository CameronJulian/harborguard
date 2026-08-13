import {
  resolvePoliceStationContext,
} from "../environmental-context/policeStationProvider.ts";

import type {
  PoliceStationContext,
  ResolvePoliceStationContextParams,
} from "../environmental-context/policeStationTypes.ts";

export type PoliceStationRouteCoordinate = readonly [
  latitude: number,
  longitude: number,
];

export type PoliceStationContextResolver = (
  params: ResolvePoliceStationContextParams
) => Promise<PoliceStationContext | null>;

const DEFAULT_ROUTE_POLICE_STATION_SEARCH_RADIUS_METERS =
  10_000;

function isValidRouteCoordinate(
  point: readonly unknown[]
): point is PoliceStationRouteCoordinate {
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
 * Police Station context lookup.
 *
 * This intentionally mirrors HarborGuard's established
 * route-level environmental-context sampling strategy.
 *
 * For an odd number of valid points, the actual middle point
 * is used. For an even number, the two central points are
 * averaged.
 */
export function selectRoutePoliceStationSamplePoint(
  routePoints: readonly (readonly unknown[])[]
): PoliceStationRouteCoordinate | null {
  const validPoints =
    routePoints
      .filter(isValidRouteCoordinate)
      .map(
        (point): PoliceStationRouteCoordinate => [
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
 * Resolves nearest City of Cape Town Police Station context
 * for the existing HarborGuard route geometry.
 *
 * Police Station proximity is explanatory operational context.
 * It does not itself represent crime likelihood, incident
 * severity, police availability, response time, or increased
 * route risk and does not participate directly in scoring.
 */
export async function resolveRoutePoliceStationContext({
  routePoints,
  resolveContext =
    resolvePoliceStationContext,
  searchRadiusMeters =
    DEFAULT_ROUTE_POLICE_STATION_SEARCH_RADIUS_METERS,
}: {
  routePoints: readonly (readonly unknown[])[];
  resolveContext?: PoliceStationContextResolver;
  searchRadiusMeters?: number;
}): Promise<PoliceStationContext | null> {
  const samplePoint =
    selectRoutePoliceStationSamplePoint(
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
      "[Route police station context] Lookup unavailable:",
      error instanceof Error
        ? error.message
        : String(error)
    );

    return null;
  }
}
