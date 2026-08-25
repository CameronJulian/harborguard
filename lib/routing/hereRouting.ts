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

  const url =
    "https://router.hereapi.com/v8/routes" +
    `?transportMode=car` +
    `&origin=${Number(origin.lat)},${Number(origin.lng)}` +
    `&destination=${Number(destination.lat)},${Number(destination.lng)}` +
    `&return=summary,polyline,actions,instructions` +
    `&alternatives=3` +
    `&departureTime=any` +
    `&apikey=${process.env.HERE_API_KEY}`;

  const cacheKey =
    buildHereRoutingProviderCacheKey(
      origin,
      destination
    );

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
    const sections = route.sections || [];

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
