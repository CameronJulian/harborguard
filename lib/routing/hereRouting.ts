import {
  reserveHereProviderRequest,
} from "@/lib/here/hereCostGuard";
import {
  buildHereRoutingProviderCacheKey,
  cacheHereRoutingProviderResponse,
  getCachedHereRoutingProviderResponse,
} from "@/lib/routing/hereRoutingProviderCache";
import { decode } from "@here/flexpolyline";
import { calculateDistanceMeters } from "@/lib/utils/command-center";
import {
  normalizeRoutingProfile,
  rankRoutes,
  scoreRouteRisk,
  type RoutePoint,
  type RoutingProfile,
} from "@/lib/routing/routeRiskRanking";
export type { RoutingProfile } from "@/lib/routing/routeRiskRanking";

const ROUTING_PROVIDER_TIMEOUT_MS = 15_000;
function secondsToDuration(
  seconds: number,
) {
  return `${Math.max(
    0,
    Math.round(seconds),
  )}s`;
}

function recommendation(routes: any[]) {
  const recommendedRoute = routes[0];

  if (!recommendedRoute) {
    return "No HERE route was returned for this trip.";
  }

  if (routes.length === 1) {
    return `The only available HERE route has a safety score of ${recommendedRoute.safetyScore} and matches ${recommendedRoute.matchedRiskSegmentCount} road risk segments.`;
  }

  return `Route ${recommendedRoute.index + 1} is recommended with a safety score of ${recommendedRoute.safetyScore}, ${recommendedRoute.matchedRiskSegmentCount} matched road risk segments, and an estimated duration of ${recommendedRoute.duration}.`;
}

function decodeHereSectionPolyline(encodedPolyline: unknown): RoutePoint[] {
  if (typeof encodedPolyline !== "string" || encodedPolyline.length === 0) {
    return [];
  }

  try {
    const decoded = decode(encodedPolyline);

    return decoded.polyline
      .map((coordinate) => {
        const latitude = Number(coordinate[0]);
        const longitude = Number(coordinate[1]);

        return [latitude, longitude] as RoutePoint;
      })
      .filter(
        ([latitude, longitude]) =>
          Number.isFinite(latitude) && Number.isFinite(longitude)
      );
  } catch (error) {
    console.error("Failed to decode HERE flexible polyline:", error);
    return [];
  }
}

function decodeHereRouteSections(sections: any[]): RoutePoint[] {
  const points: RoutePoint[] = [];

  for (const section of sections) {
    const sectionPoints = decodeHereSectionPolyline(section?.polyline);

    for (const point of sectionPoints) {
      const previousPoint = points[points.length - 1];

      if (
        previousPoint &&
        previousPoint[0] === point[0] &&
        previousPoint[1] === point[1]
      ) {
        continue;
      }

      points.push(point);
    }
  }

  return points;
}

type HereNavigationAction = {
  action?: string | null;
  direction?: string | null;
  severity?: string | null;
  instruction?: string | null;
  length?: number | string | null;
  duration?: number | string | null;
  offset?: number | string | null;
  exitSign?: unknown;
};

type HereLocalizedValue = {
  value?: string | null;
  language?: string | null;
};

type HereRoadMetadata = {
  name?: HereLocalizedValue[];
  number?: HereLocalizedValue[];
  toward?: HereLocalizedValue[];
};

type HereSignpostLabel = {
  routeNumber?: HereLocalizedValue;
  name?: HereLocalizedValue;
};

type HereSignpost = {
  labels?: HereSignpostLabel[];
};

type HereExitSign = {
  number?: HereLocalizedValue[];
};

type HereTurnByTurnAction = {
  action?: string | null;
  direction?: string | null;
  severity?: string | null;
  duration?: number | string | null;
  length?: number | string | null;
  offset?: number | string | null;
  turnAngle?: number | string | null;
  currentRoad?: HereRoadMetadata | null;
  nextRoad?: HereRoadMetadata | null;
  signpost?: HereSignpost | null;
  exitSign?: HereExitSign | null;
};
type HereNavigationInstruction = {
  instruction?: string | null;
  text?: string | null;
  action?: string | null;
  direction?: string | null;
  length?: number | string | null;
  duration?: number | string | null;
  offset?: number | string | null;
};

type HereSpeedLimitSpan = {
  offset?: number | string | null;
  length?: number | string | null;
  maxSpeed?: number | string | null;
};

