import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

const OFFLINE_MINUTES = 15;
const CLUSTER_DISTANCE_METERS = 750;
const LONE_VEHICLE_DISTANCE_METERS = 2500;

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return 0;
}

function minutesSince(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  return (Date.now() - new Date(value).getTime()) / (1000 * 60);
}

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * r * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const [vehiclesResult, locationsResult, alertsResult, incidentsResult] =
      await Promise.all([
        supabase
          .from("vehicles")
          .select("id, nickname, registration_number")
          .eq("organization_id", organizationId),

        supabase
          .from("vehicle_locations")
          .select("vehicle_id, latitude, longitude, speed_kmh, recorded_at")
          .eq("organization_id", organizationId)
          .order("recorded_at", { ascending: false })
          .limit(1000),

        supabase
          .from("vehicle_alerts")
          .select("id, vehicle_id, severity, alert_type")
          .eq("organization_id", organizationId)
          .eq("is_resolved", false),

        supabase
          .from("road_incidents")
          .select("id, latitude, longitude, severity, type, radius_meters")
          .eq("organization_id", organizationId)
          .eq("is_active", true),
      ]);

    if (vehiclesResult.error) throw vehiclesResult.error;
    if (locationsResult.error) throw locationsResult.error;
    if (alertsResult.error) throw alertsResult.error;
    if (incidentsResult.error) throw incidentsResult.error;

    const vehicles = vehiclesResult.data || [];
    const locations = locationsResult.data || [];
    const alerts = alertsResult.data || [];
    const incidents = incidentsResult.data || [];

    const latestLocationByVehicle = new Map<string, any>();

    for (const location of locations) {
      if (!latestLocationByVehicle.has(location.vehicle_id)) {
        latestLocationByVehicle.set(location.vehicle_id, location);
      }
    }

    const alertsByVehicle = new Map<string, any[]>();

    for (const alert of alerts) {
      const current = alertsByVehicle.get(alert.vehicle_id) || [];
      current.push(alert);
      alertsByVehicle.set(alert.vehicle_id, current);
    }

    const activeVehicles = vehicles
      .map((vehicle: any) => {
        const location = latestLocationByVehicle.get(vehicle.id);
        const lat = toNumber(location?.latitude);
        const lng = toNumber(location?.longitude);

        if (!location || !lat || !lng) return null;

        const openAlerts = alertsByVehicle.get(vehicle.id) || [];
        const isOffline = minutesSince(location.recorded_at) >= OFFLINE_MINUTES;

        return {
          id: vehicle.id,
          registrationNumber: vehicle.registration_number,
          nickname: vehicle.nickname,
          latitude: lat,
          longitude: lng,
          speedKmh: toNumber(location.speed_kmh),
          lastSeen: location.recorded_at,
          isOffline,
          openAlerts: openAlerts.length,
          criticalAlerts: openAlerts.filter((a) => a.severity === "critical").length,
          highAlerts: openAlerts.filter((a) => a.severity === "high").length,
        };
      })
      .filter(Boolean) as any[];

    const clusters: any[] = [];
    const clusteredVehicleIds = new Set<string>();

    for (const vehicle of activeVehicles) {
      if (clusteredVehicleIds.has(vehicle.id)) continue;

      const nearby = activeVehicles.filter((candidate) => {
        if (candidate.id === vehicle.id) return true;

        return (
          distanceMeters(
            vehicle.latitude,
            vehicle.longitude,
            candidate.latitude,
            candidate.longitude
          ) <= CLUSTER_DISTANCE_METERS
        );
      });

      if (nearby.length >= 2) {
        nearby.forEach((v) => clusteredVehicleIds.add(v.id));

        clusters.push({
          id: `cluster-${clusters.length + 1}`,
          vehicleCount: nearby.length,
          center: {
            latitude:
              nearby.reduce((total, v) => total + v.latitude, 0) / nearby.length,
            longitude:
              nearby.reduce((total, v) => total + v.longitude, 0) / nearby.length,
          },
          vehicles: nearby.map((v) => ({
            id: v.id,
            registrationNumber: v.registrationNumber,
          })),
          riskScore: Math.min(
            100,
            nearby.reduce(
              (total, v) =>
                total +
                v.openAlerts * 8 +
                v.criticalAlerts * 20 +
                v.highAlerts * 12 +
                (v.isOffline ? 15 : 0),
              0
            )
          ),
        });
      }
    }

    const loneVehicles = activeVehicles.filter((vehicle) => {
      const nearest = activeVehicles
        .filter((candidate) => candidate.id !== vehicle.id)
        .map((candidate) =>
          distanceMeters(
            vehicle.latitude,
            vehicle.longitude,
            candidate.latitude,
            candidate.longitude
          )
        )
        .sort((a, b) => a - b)[0];

      return nearest === undefined || nearest >= LONE_VEHICLE_DISTANCE_METERS;
    });

    const vehiclesNearThreats = activeVehicles.filter((vehicle) =>
      incidents.some((incident: any) => {
        const lat = toNumber(incident.latitude);
        const lng = toNumber(incident.longitude);
        if (!lat || !lng) return false;

        const radius = toNumber(incident.radius_meters) || 1000;

        return distanceMeters(vehicle.latitude, vehicle.longitude, lat, lng) <= radius;
      })
    );

    const offlineVehicles = activeVehicles.filter((vehicle) => vehicle.isOffline);
    const vehiclesWithAlerts = activeVehicles.filter((vehicle) => vehicle.openAlerts > 0);

    let fleetHealthScore = 100;
    fleetHealthScore -= Math.min(offlineVehicles.length * 8, 30);
    fleetHealthScore -= Math.min(vehiclesWithAlerts.length * 5, 25);
    fleetHealthScore -= Math.min(vehiclesNearThreats.length * 6, 30);
    fleetHealthScore -= Math.min(loneVehicles.length * 3, 15);
    fleetHealthScore = Math.max(0, Math.min(100, fleetHealthScore));

    const operationalStatus =
      fleetHealthScore < 50
        ? "Critical"
        : fleetHealthScore < 75
        ? "Elevated"
        : "Stable";

    return NextResponse.json({
      success: true,
      digitalTwin: {
        operationalStatus,
        fleetHealthScore,
        totalVehicles: vehicles.length,
        mappedVehicles: activeVehicles.length,
        clusters,
        loneVehicles: loneVehicles.map((vehicle) => ({
          id: vehicle.id,
          registrationNumber: vehicle.registrationNumber,
          latitude: vehicle.latitude,
          longitude: vehicle.longitude,
        })),
        risk: {
          offlineVehicles: offlineVehicles.length,
          vehiclesWithAlerts: vehiclesWithAlerts.length,
          vehiclesNearThreats: vehiclesNearThreats.length,
          activeThreatZones: incidents.length,
        },
        recommendations: [
          ...(offlineVehicles.length > 0
            ? [`Verify ${offlineVehicles.length} offline vehicle tracker(s).`]
            : []),
          ...(vehiclesNearThreats.length > 0
            ? [`Review ${vehiclesNearThreats.length} vehicle(s) near active threat zones.`]
            : []),
          ...(loneVehicles.length > 0
            ? [`Monitor ${loneVehicles.length} isolated vehicle(s) for response coverage.`]
            : []),
          ...(clusters.length > 0
            ? [`Detected ${clusters.length} fleet cluster(s). Check for congestion or convoy movement.`]
            : []),
          ...(offlineVehicles.length === 0 &&
          vehiclesNearThreats.length === 0 &&
          loneVehicles.length === 0
            ? ["Fleet distribution appears stable. Continue routine monitoring."]
            : []),
        ],
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load Fleet Digital Twin." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
