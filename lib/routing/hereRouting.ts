import { decode } from "@here/flexpolyline";
import { calculateDistanceMeters } from "@/lib/utils/command-center";

type RoutePoint = [number, number];

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

  const totalRiskScore = matchedSegments.reduce(
    (total, segment) => total + Math.max(0, Number(segment?.risk_score) || 0),
    0
  );

  const highestRiskScore = matchedSegments.reduce(
    (highest, segment) =>
      Math.max(highest, Math.max(0, Number(segment?.risk_score) || 0)),
    0
  );

  const verificationCount = matchedSegments.reduce(
    (total, segment) =>
      total + Math.max(0, Number(segment?.verification_count) || 0),
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

function recommendation(routes: any[]) {
  return routes.length > 1
    ? "HERE returned alternate route options. Compare safety exposure, travel time, traffic duration, and distance before rerouting."
    : "No alternate HERE route returned for this trip.";
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
  roadRiskSegments: any[] = []
) {
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

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.title || data?.error || "HERE Routing request failed."
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

  return {
    provider: "here_routing_v8",
    routes,
    recommendation: recommendation(routes),
  };
}
