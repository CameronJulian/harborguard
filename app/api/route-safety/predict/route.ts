import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { loadWeather } from "@/lib/weather/provider";
import { buildTrafficIntelligence } from "@/lib/traffic/intelligence";
import type { WeatherProviderResult } from "@/lib/weather/types";

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function extractProviderGeometryCoordinates(
  geometry: unknown
): [number, number][] {
  if (!geometry || typeof geometry !== "object") {
    return [];
  }

  const value = geometry as any;

  // TomTom GeoJSON LineString uses [longitude, latitude].
  if (
    value.type === "LineString" &&
    Array.isArray(value.coordinates)
  ) {
    return value.coordinates
      .filter(
        (coordinate: unknown) =>
          Array.isArray(coordinate) &&
          coordinate.length >= 2 &&
          Number.isFinite(Number(coordinate[0])) &&
          Number.isFinite(Number(coordinate[1]))
      )
      .map(
        (coordinate: any): [number, number] => [
          Number(coordinate[1]),
          Number(coordinate[0]),
        ]
      );
  }

  // HERE geometry may be { links: [...] } or { shape: { links: [...] } }.
  const hereLinks = Array.isArray(value.links)
    ? value.links
    : Array.isArray(value.shape?.links)
      ? value.shape.links
      : null;

  if (!hereLinks) {
    return [];
  }

  return hereLinks.flatMap((link: any) =>
    Array.isArray(link?.points)
      ? link.points
          .filter(
            (point: any) =>
              Number.isFinite(Number(point?.lat)) &&
              Number.isFinite(Number(point?.lng))
          )
          .map(
            (point: any): [number, number] => [
              Number(point.lat),
              Number(point.lng),
            ]
          )
      : []
  );
}

function getMinimumProviderGeometryDistanceMeters(
  routePoints: [number, number][],
  geometry: unknown
): number | null {
  const geometryPoints =
    extractProviderGeometryCoordinates(geometry);

  if (
    routePoints.length === 0 ||
    geometryPoints.length === 0
  ) {
    return null;
  }

  let minimumDistance = Number.POSITIVE_INFINITY;

  for (const [routeLatitude, routeLongitude] of routePoints) {
    for (const [geometryLatitude, geometryLongitude] of geometryPoints) {
      const distance = distanceMeters(
        routeLatitude,
        routeLongitude,
        geometryLatitude,
        geometryLongitude
      );

      if (distance < minimumDistance) {
        minimumDistance = distance;
      }
    }
  }

  return Number.isFinite(minimumDistance)
    ? minimumDistance
    : null;
}

function providerGeometryScoreMultiplier(
  distanceMetersValue: number | null
) {
  if (distanceMetersValue === null) {
    return 1;
  }

  if (distanceMetersValue <= 50) {
    return 1;
  }

  if (distanceMetersValue <= 150) {
    return 0.9;
  }

  if (distanceMetersValue <= 300) {
    return 0.75;
  }

  if (distanceMetersValue <= 500) {
    return 0.6;
  }

  if (distanceMetersValue <= 1000) {
    return 0.4;
  }

  return 0.25;
}

function severityWeight(severity: string | null) {
  if (severity === "critical") return 45;
  if (severity === "high") return 30;
  if (severity === "medium") return 18;
  return 10;
}

function typeWeight(type: string | null) {
  switch (type) {
    case "smash_grab_hotspot":
      return 35;
    case "roadblock":
      return 30;
    case "road_closure":
      return 32;
    case "roadworks":
      return 16;
    case "congestion":
      return 12;
    case "lane_closure":
      return 14;
    case "collision":
      return 20;
    case "traffic_light_outage":
      return 18;
    case "weather_hazard":
      return 18;
    case "flooding":
      return 28;
    case "vehicle_breakdown":
      return 10;
    case "road_hazard":
      return 15;
    case "protest":
      return 28;
    default:
      return 12;
  }
}

type IntelligenceFreshness =
  | "fresh"
  | "needs_verification"
  | "stale";

