import {
  getMinimumProviderGeometryDistanceMeters,
  type ProviderGeometryCoordinate,
} from "@/lib/geo/providerGeometryRouteDistance";

import type {
  LatestStoredTrafficFlowObservation,
} from "@/lib/traffic/loadRecentTrafficFlowObservations";

export const MAX_ROUTE_TRAFFIC_DISTANCE_METERS =
  1000;

export type CandidateRoutePoint =
  | [number, number]
  | {
      latitude?: unknown;
      longitude?: unknown;
    };

export type MatchedStoredTrafficObservation = {
  providerSegmentId: string;
  providerGeometry: unknown;
  road: string;

  congestion: number;
  jamFactor: number;
  delayMinutes: number;
  observedAt: string;

  currentSpeed: number;
  freeFlowSpeed: number;
  confidence: number;

  distanceFromRouteMeters: number;
};

function finiteCoordinate(
  value: unknown,
): number | null {
  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : null;
}

export function normalizeCandidateRoutePoints(
  routePoints: unknown,
): ProviderGeometryCoordinate[] {
  if (!Array.isArray(routePoints)) {
    return [];
  }

  return routePoints.flatMap(
    (
      point: CandidateRoutePoint,
    ): ProviderGeometryCoordinate[] => {
      /*
       * HERE routePoints:
       * [latitude, longitude]
       */
      if (Array.isArray(point)) {
        if (point.length < 2) {
          return [];
        }

        const latitude =
          finiteCoordinate(
            point[0],
          );

        const longitude =
          finiteCoordinate(
            point[1],
          );

        if (
          latitude === null ||
          longitude === null ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return [];
        }

        return [
          [
            latitude,
            longitude,
          ],
        ];
      }

      /*
       * TomTom routePoints:
       * {
       *   latitude,
       *   longitude
       * }
       */
      if (
        point &&
        typeof point === "object"
      ) {
        const latitude =
          finiteCoordinate(
            point.latitude,
          );

        const longitude =
          finiteCoordinate(
            point.longitude,
          );

        if (
          latitude === null ||
          longitude === null ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          return [];
        }

        return [
          [
            latitude,
            longitude,
          ],
        ];
      }

      return [];
    },
  );
}

export function matchStoredTrafficObservationsToRoute(
  routePoints: unknown,
  observations:
    LatestStoredTrafficFlowObservation[],
  maximumDistanceMeters =
    MAX_ROUTE_TRAFFIC_DISTANCE_METERS,
): MatchedStoredTrafficObservation[] {
  const normalizedRoutePoints =
    normalizeCandidateRoutePoints(
      routePoints,
    );

  const normalizedMaximumDistance =
    Number(
      maximumDistanceMeters,
    );

  if (
    normalizedRoutePoints.length === 0 ||
    !Number.isFinite(
      normalizedMaximumDistance,
    ) ||
    normalizedMaximumDistance < 0 ||
    !Array.isArray(observations)
  ) {
    return [];
  }

  return observations
    .flatMap(
      (
        observation,
      ): MatchedStoredTrafficObservation[] => {
        const distance =
          getMinimumProviderGeometryDistanceMeters(
            normalizedRoutePoints,
            observation.providerGeometry,
          );

        if (
          distance === null ||
          !Number.isFinite(distance) ||
          distance >
            normalizedMaximumDistance
        ) {
          return [];
        }

        return [
          {
            providerSegmentId:
              observation.providerSegmentId,

            providerGeometry:
              observation.providerGeometry,

            road:
              observation.road,

            congestion:
              observation.congestion,

            jamFactor:
              observation.jamFactor,

            delayMinutes:
              observation.delayMinutes,

            observedAt:
              observation.observedAt,

            currentSpeed:
              observation.currentSpeed,

            freeFlowSpeed:
              observation.freeFlowSpeed,

            confidence:
              observation.confidence,

            distanceFromRouteMeters:
              Math.round(distance),
          },
        ];
      },
    )
    .sort(
      (
        first,
        second,
      ) =>
        first.distanceFromRouteMeters -
        second.distanceFromRouteMeters,
    );
}
