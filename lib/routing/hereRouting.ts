import {
  buildHereRoutingProviderCacheKey,
  cacheHereRoutingProviderResponse,
  getCachedHereRoutingProviderResponse,
} from "@/lib/routing/hereRoutingProviderCache";
import { decode } from "@here/flexpolyline";
import { calculateDistanceMeters } from "@/lib/utils/command-center";
import { historicalRoadRiskRecencyWeight } from "@/lib/routing/roadRiskRecency";

type RoutePoint = [number, number];

export type RoutingProfile = "safest" | "fastest" | "balanced";

function normalizeRoutingProfile(
  value: unknown
): RoutingProfile {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "fastest" ||
    normalized === "balanced"
  ) {
    return normalized;
  }

  return "safest";
}

function secondsToDuration(seconds: number) {
  return `${Math.max(0, Math.round(seconds))}s`;
}

function scoreRouteRisk(
  routePoints: RoutePoint[],
  roadRiskSegments: any[]
) {
  const matchedSegments = roadRiskSegments.filter((segment) => {
    const latitude = Number(segment?.latitude);
    const longitude = Number(segment?.longitude);
    const radiusMeters = Math.max(0, Number(segment?.radius_meters) || 0);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      radiusMeters <= 0
    ) {
      return false;
    }

    return routePoints.some(([routeLatitude, routeLongitude]) => {
      return (
        calculateDistanceMeters(
          routeLatitude,
          routeLongitude,
          latitude,
          longitude
        ) <= radiusMeters
      );
    });
  });

  const now = Date.now();

  const scoredSegments = matchedSegments.map((segment) => {
    const baseRisk = Math.max(0, Number(segment?.risk_score) || 0);

    const verificationCount = Math.max(
      0,
      Number(segment?.verification_count) || 0
    );

    const recencyWeight = historicalRoadRiskRecencyWeight(
      segment?.last_event_at,
      now
    );

    const verificationWeight = Math.min(
      1.25,
      1 + verificationCount * 0.02
    );

    return {
      ...segment,
      weightedRisk:
        baseRisk * recencyWeight * verificationWeight,
      verificationCount,
    };
  });

  const totalRiskScore = scoredSegments.reduce(
    (total, segment) => total + segment.weightedRisk,
    0
  );

  const highestRiskScore = scoredSegments.reduce(
    (highest, segment) =>
      Math.max(highest, segment.weightedRisk),
    0
  );

  const verificationCount = scoredSegments.reduce(
    (total, segment) =>
      total + segment.verificationCount,
    0
  );

  const normalizedRiskScore = Math.min(100, Math.round(totalRiskScore));
  const safetyScore = Math.max(0, 100 - normalizedRiskScore);

  return {
    matchedSegmentCount: matchedSegments.length,
    matchedSegmentIds: matchedSegments
      .map((segment) => segment?.id)
      .filter(Boolean),
    totalRiskScore,
    normalizedRiskScore,
    highestRiskScore,
    verificationCount,
    safetyScore,
  };
}

function rankRoutes(
  routes: any[],
  profile: RoutingProfile
) {
  const durations = routes
    .map((route) => Number(route?.durationSeconds || 0))
    .filter((duration) => duration > 0);

  const fastestDuration =
    durations.length > 0
      ? Math.min(...durations)
      : 0;

  return [...routes]
    .map((route) => {
      const safetyScore = Math.max(
        0,
        Math.min(100, Number(route?.safetyScore || 0))
      );

      const durationSeconds = Math.max(
        0,
        Number(route?.durationSeconds || 0)
      );

      const durationScore =
        fastestDuration > 0 && durationSeconds > 0
          ? Math.max(
              0,
              Math.min(
                100,
                Math.round(
                  (fastestDuration / durationSeconds) * 100
                )
              )
            )
          : 0;

      const profileScore =
        profile === "fastest"
          ? durationScore
          : profile === "balanced"
            ? Math.round(
                safetyScore * 0.7 +
                  durationScore * 0.3
              )
            : safetyScore;

      return {
        ...route,
        routingProfile: profile,
        durationScore,
        profileScore,
      };
    })
    .sort((firstRoute, secondRoute) => {
      if (profile === "fastest") {
        const durationDifference =
          Number(firstRoute?.durationSeconds || 0) -
          Number(secondRoute?.durationSeconds || 0);

        if (durationDifference !== 0) {
          return durationDifference;
        }

        const safetyDifference =
          Number(secondRoute?.safetyScore || 0) -
          Number(firstRoute?.safetyScore || 0);

        if (safetyDifference !== 0) {
          return safetyDifference;
        }
      } else if (profile === "balanced") {
        const profileDifference =
          Number(secondRoute?.profileScore || 0) -
          Number(firstRoute?.profileScore || 0);

        if (profileDifference !== 0) {
          return profileDifference;
        }

        const safetyDifference =
          Number(secondRoute?.safetyScore || 0) -
          Number(firstRoute?.safetyScore || 0);

        if (safetyDifference !== 0) {
          return safetyDifference;
        }
      } else {
        const safetyDifference =
          Number(secondRoute?.safetyScore || 0) -
          Number(firstRoute?.safetyScore || 0);

        if (safetyDifference !== 0) {
          return safetyDifference;
        }

        const durationDifference =
          Number(firstRoute?.durationSeconds || 0) -
          Number(secondRoute?.durationSeconds || 0);

        if (durationDifference !== 0) {
          return durationDifference;
        }
      }

      return (
        Number(firstRoute?.index || 0) -
        Number(secondRoute?.index || 0)
      );
    })
    .map((route, position) => ({
      ...route,
      rank: position + 1,
      isRecommended: position === 0,
    }));
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
    `&return=summary,polyline,actions,instructions` +
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

  const cacheKey =
    `${baseCacheKey}${sideOfStreetCacheSuffix}`;

  let data =
    await getCachedHereRoutingProviderResponse(
      cacheKey
    );

  if (!data) {
    const response = await fetch(
      url,
      {
        cache: "no-store",
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