function classifyIntelligenceFreshness(
  createdAt: unknown,
  verificationCount: unknown
): IntelligenceFreshness {
  if (!createdAt) {
    return "needs_verification";
  }

  const createdTime = new Date(String(createdAt)).getTime();

  if (Number.isNaN(createdTime)) {
    return "needs_verification";
  }

  const ageHours = Math.max(
    0,
    (Date.now() - createdTime) / (1000 * 60 * 60)
  );

  const normalizedVerificationCount = Math.max(
    0,
    Number(verificationCount) || 0
  );

  if (ageHours <= 24) {
    return "fresh";
  }

  if (ageHours <= 24 * 7 && normalizedVerificationCount >= 2) {
    return "fresh";
  }

  if (ageHours <= 24 * 30) {
    return "needs_verification";
  }

  return "stale";
}

function applyIntelligenceWeighting(
  baseScore: number,
  confidence: unknown,
  verificationCount: unknown,
  createdAt: unknown
) {
  const hasConfidence =
    confidence !== null &&
    confidence !== undefined &&
    confidence !== "";

  const hasVerificationCount =
    verificationCount !== null &&
    verificationCount !== undefined &&
    verificationCount !== "";

  if (!hasConfidence && !hasVerificationCount && !createdAt) {
    return baseScore;
  }

  const normalizedConfidence =
    Math.min(100, Math.max(0, Number(confidence) || 0)) / 100;

  const normalizedVerificationCount =
    Math.min(10, Math.max(0, Number(verificationCount) || 0)) / 10;

  const confidenceBonus = normalizedConfidence * 0.2;
  const verificationBonus = normalizedVerificationCount * 0.15;

  const weightedScore =
    baseScore * (1 + confidenceBonus + verificationBonus);

  return Math.round(
    weightedScore * recencyMultiplier(createdAt)
  );
}

function recencyMultiplier(createdAt: unknown) {
  if (!createdAt) {
    return 1;
  }

  const createdTime = new Date(String(createdAt)).getTime();

  if (Number.isNaN(createdTime)) {
    return 1;
  }

  const ageHours = (Date.now() - createdTime) / (1000 * 60 * 60);

  if (ageHours <= 24) {
    return 1;
  }

  if (ageHours <= 24 * 7) {
    return 0.9;
  }

  if (ageHours <= 24 * 30) {
    return 0.75;
  }

  return 0.6;
}

function decodePolyline(encoded: string) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const points: [number, number][] = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
}

