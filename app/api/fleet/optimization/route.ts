import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function minutesSince(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(value).getTime()) / (1000 * 60);
}

function scoreVehicle(vehicle: any, location: any, alerts: any[], traffic: any) {
  let score = 100;

  const isOffline = minutesSince(location?.recorded_at) > 15;
  const speed = Number(location?.speed_kmh || 0);
  const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;
  const highAlerts = alerts.filter((a) => a.severity === "high").length;

  if (isOffline) score -= 40;
  if (criticalAlerts > 0) score -= criticalAlerts * 25;
  if (highAlerts > 0) score -= highAlerts * 15;
  if (speed < 3 && !isOffline) score -= 5;

  score -= Math.min(20, Math.round(Number(traffic?.riskScore || 0) / 10));

  return Math.max(0, Math.min(100, score));
}

function recommendation(score: number) {
  if (score >= 85) return "Best dispatch candidate.";
  if (score >= 70) return "Good dispatch candidate.";
  if (score >= 50) return "Usable, but review alerts and traffic.";
  return "Avoid assigning unless no alternatives are available.";
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const [vehiclesResult, locationsResult, alertsResult, tripsResult] = await Promise.all([
      supabase.from("vehicles").select("id, nickname, registration_number").eq("organization_id", organizationId),
      supabase.from("vehicle_locations").select("vehicle_id, latitude, longitude, speed_kmh, recorded_at").eq("organization_id", organizationId).order("recorded_at", { ascending: false }).limit(1000),
      supabase.from("vehicle_alerts").select("id, vehicle_id, alert_type, severity, created_at").eq("organization_id", organizationId).eq("is_resolved", false),
      supabase.from("vehicle_trips").select("id, vehicle_id, status").eq("organization_id", organizationId),
    ]);

    if (vehiclesResult.error) throw vehiclesResult.error;
    if (locationsResult.error) throw locationsResult.error;
    if (alertsResult.error) throw alertsResult.error;
    if (tripsResult.error) throw tripsResult.error;

    let trafficSummary: any = null;
    let trafficWarning: string | null = null;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/traffic-intelligence`, {
        cache: "no-store",
        headers: { "x-harborguard-internal": "fleet-optimization" },
      });

      const result = await response.json();

      if (response.ok) {
        trafficSummary = result.summary;
      } else {
        trafficWarning = result.error || "Traffic intelligence unavailable.";
      }
    } catch (error: any) {
      trafficWarning = error.message || "Traffic intelligence unavailable.";
    }

    const latestLocationByVehicle = new Map<string, any>();

    for (const location of locationsResult.data || []) {
      if (!latestLocationByVehicle.has(location.vehicle_id)) {
        latestLocationByVehicle.set(location.vehicle_id, location);
      }
    }

    const alertsByVehicle = new Map<string, any[]>();

    for (const alert of alertsResult.data || []) {
      const current = alertsByVehicle.get(alert.vehicle_id) || [];
      current.push(alert);
      alertsByVehicle.set(alert.vehicle_id, current);
    }

    const activeTripVehicleIds = new Set(
      (tripsResult.data || [])
        .filter((trip: any) =>
          ["active", "in_progress", "en_route_to_port", "collecting", "en_route_to_fishery", "emergency"].includes(trip.status)
        )
        .map((trip: any) => trip.vehicle_id)
    );

    const candidates = (vehiclesResult.data || []).map((vehicle: any) => {
      const location = latestLocationByVehicle.get(vehicle.id);
      const alerts = alertsByVehicle.get(vehicle.id) || [];
      const score = scoreVehicle(vehicle, location, alerts, trafficSummary);
      const isBusy = activeTripVehicleIds.has(vehicle.id);

      return {
        vehicleId: vehicle.id,
        vehicleName: vehicle.registration_number || vehicle.nickname || "Unknown vehicle",
        score: isBusy ? Math.max(0, score - 15) : score,
        status: isBusy ? "busy" : minutesSince(location?.recorded_at) > 15 ? "offline" : "available",
        latitude: location?.latitude || null,
        longitude: location?.longitude || null,
        speedKmh: Number(location?.speed_kmh || 0),
        openAlerts: alerts.length,
        activeTrip: isBusy,
        recommendation: recommendation(isBusy ? Math.max(0, score - 15) : score),
      };
    }).sort((a: any, b: any) => b.score - a.score);

    return NextResponse.json({
      success: true,
      summary: {
        totalCandidates: candidates.length,
        available: candidates.filter((c: any) => c.status === "available").length,
        busy: candidates.filter((c: any) => c.status === "busy").length,
        offline: candidates.filter((c: any) => c.status === "offline").length,
        bestCandidate: candidates[0] || null,
      },
      trafficIntelligence: trafficSummary,
      trafficWarning,
      candidates,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to optimize fleet dispatch." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