type NormalizedSpeedLimitSegment = {
  startOffsetMeters: number;
  endOffsetMeters: number;
  speedLimitKph: number;
};
type HereRouteSection = {
  summary?: {
    length?: number | string | null;
    duration?: number | string | null;
    baseDuration?: number | string | null;
  };
  arrival?: {
    place?: {
      location?: unknown;
    };
  };
  polyline?: unknown;
  actions?: HereNavigationAction[];
  instructions?: HereNavigationInstruction[];
  turnByTurnActions?: HereTurnByTurnAction[];
  spans?: HereSpeedLimitSpan[];
};
export async function calculateHereRoutes(
  origin: any,
  destination: any,
  roadRiskSegments: any[] = [],
  routingProfile: RoutingProfile = "safest"
) {
  const profile = normalizeRoutingProfile(
    routingProfile
  );
  if (!process.env.HERE_API_KEY) {
    throw new Error("HERE_API_KEY is not configured.");
  }
  const destinationLatitude =
    Number(destination.lat);

  const destinationLongitude =
    Number(destination.lng);

  const hintLatitude =
    Number(destination?.sideOfStreetHint?.lat);

  const hintLongitude =
    Number(destination?.sideOfStreetHint?.lng);

  const hasSideOfStreetHint =
    Number.isFinite(hintLatitude) &&
    Number.isFinite(hintLongitude) &&
    hintLatitude >= -90 &&
    hintLatitude <= 90 &&
    hintLongitude >= -180 &&
    hintLongitude <= 180;

  const destinationWaypoint =
    hasSideOfStreetHint
      ? `${destinationLatitude},${destinationLongitude};sideOfStreetHint=${hintLatitude},${hintLongitude}`
      : `${destinationLatitude},${destinationLongitude}`;

  const url =
    "https://router.hereapi.com/v8/routes" +
    `?transportMode=car` +
    `&origin=${Number(origin.lat)},${Number(origin.lng)}` +
    `&destination=${destinationWaypoint}` +
    `&return=summary,polyline,actions,instructions,turnByTurnActions` +
    `&spans=length,maxSpeed` +
    `&alternatives=3` +
    `&departureTime=any` +
    `&apikey=${process.env.HERE_API_KEY}`;

  const baseCacheKey =
    buildHereRoutingProviderCacheKey(
      origin,
      destination
    );

  const sideOfStreetCacheSuffix =
    hasSideOfStreetHint
      ? `|sideOfStreetHint=${hintLatitude.toFixed(5)},${hintLongitude.toFixed(5)}`
      : "|sideOfStreetHint=none";

  const guidanceContractCacheSuffix =
    "|guidanceContract=v2";

  const cacheKey =
    `${baseCacheKey}${sideOfStreetCacheSuffix}${guidanceContractCacheSuffix}`;

  let data =
    await getCachedHereRoutingProviderResponse(
      cacheKey
    );

  if (!data) {
    const hereCostReservation =
      await reserveHereProviderRequest(
        "routing",
      );

    if (!hereCostReservation.allowed) {
      throw new Error(
        `HERE Routing blocked by cost guard: ${hereCostReservation.reason}.`,
      );
    }
    const response = await fetch(
      url,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(
          ROUTING_PROVIDER_TIMEOUT_MS,
        ),
      }
    );

    data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.title ||
          data?.error ||
          "HERE Routing request failed."
      );
    }

    await cacheHereRoutingProviderResponse(
      cacheKey,
      data
    );
  }

  const routes = (data.routes || []).map((route: any, index: number) => {
    const sections =
      (route.sections || []) as HereRouteSection[];

    const summary = sections.reduce(
      (total: any, section: any) => {
        total.distanceMeters += Number(section.summary?.length || 0);
        total.durationSeconds += Number(section.summary?.duration || 0);
        total.baseDurationSeconds += Number(
          section.summary?.baseDuration ||
            section.summary?.duration ||
            0
        );

        return total;
      },
      {
        distanceMeters: 0,
        durationSeconds: 0,
        baseDurationSeconds: 0,
      }
    );

    const sectionGeometry =
      sections.map((section) =>
        decodeHereSectionPolyline(section?.polyline)
      );

    let routeDistanceBeforeSection = 0;

    const sectionRouteOffsetsMeters =
      sectionGeometry.map((points) => {
        const routeStartMeters =
          routeDistanceBeforeSection;

        const pointOffsetsMeters: number[] = [];
        let sectionDistanceMeters = 0;

        if (points.length > 0) {
          pointOffsetsMeters.push(0);
        }

        for (
          let pointIndex = 1;
          pointIndex < points.length;
          pointIndex += 1
        ) {
          const previous = points[pointIndex - 1];
          const current = points[pointIndex];

          sectionDistanceMeters +=
            calculateDistanceMeters(
              previous[0],
              previous[1],
              current[0],
              current[1]
            );

          pointOffsetsMeters.push(
            sectionDistanceMeters
          );
        }

        routeDistanceBeforeSection +=
          sectionDistanceMeters;

        return {
          routeStartMeters,
          pointOffsetsMeters,
        };
      });

    const routeOffsetMetersFor = (
      sectionIndex: number,
      rawOffset: unknown
    ): number => {
      const geometry =
        sectionRouteOffsetsMeters[sectionIndex];

      if (!geometry) {
        return 0;
      }

      const rawIndex =
        Math.floor(Number(rawOffset) || 0);

      const pointOffsets =
        geometry.pointOffsetsMeters;

      if (pointOffsets.length === 0) {
        return geometry.routeStartMeters;
      }

      const boundedIndex =
        Math.max(
          0,
          Math.min(
            rawIndex,
            pointOffsets.length - 1
          )
        );

      return (
        geometry.routeStartMeters +
        pointOffsets[boundedIndex]
      );
    };

    const firstLocalizedValue = (
      values:
        | HereLocalizedValue[]
        | null
        | undefined
    ) => {
      if (!Array.isArray(values)) {
        return null;
      }

      for (const item of values) {
        const value =
          typeof item?.value === "string"
            ? item.value.trim()
            : "";

        if (value) {
          return value;
        }
      }

      return null;
    };

    const localizedValues = (
      values:
        | HereLocalizedValue[]
        | null
        | undefined
    ) => {
      if (!Array.isArray(values)) {
        return [];
      }

      return values
        .map((item) =>
          typeof item?.value === "string"
            ? item.value.trim()
            : ""
        )
        .filter(
          (value): value is string =>
            value.length > 0
        );
    };

    const normalizeRoadMetadata = (
      road:
        | HereRoadMetadata
        | null
        | undefined
    ) => ({
      name:
        firstLocalizedValue(
          road?.name
        ),
      number:
        firstLocalizedValue(
          road?.number
        ),
      toward:
        localizedValues(
          road?.toward
        ),
    });

    const normalizeSignpost = (
      signpost:
        | HereSignpost
        | null
        | undefined
    ) => {
      const labels =
        Array.isArray(signpost?.labels)
          ? signpost.labels
          : [];

      return labels
        .map((label) => ({
          routeNumber:
            typeof label?.routeNumber
              ?.value === "string"
              ? label.routeNumber.value.trim()
              : null,
          name:
            typeof label?.name?.value ===
            "string"
              ? label.name.value.trim()
              : null,
        }))
        .filter(
          (label) =>
            Boolean(
              label.routeNumber ||
              label.name
            )
        );
    };
    const navigationActions =
      sections.flatMap(
        (section, sectionIndex) =>
          Array.isArray(section?.actions)
            ? section.actions.map(
                (action, actionIndex) => ({
                  sectionIndex,
                  actionIndex,
                  action:
                    action?.action ?? null,
                  direction:
                    action?.direction ?? null,
                  severity:
                    action?.severity ?? null,
                  instruction:
                    action?.instruction ?? null,
                  length:
                    Number(action?.length || 0),
                  duration:
                    Number(action?.duration || 0),
                  offset:
                    Number(action?.offset || 0),
                  routeOffsetMeters:
                    routeOffsetMetersFor(
                      sectionIndex,
                      action?.offset
                    ),
                  exitSign:
                    action?.exitSign ?? null,
                })
              )
            : []
      );

    const navigationTurnByTurnActions =
      sections.flatMap(
        (section, sectionIndex) =>
          Array.isArray(
            section?.turnByTurnActions
          )
            ? section.turnByTurnActions.map(
                (
                  action,
                  actionIndex
                ) => ({
                  sectionIndex,
                  actionIndex,
                  action:
                    action?.action ?? null,
                  direction:
                    action?.direction ?? null,
                  severity:
                    action?.severity ?? null,
                  length:
                    Number(
                      action?.length || 0
                    ),
                  duration:
                    Number(
                      action?.duration || 0
                    ),
                  offset:
                    Number(
                      action?.offset || 0
                    ),
                  routeOffsetMeters:
                    routeOffsetMetersFor(
                      sectionIndex,
                      action?.offset
                    ),
                  turnAngle:
                    Number.isFinite(
                      Number(
                        action?.turnAngle
                      )
                    )
                      ? Number(
                          action?.turnAngle
                        )
                      : null,
                  currentRoad:
                    normalizeRoadMetadata(
                      action?.currentRoad
                    ),
                  nextRoad:
                    normalizeRoadMetadata(
                      action?.nextRoad
                    ),
                  signpost:
                    normalizeSignpost(
                      action?.signpost
                    ),
                  exitNumbers:
                    localizedValues(
                      action?.exitSign?.number
                    ),
                })
              )
            : []
      );
    const navigationInstructions =
      sections.flatMap(
        (section, sectionIndex) =>
          Array.isArray(section?.instructions)
            ? section.instructions.map(
                (
                  instruction,
                  instructionIndex
                ) => ({
                  sectionIndex,
                  instructionIndex,
                  text:
                    instruction?.instruction ??
                    instruction?.text ??
                    null,
                  action:
                    instruction?.action ??
                    null,
                  direction:
                    instruction?.direction ??
                    null,
                  length:
                    Number(
                      instruction?.length || 0
                    ),
                  duration:
                    Number(
                      instruction?.duration || 0
                    ),
                  offset:
                    Number(
                      instruction?.offset || 0
                    ),
                  routeOffsetMeters:
                    routeOffsetMetersFor(
                      sectionIndex,
                      instruction?.offset
                    ),
                })
              )
            : []
      );
    const speedLimitSegments: NormalizedSpeedLimitSegment[] =
      sections.flatMap(
        (section, sectionIndex) => {
          const spans =
            Array.isArray(section?.spans)
              ? section.spans
              : [];

          return spans.flatMap(
            (span, spanIndex) => {
              const rawMaxSpeed =
                Number(span?.maxSpeed);

              if (
                !Number.isFinite(rawMaxSpeed) ||
                rawMaxSpeed <= 0
              ) {
                return [];
              }

              const startOffsetMeters =
                routeOffsetMetersFor(
                  sectionIndex,
                  span?.offset
                );

              const nextSpan =
                spans[spanIndex + 1];

              const nextOffsetMeters =
                nextSpan
                  ? routeOffsetMetersFor(
                      sectionIndex,
                      nextSpan?.offset
                    )
                  : null;

              const rawLength =
                Number(span?.length);

              const fallbackEndOffsetMeters =
                startOffsetMeters +
                (
                  Number.isFinite(rawLength) &&
                  rawLength > 0
                    ? rawLength
                    : 0
                );

              const endOffsetMeters =
                nextOffsetMeters != null &&
                nextOffsetMeters > startOffsetMeters
                  ? nextOffsetMeters
                  : fallbackEndOffsetMeters;

              const speedLimitKph =
                rawMaxSpeed * 3.6;

              if (
                !Number.isFinite(speedLimitKph) ||
                speedLimitKph <= 0 ||
                endOffsetMeters <= startOffsetMeters
              ) {
                return [];
              }

              return [
                {
                  startOffsetMeters,
                  endOffsetMeters,
                  speedLimitKph:
                    Math.round(speedLimitKph),
                },
              ];
            }
          );
        }
      );
    const routePoints = decodeHereRouteSections(sections);
    const routeRisk = scoreRouteRisk(routePoints, roadRiskSegments);

    return {
      index,
      label:
        index === 0
          ? "Current best HERE route"
          : `HERE alternative route ${index}`,
      provider: "here_routing_v8",
      distanceMeters: summary.distanceMeters,
      duration: secondsToDuration(summary.durationSeconds),
      staticDuration: secondsToDuration(summary.baseDurationSeconds),
      durationSeconds: summary.durationSeconds,
      baseDurationSeconds: summary.baseDurationSeconds,
      trafficDelaySeconds: Math.max(
        0,
        summary.durationSeconds - summary.baseDurationSeconds
      ),
      description:
        sections[0]?.arrival?.place?.location
          ? "HERE Routing v8 traffic-aware route"
          : null,

      // Retained temporarily for backward compatibility.
      encodedPolyline: sections[0]?.polyline || null,

      // Complete HERE geometry across every route section.
      encodedPolylines: sections
        .map((section: any) => section?.polyline)
        .filter(
          (polyline: unknown): polyline is string =>
            typeof polyline === "string" && polyline.length > 0
        ),
      routePoints,
      routePointCount: routePoints.length,
      navigationActions,
      navigationTurnByTurnActions,
      navigationInstructions,
      speedLimitSegments,
      safetyScore: routeRisk.safetyScore,
      riskScore: routeRisk.normalizedRiskScore,
      totalRiskScore: routeRisk.totalRiskScore,
      highestRiskScore: routeRisk.highestRiskScore,
      matchedRiskSegmentCount: routeRisk.matchedSegmentCount,
      matchedRiskSegmentIds: routeRisk.matchedSegmentIds,
      riskVerificationCount: routeRisk.verificationCount,
      sections: sections.length,
    };
  });

  const rankedRoutes = rankRoutes(
    routes,
    profile
  );

  const recommendedRoute =
    rankedRoutes[0] ?? null;

  return {
    provider: "here_routing_v8",
    routingProfile: profile,
    routes: rankedRoutes,
    recommendedRoute,
    recommendation: recommendation(rankedRoutes),
  };
}