function recommendationFor(type: string | null, severity: string | null) {
  if (type === "smash_grab_hotspot") {
    return "Known high-risk area ahead. Keep valuables out of sight, remain alert, and avoid unnecessary stops where safe and legal.";
  }

  if (type === "roadblock") {
    return "Roadblock reported ahead. Prepare for delay and consider alternate route.";
  }

  if (type === "road_closure") {
    return "Road closure reported ahead. Select an alternate route where possible.";
  }

  if (type === "roadworks") {
    return "Roadworks ahead. Expect lane restrictions and slower traffic.";
  }

  if (type === "congestion") {
    return "Heavy congestion ahead. Allow additional travel time or consider an alternate route.";
  }

  if (type === "lane_closure") {
    return "Lane closure ahead. Merge safely and expect slower traffic.";
  }

  if (type === "weather_hazard") {
    return "Weather hazard reported ahead. Reduce speed and increase following distance.";
  }

  if (type === "flooding") {
    return "Flooding reported ahead. Avoid driving through standing water and reroute if possible.";
  }

  if (type === "vehicle_breakdown") {
    return "Broken-down vehicle ahead. Slow down and move over safely where permitted.";
  }

  if (type === "road_hazard") {
    return "Road hazard reported ahead. Proceed with caution and be prepared for unexpected obstacles.";
  }

  if (type === "traffic_light_outage") {
    return "Traffic lights reported out. Approach intersection slowly and proceed with caution.";
  }

  if (type === "collision") {
    return "Accident reported ahead. Expect congestion and reduce speed.";
  }

  if (type === "protest") {
    return "Protest activity reported ahead. Avoid area where possible and monitor route.";
  }

  if (severity === "critical") {
    return "Critical route threat ahead. Contact driver and prepare escalation.";
  }

  return "Route safety threat ahead. Continue monitoring and advise driver to proceed with caution.";
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const body = await req.json();

    const origin = body.origin;
    const destination = body.destination;
      const vehicleId = body.vehicleId || null;
      const tripId = body.tripId || null;

    if (
      !origin?.lat ||
      !origin?.lng ||
      !destination?.lat ||
      !destination?.lng
    ) {
      return NextResponse.json(
        { error: "origin.lat, origin.lng, destination.lat and destination.lng are required." },
        { status: 400 }
      );
    }

    const originLat = Number(origin.lat);
    const originLng = Number(origin.lng);
    const destinationLat = Number(destination.lat);
    const destinationLng = Number(destination.lng);

    let weatherResult: WeatherProviderResult | null = null;
    let weatherError: string | null = null;
    let trafficResult:
      | Awaited<ReturnType<typeof buildTrafficIntelligence>>
      | null = null;
    let trafficError: string | null = null;

    try {
      const weatherLatitude =
        (originLat + destinationLat) / 2;
      const weatherLongitude =
        (originLng + destinationLng) / 2;

      weatherResult = await loadWeather(
        weatherLatitude,
        weatherLongitude
      );
    } catch (error: unknown) {
      weatherError =
        error instanceof Error
          ? error.message
          : "Current weather could not be loaded.";

      console.error(
        "[route-safety predict] Weather lookup failed:",
        error
      );
    }

    try {
      const trafficLatitude =
        (originLat + destinationLat) / 2;
      const trafficLongitude =
        (originLng + destinationLng) / 2;

      trafficResult = await buildTrafficIntelligence(
        supabase,
        organizationId,
        {
          latitude: trafficLatitude,
          longitude: trafficLongitude,
          radiusMeters: 10000,
        }
      );
    } catch (trafficLookupError: unknown) {
      trafficError =
        trafficLookupError instanceof Error
          ? trafficLookupError.message
          : "Current traffic intelligence could not be loaded.";

      console.error(
        "[route-safety predict] Traffic intelligence lookup failed:",
        trafficLookupError
      );
    }

    const { data: alerts, error } = await supabase
      .from("route_safety_alerts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: intelligence, error: intelligenceError } = await supabase
      .from("route_intelligence")
      .select(`
        id,
        source,
        event_type,
        severity,
        confidence,
        latitude,
        longitude,
        metadata,
        verification_count,
        created_at
      `)
      .eq("organization_id", organizationId)
      .eq("verified", true)
      .not("latitude", "is", null)
      .not("longitude", "is", null);

    if (intelligenceError) {
      return NextResponse.json(
        { error: intelligenceError.message },
        { status: 500 }
      );
    }
	
	const { data: roadRiskSegments, error: roadRiskSegmentsError } =
  await supabase
    .from("road_risk_segments")
    .select(`
      id,
      latitude,
      longitude,
      radius_meters,
      risk_score,
            collision_count,
      crime_count,
      roadblock_count,
      traffic_signal_count,
      other_event_count,

      road_closure_count,
      roadworks_count,
      congestion_count,
      lane_closure_count,
      weather_hazard_count,
      flooding_count,
      vehicle_breakdown_count,
      road_hazard_count,
      protest_count,

      verification_count,
      last_event_at,
      metadata
    `)
    .eq("organization_id", organizationId);

if (roadRiskSegmentsError) {
  return NextResponse.json(
    { error: roadRiskSegmentsError.message },
    { status: 500 }
  );
}

    let routeEstimate: any = null;

    if (process.env.GOOGLE_ROUTES_API_KEY) {
      const googleResponse = await fetch(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": process.env.GOOGLE_ROUTES_API_KEY,
            "X-Goog-FieldMask":
              "routes.duration,routes.staticDuration,routes.distanceMeters,routes.polyline.encodedPolyline",
          },
          body: JSON.stringify({
            origin: {
              location: {
                latLng: {
                  latitude: originLat,
                  longitude: originLng,
                },
              },
            },
            destination: {
              location: {
                latLng: {
                  latitude: destinationLat,
                  longitude: destinationLng,
                },
              },
            },
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_AWARE",
            computeAlternativeRoutes: false,
            units: "METRIC",
          }),
        }
      );

      const googleData = await googleResponse.json();

      if (googleResponse.ok && googleData.routes?.[0]) {
        routeEstimate = {
          distanceMeters: googleData.routes[0].distanceMeters,
          duration: googleData.routes[0].duration,
          staticDuration: googleData.routes[0].staticDuration,
          encodedPolyline: googleData.routes[0].polyline?.encodedPolyline || null,
        };
      }
    }

    const decodedRoutePoints = routeEstimate?.encodedPolyline
      ? decodePolyline(routeEstimate.encodedPolyline)
      : [];

    const routePoints = [
      [originLat, originLng] as [number, number],
      ...decodedRoutePoints,
      [destinationLat, destinationLng] as [number, number],
    ];

    const intelligenceThreatInputs = (intelligence || []).map((item: any) => {
      const metadata =
        item.metadata && typeof item.metadata === "object"
          ? item.metadata
          : {};

      const fallbackTitle = String(
        item.event_type || "route intelligence"
      ).replace(/_/g, " ");

      return {
        id: item.id,
        type: item.event_type,
        title: metadata.description || fallbackTitle,
        severity: item.severity,
        source: item.source,
        confidence: item.confidence,
        verification_count: item.verification_count,
        created_at: item.created_at,
        freshness: classifyIntelligenceFreshness(
          item.created_at,
          item.verification_count
        ),
        latitude: item.latitude,
        longitude: item.longitude,
        radius_meters: 1000,
        suggested_route: null,
        recommendation_override:
          metadata.recommendedAction || null,
      };
    });
	
	    const roadRiskSegmentThreatInputs = (roadRiskSegments || []).map(
      (segment: any) => {
        const riskScore = Math.min(
          100,
          Math.max(0, Number(segment.risk_score) || 0)
        );

       const eventCounts = [
  {
    type: "smash_grab_hotspot",
    count: Number(segment.crime_count) || 0,
  },
  {
    type: "roadblock",
    count: Number(segment.roadblock_count) || 0,
  },
  {
    type: "road_closure",
    count: Number(segment.road_closure_count) || 0,
  },
  {
    type: "roadworks",
    count: Number(segment.roadworks_count) || 0,
  },
  {
    type: "congestion",
    count: Number(segment.congestion_count) || 0,
  },
  {
    type: "lane_closure",
    count: Number(segment.lane_closure_count) || 0,
  },
  {
    type: "collision",
    count: Number(segment.collision_count) || 0,
  },
  {
    type: "traffic_light_outage",
    count: Number(segment.traffic_signal_count) || 0,
  },
  {
    type: "weather_hazard",
    count: Number(segment.weather_hazard_count) || 0,
  },
  {
    type: "flooding",
    count: Number(segment.flooding_count) || 0,
  },
  {
    type: "vehicle_breakdown",
    count: Number(segment.vehicle_breakdown_count) || 0,
  },
  {
    type: "road_hazard",
    count: Number(segment.road_hazard_count) || 0,
  },
  {
    type: "protest",
    count: Number(segment.protest_count) || 0,
  },
  {
    type: "other",
    count: Number(segment.other_event_count) || 0,
  },
];

        const dominantEvent = eventCounts.sort(
          (a, b) => b.count - a.count
        )[0];

        const severity =
          riskScore >= 80
            ? "critical"
            : riskScore >= 60
              ? "high"
              : riskScore >= 35
                ? "medium"
                : "low";

        return {
          id: segment.id,
          type: dominantEvent?.type || "other",
          title: "Aggregated road-risk segment",
          severity,
          source: "road_risk_segments",
          confidence: null,
          verification_count: segment.verification_count,
          created_at: segment.last_event_at,
          freshness: classifyIntelligenceFreshness(
            segment.last_event_at,
            segment.verification_count
          ),
          latitude: segment.latitude,
          longitude: segment.longitude,
          radius_meters: segment.radius_meters || 150,
          suggested_route: null,
          recommendation_override: null,
          aggregated_risk_score: riskScore,
        };
      }
    );

       const historicalThreatInputs =
      roadRiskSegmentThreatInputs.length > 0
        ? roadRiskSegmentThreatInputs
        : intelligenceThreatInputs;

    const threatInputs = [
      ...(alerts || []),
      ...historicalThreatInputs,
    ];

    const routeThreats = threatInputs
      .map((alert: any) => {
        const distanceFromOrigin = distanceMeters(
          originLat,
          originLng,
          Number(alert.latitude),
          Number(alert.longitude)
        );

        const distanceFromDestination = distanceMeters(
          destinationLat,
          destinationLng,
          Number(alert.latitude),
          Number(alert.longitude)
        );

        const distanceFromRoute = Math.min(
          ...routePoints.map(([lat, lng]) =>
            distanceMeters(
              lat,
              lng,
              Number(alert.latitude),
              Number(alert.longitude)
            )
          )
        );

        const providerGeometryDistance =
          getMinimumProviderGeometryDistanceMeters(
            routePoints,
            alert.provider_geometry
          );

        const distanceFromProviderGeometry =
          providerGeometryDistance === null
            ? null
            : Math.round(providerGeometryDistance);

        // Prefer full provider corridor geometry when available.
        // Alerts without geometry retain point-distance behaviour.
        const corridorDistance =
          providerGeometryDistance ??
          distanceFromRoute;
        const radius = Number(alert.radius_meters || 1000);
        const isLikelyOnRoute = corridorDistance <= radius + 500;

        const baseScore =
          severityWeight(alert.severity) + typeWeight(alert.type);

        const normalizedConfidence =
          alert.confidence ??
          alert.provider_confidence ??
          null;

        const normalizedVerificationCount =
          alert.verification_count ??
          alert.provider_confirmation_count ??
          0;

        const diagnosticProviderLastSeenEntries =
          alert.provider_last_seen &&
          typeof alert.provider_last_seen === "object"
            ? Object.entries(alert.provider_last_seen)
            : [];

        const diagnosticProviderAgesHours =
          diagnosticProviderLastSeenEntries
            .map(([, value]) => {
              const timestamp = new Date(
                String(value)
              ).getTime();

              if (!Number.isFinite(timestamp)) {
                return null;
              }

              return Math.max(
                0,
                (Date.now() - timestamp) /
                  (60 * 60 * 1000)
              );
            })
            .filter(
              (value): value is number =>
                value !== null
            );

        const diagnosticProviderAgeHours =
          diagnosticProviderAgesHours.length > 0
            ? Math.max(...diagnosticProviderAgesHours)
            : null;

        const diagnosticProviderDecayMultiplier =
          diagnosticProviderAgeHours === null
            ? 1
            : diagnosticProviderAgeHours <= 24
              ? 1
              : diagnosticProviderAgeHours <= 48
                ? 0.9
                : diagnosticProviderAgeHours <= 72
                  ? 0.75
                  : diagnosticProviderAgeHours <= 120
                    ? 0.5
                    : 0.25;

        const diagnosticProviderConfidence =
          Math.min(
            100,
            Math.max(
              0,
              Math.round(
                normalizedConfidence *
                  diagnosticProviderDecayMultiplier
              )
            )
          );

        const normalizedCreatedAt =
          alert.last_provider_confirmation_at ??
          alert.created_at ??
          null;

        const normalizedFreshness =
          alert.freshness ||
          classifyIntelligenceFreshness(
            normalizedCreatedAt,
            normalizedVerificationCount
          );
        const aggregatedRiskScore = Number(
          alert.aggregated_risk_score
        );

        const unweightedScore = Number.isFinite(aggregatedRiskScore)
          ? Math.min(100, Math.max(0, aggregatedRiskScore))
          : Math.min(
              100,
              applyIntelligenceWeighting(
                baseScore,
                normalizedConfidence,
                normalizedVerificationCount,
                normalizedCreatedAt
              )
            );

        const geometryScoreMultiplier =
          providerGeometryScoreMultiplier(
            providerGeometryDistance
          );

        const score = Math.min(
          100,
          Math.max(
            0,
            Math.round(
              unweightedScore *
                geometryScoreMultiplier
            )
          )
        );

        return {
          id: alert.id,
          type: alert.type,
          title: alert.title,
          severity: alert.severity,
          radiusMeters: radius,
          distanceFromOrigin: Math.round(distanceFromOrigin),
          distanceFromDestination: Math.round(distanceFromDestination),
          distanceFromRoute: Math.round(distanceFromRoute),
          distanceFromProviderGeometry,
          effectiveRouteDistance: Math.round(
            corridorDistance
          ),
          isLikelyOnRoute,
          unweightedScore,
          geometryScoreMultiplier,
          score,
          freshness: normalizedFreshness,
          confidence: normalizedConfidence,
          diagnosticProviderAgeHours:
            diagnosticProviderAgeHours === null
              ? null
              : Math.round(
                  diagnosticProviderAgeHours * 100
                ) / 100,
          diagnosticProviderDecayMultiplier,
          diagnosticProviderConfidence,
          verificationCount: normalizedVerificationCount,
          createdAt: normalizedCreatedAt,
          source: alert.source ?? null,
          recommendation:
            alert.recommendation_override ||
            recommendationFor(alert.type, alert.severity),
          suggestedRoute: alert.suggested_route || null,
        };
      })
      .filter((alert: any) => alert.isLikelyOnRoute)
      .sort((a: any, b: any) => b.score - a.score);

    const threatRiskScore = Math.min(
      100,
      routeThreats.reduce(
        (total: number, alert: any) => total + alert.score,
        0
      )
    );

    const weatherRiskScore =
      weatherResult?.weather.riskScore ?? 0;

    const weatherContribution = Math.min(
      20,
      Math.round(weatherRiskScore * 0.2)
    );

    const trafficRiskScore =
      trafficResult?.summary.riskScore ?? 0;

    const trafficRiskLevel =
      trafficResult?.summary.riskLevel ?? "LOW";

    const normalizedTrafficRiskLevel =
      String(trafficRiskLevel).toUpperCase();

    const trafficCongestionMultiplier =
      normalizedTrafficRiskLevel === "CRITICAL"
        ? 1.5
        : normalizedTrafficRiskLevel === "HIGH"
          ? 1.25
          : normalizedTrafficRiskLevel === "MEDIUM"
            ? 1.1
            : 1;

    const diagnosticTrafficWeightedThreatRisk =
      Math.min(
        100,
        Math.max(
          0,
          Math.round(
            threatRiskScore *
              trafficCongestionMultiplier
          )
        )
      );

    const trafficContribution = Math.min(
      20,
      Math.round(trafficRiskScore * 0.2)
    );

    const riskScore = Math.min(
      100,
      threatRiskScore +
        weatherContribution +
        trafficContribution
    );

    const threatRiskLevel =
      threatRiskScore >= 80
        ? "CRITICAL"
        : threatRiskScore >= 60
        ? "HIGH"
        : threatRiskScore >= 35
        ? "MEDIUM"
        : "LOW";

    const riskLevel =
      riskScore >= 80
        ? "CRITICAL"
        : riskScore >= 60
        ? "HIGH"
        : riskScore >= 35
        ? "MEDIUM"
        : "LOW";

    let autoEscalated = false;
    let autoEscalationResult: any = null;
    let autoRouteAssigned = false;
    let autoRouteAssignmentResult: any = null;

    if (
      threatRiskScore >= 80 &&
      vehicleId &&
      routeThreats.length > 0
    ) {
      try {
        const topThreat = routeThreats[0];

        const response = await fetch(`${req.nextUrl.origin}/api/route-safety/escalate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.get("authorization") || "",
          },
          body: JSON.stringify({
            vehicleId,
            tripId,
            alertId: topThreat.id,
            riskScore: threatRiskScore,
            riskLevel: threatRiskLevel,
            message: `Automatic route safety escalation: ${topThreat.title}. ${topThreat.recommendation}`,
          }),
        });

        autoEscalationResult = await response.json().catch(() => null);
        autoEscalated = response.ok;

        await supabase.from("route_safety_escalation_logs").insert({
          organization_id: organizationId,
          vehicle_id: vehicleId,
          trip_id: tripId,
          route_alert_id: topThreat.id,
          risk_score: threatRiskScore,
          risk_level: threatRiskLevel,
          auto_escalated: autoEscalated,
          duplicate_detected:
            autoEscalationResult?.skipped === "duplicate_open_alert",
          push_sent: autoEscalated,
          response: autoEscalationResult,
        });
      } catch (autoEscalationError) {
        console.error("Automatic route safety escalation failed:", autoEscalationError);
      }
    }

    if (
      threatRiskScore >= 80 &&
      vehicleId &&
      routeThreats.length > 0
    ) {
      try {
        const topThreat = routeThreats[0];

        const rerouteResponse = await fetch(`${req.nextUrl.origin}/api/route-safety/reroute`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: req.headers.get("authorization") || "",
          },
          body: JSON.stringify({
            origin: {
              lat: originLat,
              lng: originLng,
            },
            destination: {
              lat: destinationLat,
              lng: destinationLng,
            },
          }),
        });

        const rerouteResult = await rerouteResponse.json().catch(() => null);
        const recommendedRoute = rerouteResult?.routes?.[0] || null;

        if (rerouteResponse.ok && recommendedRoute) {
          const { data: existingPendingAssignment } = await supabase
            .from("route_assignments")
            .select("id, created_at")
            .eq("organization_id", organizationId)
            .eq("vehicle_id", vehicleId)
            .eq("status", "pending")
            .limit(1)
            .maybeSingle();

          if (existingPendingAssignment) {
            autoRouteAssigned = false;
            autoRouteAssignmentResult = {
              skipped: "existing_pending_assignment",
              assignmentId: existingPendingAssignment.id,
              createdAt: existingPendingAssignment.created_at,
            };
          } else {
            const assignResponse = await fetch(`${req.nextUrl.origin}/api/fleet/assign-route`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: req.headers.get("authorization") || "",
              },
              body: JSON.stringify({
                vehicleId,
                route: recommendedRoute,
                reason: `Automatic safer route assignment due to ${threatRiskLevel} threat risk (${threatRiskScore}/100). Top threat: ${topThreat.title}.`,
              }),
            });

            autoRouteAssignmentResult = await assignResponse.json().catch(() => null);
            autoRouteAssigned = assignResponse.ok;
          }
        } else {
          autoRouteAssignmentResult = {
            error: "No recommended safer route returned.",
            rerouteResult,
          };
        }
      } catch (autoRouteAssignmentError: any) {
        autoRouteAssignmentResult = {
          error: autoRouteAssignmentError.message || "Automatic route assignment failed.",
        };
        console.error("Automatic route assignment failed:", autoRouteAssignmentError);
      }
    }

    return NextResponse.json({
      routeEstimate,
      riskScore,
      riskLevel,
      threatRiskScore,
      threatRiskLevel,
      weatherRiskScore,
      weatherContribution,
      trafficRiskScore,
      trafficRiskLevel,
      normalizedTrafficRiskLevel,
      trafficCongestionMultiplier,
      diagnosticTrafficWeightedThreatRisk,
      trafficContribution,
      traffic: trafficResult,
      trafficError,
      threats: routeThreats,
      weather: weatherResult
        ? {
            provider: weatherResult.provider,
            ...weatherResult.weather,
          }
        : null,
      weatherError,
      driverWarning:
        routeThreats.length > 0
          ? routeThreats[0].recommendation
          : "No route safety threats detected on this route.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
