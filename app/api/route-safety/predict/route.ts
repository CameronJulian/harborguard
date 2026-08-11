import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { loadWeather } from "@/lib/weather/provider";
import {
  buildTrafficIntelligence,
  diagnosticBalancedTrafficRiskScore,
} from "@/lib/traffic/intelligence";
import type { WeatherProviderResult } from "@/lib/weather/types";
import { routeIncidentSeverityWeight, routeIncidentTypeWeight } from "@/lib/route-safety/incidentWeights";
import { historicalRoadRiskRecencyWeight } from "@/lib/routing/roadRiskRecency";

const TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG = {
  weights: {
    route: 0.4,
    typeSeverity: 0.35,
    provider: 0.25,
  },
  calibratedThresholds: {
    critical: 80,
    high: 70,
    medium: 55,
    low: 0,
  },
} as const;

const TRAFFIC_DIAGNOSTIC_COMPOSITE_WEIGHT_TOTAL =
  TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.weights.route +
  TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.weights.typeSeverity +
  TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.weights.provider;

if (
  Math.abs(
    TRAFFIC_DIAGNOSTIC_COMPOSITE_WEIGHT_TOTAL - 1
  ) > 0.000001
) {
  throw new Error(
    "Traffic diagnostic composite weights must total 1."
  );
}

function trafficCongestionMultiplierForRiskLevel(
  riskLevel: unknown
) {
  const normalizedRiskLevel =
    String(riskLevel ?? "LOW").toUpperCase();

  return normalizedRiskLevel === "CRITICAL"
    ? 1.5
    : normalizedRiskLevel === "HIGH"
      ? 1.25
      : normalizedRiskLevel === "MEDIUM"
        ? 1.1
        : 1;
}
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

