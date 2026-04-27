import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function normalizeRegistration(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export async function GET() {
  try {
    const [vehiclesRes, driversRes, locationsRes, alertsRes, tripsRes] =
      await Promise.all([
        supabase
          .from("vehicles")
          .select("*")
          .order("created_at", { ascending: false }),

        supabase.from("drivers").select("id, full_name"),

        supabase
          .from("vehicle_locations")
          .select("*")
          .order("recorded_at", { ascending: false }),

        supabase
          .from("vehicle_alerts")
          .select("*")
          .eq("is_resolved", false)
          .order("created_at", { ascending: false }),

        supabase
          .from("vehicle_trips")
          .select("*")
          .in("status", [
            "scheduled",
            "en_route_to_port",
            "collecting",
            "en_route_to_fishery",
            "emergency",
          ])
          .order("created_at", { ascending: false }),
      ]);

    if (vehiclesRes.error) throw vehiclesRes.error;
    if (driversRes.error) throw driversRes.error;
    if (locationsRes.error) throw locationsRes.error;
    if (alertsRes.error) throw alertsRes.error;
    if (tripsRes.error) throw tripsRes.error;

    const driverMap = new Map(
      (driversRes.data || []).map((d) => [d.id, d.full_name])
    );

    const uniqueVehiclesMap = new Map<string, any>();

    for (const vehicle of vehiclesRes.data || []) {
      const registrationKey = normalizeRegistration(vehicle.registration_number);
      const key = registrationKey || vehicle.id;

      if (!uniqueVehiclesMap.has(key)) {
        uniqueVehiclesMap.set(key, vehicle);
        continue;
      }

      const existing = uniqueVehiclesMap.get(key);

      const existingDate = existing?.created_at
        ? new Date(existing.created_at).getTime()
        : 0;

      const currentDate = vehicle?.created_at
        ? new Date(vehicle.created_at).getTime()
        : 0;

      if (currentDate > existingDate) {
        uniqueVehiclesMap.set(key, vehicle);
      }
    }

    const uniqueVehicles = Array.from(uniqueVehiclesMap.values());
    const allowedVehicleIds = new Set(uniqueVehicles.map((vehicle) => vehicle.id));

    const latestLocationMap = new Map<string, any>();
    for (const loc of locationsRes.data || []) {
      if (!loc.vehicle_id || !allowedVehicleIds.has(loc.vehicle_id)) continue;

      if (!latestLocationMap.has(loc.vehicle_id)) {
        latestLocationMap.set(loc.vehicle_id, loc);
      }
    }

    const alertsMap = new Map<string, any[]>();
    for (const alert of alertsRes.data || []) {
      if (!alert.vehicle_id || !allowedVehicleIds.has(alert.vehicle_id)) continue;

      const list = alertsMap.get(alert.vehicle_id) || [];
      list.push(alert);
      alertsMap.set(alert.vehicle_id, list);
    }

    const tripMap = new Map<string, any>();
    for (const trip of tripsRes.data || []) {
      if (!trip.vehicle_id || !allowedVehicleIds.has(trip.vehicle_id)) continue;

      if (!tripMap.has(trip.vehicle_id)) {
        tripMap.set(trip.vehicle_id, trip);
      }
    }

    const fleet = uniqueVehicles.map((vehicle) => {
      const loc = latestLocationMap.get(vehicle.id);
      const alerts = alertsMap.get(vehicle.id) || [];
      const trip = tripMap.get(vehicle.id);

      const lastSeen = loc?.recorded_at || null;
      const isOffline = !lastSeen
        ? true
        : Date.now() - new Date(lastSeen).getTime() > 15 * 60 * 1000;

      return {
        id: vehicle.id,
        nickname: vehicle.nickname,
        registrationNumber: vehicle.registration_number,
        make: vehicle.make ?? null,
        model: vehicle.model ?? null,
        driverId: vehicle.driver_id ?? null,
        driverName: vehicle.driver_id
          ? driverMap.get(vehicle.driver_id) || null
          : null,

        isActive: vehicle.is_active ?? true,
        isOffline,
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
        speedKmh: loc?.speed_kmh ?? 0,
        heading: loc?.heading ?? 0,
        source: loc?.source ?? null,
        lastSeen,

        openAlerts: alerts.map((a) => ({
          id: a.id,
          alert_type: a.alert_type || "unknown_alert",
          severity: a.severity || "medium",
          message: a.message || "No message",
          created_at: a.created_at,
          is_resolved: a.is_resolved ?? false,
        })),

        activeTrip: trip
          ? {
              id: trip.id,
              status: trip.status,
              originPort: trip.origin_port,
              destinationFishery: trip.destination_fishery,
              deviationThresholdKm: Number(trip.deviation_threshold_km ?? 3),
              routePoints: trip.expected_route?.points || [],
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      fleet,
      summary: {
        totalVehicles: fleet.length,
        onlineVehicles: fleet.filter((v) => !v.isOffline).length,
        offlineVehicles: fleet.filter((v) => v.isOffline).length,
        vehiclesWithAlerts: fleet.filter((v) => v.openAlerts.length > 0).length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load fleet data." },
      { status: 500 }
    );
  }
}