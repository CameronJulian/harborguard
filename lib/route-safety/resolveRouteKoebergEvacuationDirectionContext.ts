import {
  resolveKoebergEvacuationDirectionContext,
} from "../environmental-context/koebergEvacuationDirectionProvider.ts";

import type {
  KoebergEvacuationDirectionContext,
  ResolveKoebergEvacuationDirectionContextParams,
} from "../environmental-context/koebergEvacuationDirectionTypes.ts";

export type KoebergEvacuationDirectionRouteCoordinate = readonly [
  latitude: number,
  longitude: number,
];

export type KoebergEvacuationDirectionContextResolver = (
  params: ResolveKoebergEvacuationDirectionContextParams
) => Promise<KoebergEvacuationDirectionContext | null>;

function isValidRouteCoordinate(
  point: readonly unknown[]
): point is KoebergEvacuationDirectionRouteCoordinate {
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
 * provider lookups are avoided without changing route order.
 */
export function selectRouteKoebergEvacuationDirectionSamplePoints(
  routePoints: readonly (readonly unknown[])[]
): KoebergEvacuationDirectionRouteCoordinate[] {
  const result:
    KoebergEvacuationDirectionRouteCoordinate[] =
    [];

  for (const point of routePoints) {
    if (!isValidRouteCoordinate(point)) {
      continue;
    }

    const normalized:
      KoebergEvacuationDirectionRouteCoordinate =
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
 * Resolves the published Koeberg evacuation-direction line
 * nearest to any valid point along the HarborGuard route.
 *
 * Each provider call already chooses the nearest North, South
 * or East evacuation-direction feature for one coordinate using
 * true local point-to-polyline distance.
 *
 * The route resolver therefore scans the complete route and
 * retains the context with the smallest distanceMeters.
 *
 * Equal route-level distance values preserve the first
 * occurrence in route travel order.
 *
 * Individual lookup failures fail open and do not prevent later
 * route samples from being evaluated.
 *
 * This is emergency-planning context only. It does not indicate
 * an active evacuation order, emergency, road closure,
 * radiological condition or elevated route risk and must not
 * directly participate in HarborGuard risk scoring.
 */
export async function resolveRouteKoebergEvacuationDirectionContext({
  routePoints,
  resolveContext =
    resolveKoebergEvacuationDirectionContext,
}: {
  routePoints: readonly (readonly unknown[])[];
  resolveContext?: KoebergEvacuationDirectionContextResolver;
}): Promise<KoebergEvacuationDirectionContext | null> {
  const samplePoints =
    selectRouteKoebergEvacuationDirectionSamplePoints(
      routePoints
    );

  if (samplePoints.length === 0) {
    return null;
  }

  let bestContext:
    KoebergEvacuationDirectionContext | null =
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
          context.distanceMeters
        ) ||
        context.distanceMeters < 0
      ) {
        continue;
      }

      if (
        bestContext === null ||
        context.distanceMeters <
          bestContext.distanceMeters
      ) {
        bestContext =
          context;
      }
    } catch (error) {
      console.warn(
        "[Route Koeberg evacuation direction context] Sample lookup unavailable:",
        error instanceof Error
          ? error.message
          : String(error)
      );
    }
  }

  return bestContext;
}
