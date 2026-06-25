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

    const routeThreats = (alerts || [])
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

        const score = Math.min(
          100,
          severityWeight(alert.severity) + typeWeight(alert.type)
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
          recommendation: recommendationFor(alert.type, alert.severity),
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