function threatFamilyForType(type: unknown) {
  const normalizedType =
    String(type ?? "").toLowerCase();

  switch (normalizedType) {
    case "smash_grab_hotspot":
    case "protest":
      return "security";

    case "roadblock":
    case "road_closure":
    case "roadworks":
    case "congestion":
    case "lane_closure":
    case "vehicle_breakdown":
      return "access_disruption";

    case "collision":
    case "traffic_light_outage":
    case "road_hazard":
      return "road_safety";

    case "weather_hazard":
    case "flooding":
      return "weather_environment";

    default:
      return "other";
  }
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
    const { supabase, organizationId, user } = await requireOrganization();
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

    const routeCorridorTrafficDiagnosticsEnabled =
      process.env.ENABLE_ROUTE_CORRIDOR_TRAFFIC_DIAGNOSTICS === "true";

    let diagnosticRouteTrafficSampling: any = null;

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

    if (routeCorridorTrafficDiagnosticsEnabled) {
      const sampleFractions = [0, 0.25, 0.5, 0.75, 1];

      const samplePoints = sampleFractions.map((fraction) => {
        const index = Math.min(
          routePoints.length - 1,
          Math.max(
            0,
            Math.round(
              fraction * (routePoints.length - 1)
            )
          )
        );

        const [latitude, longitude] = routePoints[index];

        return {
          fraction,
          index,
          latitude,
          longitude,
        };
      });

      const sampleResults = await Promise.all(
        samplePoints.map(async (sample) => {
          try {
            const result = await buildTrafficIntelligence(
              supabase,
              organizationId,
              {
                latitude: sample.latitude,
                longitude: sample.longitude,
                radiusMeters: 3000,
              }
            );

            return {
              ...sample,
              success: true,
              riskScore: Number(
                result.summary.riskScore || 0
              ),
              riskLevel:
                result.summary.riskLevel || "low",
              flowCorridors: Number(
                result.summary.flowCorridors || 0
              ),
              averageCongestion: Number(
                result.summary.averageCongestion || 0
              ),
              averageDelay: Number(
                result.summary.averageDelay || 0
              ),
              warnings:
                result.intelligence?.warnings || [],
              error: null,
            };
          } catch (error: unknown) {
            return {
              ...sample,
              success: false,
              riskScore: 0,
              riskLevel: "unknown",
              flowCorridors: 0,
              averageCongestion: 0,
              averageDelay: 0,
              warnings: [],
              error:
                error instanceof Error
                  ? error.message
                  : "Traffic sample failed.",
            };
          }
        })
      );

      const successfulSamples = sampleResults.filter(
        (sample) => sample.success
      );

      const averageValue = (values: number[]) =>
        values.length > 0
          ? Math.round(
              values.reduce(
                (total, value) => total + value,
                0
              ) / values.length
            )
          : 0;

      const percentileValue = (
        values: number[],
        percentile: number
      ) => {
        if (values.length === 0) {
          return 0;
        }

        const sortedValues = [...values].sort(
          (left, right) => left - right
        );

        const normalizedPercentile = Math.max(
          0,
          Math.min(1, percentile)
        );

        const index = Math.min(
          sortedValues.length - 1,
          Math.max(
            0,
            Math.ceil(
              normalizedPercentile *
                sortedValues.length
            ) - 1
          )
        );

        return Math.round(sortedValues[index]);
      };

      const successfulCongestionValues =
        successfulSamples.map(
          (sample) => sample.averageCongestion
        );

      const successfulDelayValues =
        successfulSamples.map(
          (sample) => sample.averageDelay
        );

      const routeP75Congestion = percentileValue(
        successfulCongestionValues,
        0.75
      );

      const routeP75DelayMinutes = percentileValue(
        successfulDelayValues,
        0.75
      );

      const routeAverageCongestion = averageValue(
        successfulCongestionValues
      );

      const routeMaximumCongestion = Math.max(
        0,
        ...successfulCongestionValues
      );

      const routeAverageDelayMinutes = averageValue(
        successfulDelayValues
      );

      const routeMaximumDelayMinutes = Math.max(
        0,
        ...successfulDelayValues
      );

      const midpointAverageCongestion = Number(
        trafficResult?.summary.averageCongestion || 0
      );

      const midpointAverageDelayMinutes = Number(
        trafficResult?.summary.averageDelay || 0
      );

      const congestionDifference =
        routeAverageCongestion -
        midpointAverageCongestion;

      const congestionReductionPercent =
        midpointAverageCongestion > 0
          ? Number(
              (
                (
                  midpointAverageCongestion -
                  routeAverageCongestion
                ) /
                midpointAverageCongestion *
                100
              ).toFixed(1)
            )
          : 0;

      const delayDifferenceMinutes =
        routeAverageDelayMinutes -
        midpointAverageDelayMinutes;

      const diagnosticRouteCandidateIncidentInput =
        Number(
          trafficResult?.summary
            .diagnosticTypeSeverityWeightedIncidentCount ||
            0
        );

      const diagnosticRouteCandidateCriticalInput =
        Number(
          trafficResult?.summary
            .diagnosticTypeSeverityWeightedCriticalCount ||
            0
        );

      const diagnosticRouteCandidateCongestionInput =
        routeP75Congestion;

      const diagnosticRouteCandidateTrafficRisk =
        diagnosticBalancedTrafficRiskScore(
          diagnosticRouteCandidateIncidentInput,
          diagnosticRouteCandidateCongestionInput,
          diagnosticRouteCandidateCriticalInput
        );

      const diagnosticRouteCandidateTrafficRiskLevel =
        diagnosticRouteCandidateTrafficRisk.score >= 85
          ? "critical"
          : diagnosticRouteCandidateTrafficRisk.score >= 65
            ? "high"
            : diagnosticRouteCandidateTrafficRisk.score >= 35
              ? "medium"
              : "low";

      const diagnosticCompositeRouteScore =
        diagnosticRouteCandidateTrafficRisk.score;

      const diagnosticCompositeTypeSeverityScore =
        Number(
          trafficResult?.summary
            .diagnosticTypeSeverityWeightedBalancedRiskScore ||
            0
        );

      const diagnosticCompositeProviderScore =
        Number(
          trafficResult?.summary
            .diagnosticProviderWeightedBalancedRiskScore ||
            0
        );

      const diagnosticCompositeCandidateScore =
        Math.min(
          100,
          Math.max(
            0,
            Math.round(
              diagnosticCompositeRouteScore *
                TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.weights.route +
                diagnosticCompositeTypeSeverityScore *
                  TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.weights.typeSeverity +
                diagnosticCompositeProviderScore *
                  TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.weights.provider
            )
          )
        );

      const diagnosticCompositeCandidateLevel =
        diagnosticCompositeCandidateScore >= 85
          ? "critical"
          : diagnosticCompositeCandidateScore >= 65
            ? "high"
            : diagnosticCompositeCandidateScore >= 35
              ? "medium"
              : "low";

      const diagnosticCompositeCalibratedLevel =
        diagnosticCompositeCandidateScore >=
          TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.calibratedThresholds.critical
          ? "critical"
          : diagnosticCompositeCandidateScore >=
            TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.calibratedThresholds.high
            ? "high"
            : diagnosticCompositeCandidateScore >=
              TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.calibratedThresholds.medium
              ? "medium"
              : "low";

      diagnosticRouteTrafficSampling = {
        enabled: true,
        radiusMeters: 3000,
        sampleCount: sampleResults.length,
        successfulSamples: successfulSamples.length,
        failedSamples:
          sampleResults.length - successfulSamples.length,
        maximumRiskScore: Math.max(
          0,
          ...successfulSamples.map(
            (sample) => sample.riskScore
          )
        ),
        averageRiskScore: averageValue(
          successfulSamples.map(
            (sample) => sample.riskScore
          )
        ),
        maximumCongestion: routeMaximumCongestion,
        averageCongestion: routeAverageCongestion,
        p75Congestion: routeP75Congestion,
        p75DelayMinutes: routeP75DelayMinutes,
        midpointAverageCongestion,
        routeAverageCongestion,
        routeMaximumCongestion,
        routeP75Congestion,
        congestionDifference,
        congestionReductionPercent,
        midpointAverageDelayMinutes,
        routeAverageDelayMinutes,
        routeMaximumDelayMinutes,
        routeP75DelayMinutes,
        delayDifferenceMinutes,
        diagnosticRouteCandidateTrafficRiskScore:
          diagnosticRouteCandidateTrafficRisk.score,
        diagnosticRouteCandidateTrafficRiskLevel,
        diagnosticRouteCandidateCongestionInput,
        diagnosticRouteCandidateIncidentInput:
          Number(
            diagnosticRouteCandidateIncidentInput.toFixed(2)
          ),
        diagnosticRouteCandidateCriticalInput:
          Number(
            diagnosticRouteCandidateCriticalInput.toFixed(2)
          ),
        diagnosticRouteCandidateCongestionContribution:
          diagnosticRouteCandidateTrafficRisk.congestionContribution,
        diagnosticRouteCandidateIncidentContribution:
          diagnosticRouteCandidateTrafficRisk.incidentContribution,
        diagnosticRouteCandidateCriticalContribution:
          diagnosticRouteCandidateTrafficRisk.criticalContribution,
        diagnosticCompositeCandidateScore,
        diagnosticCompositeCandidateLevel,
        diagnosticCompositeCalibratedLevel,
        diagnosticCompositeCalibratedThresholds:
          TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.calibratedThresholds,
        diagnosticCompositeRouteScore,
        diagnosticCompositeTypeSeverityScore,
        diagnosticCompositeProviderScore,
        diagnosticCompositeWeights:
          TRAFFIC_DIAGNOSTIC_COMPOSITE_CONFIG.weights,
        maximumDelayMinutes: routeMaximumDelayMinutes,
        averageDelayMinutes: routeAverageDelayMinutes,
        samples: sampleResults,
      };
    }

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

    const candidateRouteThreats = threatInputs
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
          routeIncidentSeverityWeight(alert.severity) + routeIncidentTypeWeight(alert.type);

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

        const historicalRecencyWeight =
          Number.isFinite(aggregatedRiskScore)
            ? historicalRoadRiskRecencyWeight(
                normalizedCreatedAt
              )
            : 1;

        const unweightedScore = Number.isFinite(aggregatedRiskScore)
          ? Math.min(
              100,
              Math.max(
                0,
                aggregatedRiskScore * historicalRecencyWeight
              )
            )
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
        const averageCongestion =
          Number(
            trafficResult?.summary.averageCongestion ??
              0
          );

        const trafficCongestionMultiplier =
          trafficCongestionMultiplierForRiskLevel(
            trafficResult?.summary.riskLevel ??
              "LOW"
          );

        const scoreBeforeTrafficWeighting =
          score;

        const scoreAfterTrafficWeighting =
          Math.min(
            100,
            Math.max(
              0,
              Math.round(
                scoreBeforeTrafficWeighting *
                  trafficCongestionMultiplier
              )
            )
          );

        return {
          id: alert.id,
          type: alert.type,
          title: alert.title,
          severity: alert.severity,
          latitude: Number(alert.latitude),
          longitude: Number(alert.longitude),
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
          historicalRecencyWeight,
          geometryScoreMultiplier,
          averageCongestion,
          trafficCongestionMultiplier,
          scoreBeforeTrafficWeighting,
          scoreAfterTrafficWeighting,
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
      .filter((alert: any) => alert.isLikelyOnRoute);

    const routeThreats = candidateRouteThreats
      .sort((a: any, b: any) => b.score - a.score)
      .reduce((consolidated: any[], threat: any) => {
        const duplicateThreat = consolidated.find((existing: any) => {
          if (String(existing.type || "") !== String(threat.type || "")) {
            return false;
          }

          const existingLatitude = Number(existing.latitude);
          const existingLongitude = Number(existing.longitude);
          const threatLatitude = Number(threat.latitude);
          const threatLongitude = Number(threat.longitude);

          if (
            !Number.isFinite(existingLatitude) ||
            !Number.isFinite(existingLongitude) ||
            !Number.isFinite(threatLatitude) ||
            !Number.isFinite(threatLongitude)
          ) {
            return false;
          }

          return (
            distanceMeters(
              existingLatitude,
              existingLongitude,
              threatLatitude,
              threatLongitude
            ) <= 250
          );
        });

        if (!duplicateThreat) {
          consolidated.push(threat);
        }

        return consolidated;
      }, []);

    const threatRiskScore = Math.min(
      100,
      routeThreats.reduce(
        (total: number, alert: any) => total + alert.score,
        0
      )
    );

    const candidateThreatCount =
      candidateRouteThreats.length;

    const consolidatedThreatCount =
      routeThreats.length;

    const duplicateThreatsRemoved =
      Math.max(
        0,
        candidateThreatCount -
          consolidatedThreatCount
      );

    const uncappedThreatRiskScore =
      routeThreats.reduce(
        (total: number, alert: any) =>
          total + alert.score,
        0
      );

    const saturationAmount =
      Math.max(
        0,
        uncappedThreatRiskScore -
          threatRiskScore
      );

    const isThreatScoreSaturated =
      uncappedThreatRiskScore >
      threatRiskScore;

    const threatFamilyBreakdown =
      routeThreats.reduce(
        (
          families: Record<
            string,
            { count: number; totalScore: number }
          >,
          threat: any
        ) => {
          const family =
            threatFamilyForType(threat.type);

          const existing =
            families[family] ?? {
              count: 0,
              totalScore: 0,
            };

          families[family] = {
            count: existing.count + 1,
            totalScore:
              existing.totalScore +
              Number(threat.score || 0),
          };

          return families;
        },
        {}
      );

    const threatFamilyCount =
      Object.keys(
        threatFamilyBreakdown
      ).length;

    const largestThreatFamilyEntry =
      Object.entries(
        threatFamilyBreakdown
      ).sort(
        ([, left], [, right]) =>
          right.totalScore -
          left.totalScore
      )[0] ?? null;

    const largestThreatFamily =
      largestThreatFamilyEntry?.[0] ?? null;

    const largestThreatFamilyCount =
      largestThreatFamilyEntry?.[1].count ?? 0;

    const largestThreatFamilyScore =
      largestThreatFamilyEntry?.[1].totalScore ??
      0;

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
      trafficCongestionMultiplierForRiskLevel(
        normalizedTrafficRiskLevel
      );

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


    const experimentalTrafficModel =
      diagnosticRouteTrafficSampling
        ? {
            model: "route-composite-v1",
            status: "diagnostic",
            productionApplied: false,
            score:
              diagnosticRouteTrafficSampling
                .diagnosticCompositeCandidateScore,
            level:
              diagnosticRouteTrafficSampling
                .diagnosticCompositeCalibratedLevel,
            currentDiagnosticLevel:
              diagnosticRouteTrafficSampling
                .diagnosticCompositeCandidateLevel,
            inputs: {
              routeScore:
                diagnosticRouteTrafficSampling
                  .diagnosticCompositeRouteScore,
              typeSeverityScore:
                diagnosticRouteTrafficSampling
                  .diagnosticCompositeTypeSeverityScore,
              providerScore:
                diagnosticRouteTrafficSampling
                  .diagnosticCompositeProviderScore,
            },
            weights:
              diagnosticRouteTrafficSampling
                .diagnosticCompositeWeights,
            thresholds:
              diagnosticRouteTrafficSampling
                .diagnosticCompositeCalibratedThresholds,
          }
        : null;

    if (experimentalTrafficModel) {
      try {
        const { error: evaluationError } = await supabase
          .from("traffic_model_evaluations")
          .insert({
            organization_id: organizationId,
            user_id: user.id,
            vehicle_id: vehicleId,
            trip_id: tripId,
            origin_latitude: originLat,
            origin_longitude: originLng,
            destination_latitude: destinationLat,
            destination_longitude: destinationLng,
            production_traffic_score: trafficRiskScore,
            production_traffic_level: trafficRiskLevel,
            production_traffic_contribution:
              trafficContribution,
            experimental_model:
              experimentalTrafficModel.model,
            experimental_score:
              experimentalTrafficModel.score,
            experimental_level:
              experimentalTrafficModel.level,
            production_applied:
              experimentalTrafficModel.productionApplied,
            route_component_score:
              experimentalTrafficModel.inputs.routeScore,
            type_severity_component_score:
              experimentalTrafficModel.inputs.typeSeverityScore,
            provider_component_score:
              experimentalTrafficModel.inputs.providerScore,
            weights:
              experimentalTrafficModel.weights,
            thresholds:
              experimentalTrafficModel.thresholds,
            metadata: {
              overallRiskScore: riskScore,
              overallRiskLevel: riskLevel,
              threatRiskScore,
              weatherRiskScore,
            },
          });

        if (evaluationError) {
          console.error(
            "Traffic model evaluation logging failed:",
            evaluationError
          );
        }
      } catch (evaluationLoggingError) {
        console.error(
          "Traffic model evaluation logging failed:",
          evaluationLoggingError
        );
      }
    }
    if (tripId) {
      try {
        let tripValidationQuery = supabase
          .from("vehicle_trips")
          .select("id")
          .eq("id", tripId)
          .eq("organization_id", organizationId);

        if (vehicleId) {
          tripValidationQuery = tripValidationQuery.eq(
            "vehicle_id",
            vehicleId
          );
        }

        const { data: validatedTrip, error: tripValidationError } =
          await tripValidationQuery.maybeSingle();

        if (tripValidationError) {
          console.error(
            "Route prediction snapshot trip validation failed:",
            tripValidationError
          );
        } else if (!validatedTrip) {
          console.error(
            "Route prediction snapshot skipped: trip does not belong to the current organization or vehicle."
          );
        } else {
          const { error: snapshotError } = await supabase
            .from("route_prediction_snapshots")
            .insert({
            organization_id: organizationId,
            user_id: user.id,
            vehicle_id: vehicleId,
            trip_id: tripId,
            origin_latitude: originLat,
            origin_longitude: originLng,
            destination_latitude: destinationLat,
            destination_longitude: destinationLng,
            overall_risk_score: riskScore,
            overall_risk_level: riskLevel,
            threat_risk_score: threatRiskScore,
            threat_risk_level: threatRiskLevel,
            weather_risk_score: weatherRiskScore,
            traffic_risk_score: trafficRiskScore,
            traffic_risk_level: trafficRiskLevel,
            metadata: {
              weatherContribution,
              trafficContribution,
              trafficCongestionMultiplier,
              diagnosticTrafficWeightedThreatRisk,
              threatCount: routeThreats.length,
            },
          });

          if (snapshotError) {
            console.error(
              "Route prediction snapshot logging failed:",
              snapshotError
            );
          }
        }
      } catch (snapshotLoggingError) {
        console.error(
          "Route prediction snapshot logging failed:",
          snapshotLoggingError
        );
      }
    }
    return NextResponse.json({
      routeEstimate,
      riskScore,
      riskLevel,
      threatRiskScore,
      candidateThreatCount,
      consolidatedThreatCount,
      duplicateThreatsRemoved,
      uncappedThreatRiskScore,
      saturationAmount,
      isThreatScoreSaturated,
      threatFamilyCount,
      threatFamilyBreakdown,
      largestThreatFamily,
      largestThreatFamilyCount,
      largestThreatFamilyScore,
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
      diagnosticRouteTrafficSampling,
      experimentalTrafficModel,
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
