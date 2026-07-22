import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

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

function severityWeight(severity: string | null) {
  if (severity === "critical") return 45;
  if (severity === "high") return 30;
  if (severity === "medium") return 18;
  return 10;
}

function typeWeight(type: string | null) {
  if (type === "smash_grab_hotspot") return 35;
  if (type === "roadblock") return 30;
  if (type === "traffic_light_outage") return 18;
  if (type === "accident") return 20;
  if (type === "protest") return 28;
  return 12;
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

  if (type === "traffic_light_outage") {
    return "Traffic lights reported out. Approach intersection slowly and proceed with caution.";
  }

  if (type === "accident") {
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
            type: "accident",
            count: Number(segment.collision_count) || 0,
          },
          {
            type: "traffic_light_outage",
            count: Number(segment.traffic_signal_count) || 0,
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

        const corridorDistance = distanceFromRoute;
        const radius = Number(alert.radius_meters || 1000);
        const isLikelyOnRoute = corridorDistance <= radius + 500;

        const baseScore =
          severityWeight(alert.severity) + typeWeight(alert.type);

               const aggregatedRiskScore = Number(
          alert.aggregated_risk_score
        );

        const score = Number.isFinite(aggregatedRiskScore)
          ? Math.min(100, Math.max(0, aggregatedRiskScore))
          : Math.min(
              100,
              applyIntelligenceWeighting(
                baseScore,
                alert.confidence,
                alert.verification_count,
                alert.created_at
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
          isLikelyOnRoute,
          score,
          freshness: alert.freshness || null,
          confidence: alert.confidence ?? null,
          verificationCount: alert.verification_count ?? 0,
          createdAt: alert.created_at ?? null,
          source: alert.source ?? null,
          recommendation:
            alert.recommendation_override ||
            recommendationFor(alert.type, alert.severity),
          suggestedRoute: alert.suggested_route || null,
        };
      })
      .filter((alert: any) => alert.isLikelyOnRoute)
      .sort((a: any, b: any) => b.score - a.score);

    const riskScore = Math.min(
      100,
      routeThreats.reduce((total: number, alert: any) => total + alert.score, 0)
    );

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

    if (riskScore >= 80 && vehicleId && routeThreats.length > 0) {
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
            riskScore,
            riskLevel,
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
          risk_score: riskScore,
          risk_level: riskLevel,
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

    if (riskScore >= 80 && vehicleId && routeThreats.length > 0) {
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
                reason: `Automatic safer route assignment due to ${riskLevel} route risk (${riskScore}/100). Top threat: ${topThreat.title}.`,
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
      threats: routeThreats,
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
