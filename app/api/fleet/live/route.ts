import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type VehicleRow = {
  id: string;
  registration_number: string;
  nickname: string | null;
  make: string | null;
  model: string | null;
  driver_id: string | null;
  is_active: boolean;
  created_at: string | null;
};

type DriverRow = {
  id: string;
  full_name: string;
};

type LocationRow = {
  id: string;
  vehicle_id: string | null;
  latitude: number;
  longitude: number;
  speed_kmh: number | null;
  heading: number | null;
  recorded_at: string | null;
  source: string | null;
};

type AlertRow = {
  id: string;
  vehicle_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
  is_resolved: boolean;
  created_at: string | null;
};

export async function GET() {
  try {
    const [vehiclesRes, driversRes, locationsRes, alertsRes] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, registration_number, nickname, make, model, driver_id, is_active, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("drivers")
        .select("id, full_name"),
      supabase
        .from("vehicle_locations")
        .select("id, vehicle_id, latitude, longitude, speed_kmh, heading, recorded_at, source")
        .order("recorded_at", { ascending: false }),
      supabase
        .from("vehicle_alerts")
        .select("id, vehicle_id, alert_type, severity, message, is_resolved, created_at")
        .eq("is_resolved", false)
        .order("created_at", { ascending: false }),
    ]);

    if (vehiclesRes.error) {
      return NextResponse.json({ error: vehiclesRes.error.message }, { status: 500 });
    }

    if (driversRes.error) {
      return NextResponse.json({ error: driversRes.error.message }, { status: 500 });
    }

    if (locationsRes.error) {
      return NextResponse.json({ error: locationsRes.error.message }, { status: 500 });
    }

    if (alertsRes.error) {
      return NextResponse.json({ error: alertsRes.error.message }, { status: 500 });
    }

    const vehicles = (vehiclesRes.data || []) as VehicleRow[];
    const drivers = (driversRes.data || []) as DriverRow[];
    const locations = (locationsRes.data || []) as LocationRow[];
    const alerts = (alertsRes.data || []) as AlertRow[];

    const driverNameById = new Map<string, string>();
    for (const driver of drivers) {
      driverNameById.set(driver.id, driver.full_name);
    }

    const latestLocationByVehicle = new Map<string, LocationRow>();
    for (const location of locations) {
      if (!location.vehicle_id) continue;
      if (!latestLocationByVehicle.has(location.vehicle_id)) {
        latestLocationByVehicle.set(location.vehicle_id, location);
      }
    }

    const openAlertsByVehicle = new Map<string, AlertRow[]>();
    for (const alert of alerts) {
      if (!alert.vehicle_id) continue;
      const existing = openAlertsByVehicle.get(alert.vehicle_id) || [];
      existing.push(alert);
      openAlertsByVehicle.set(alert.vehicle_id, existing);
    }

    const fleet = vehicles.map((vehicle) => {
      const latestLocation = latestLocationByVehicle.get(vehicle.id) || null;
      const vehicleAlerts = openAlertsByVehicle.get(vehicle.id) || [];
      const lastSeen = latestLocation?.recorded_at || null;
      const isOffline = !lastSeen
        ? true
        : Date.now() - new Date(lastSeen).getTime() > 15 * 60 * 1000;

      return {
        id: vehicle.id,
        nickname: vehicle.nickname,
        registrationNumber: vehicle.registration_number,
        make: vehicle.make,
        model: vehicle.model,
        driverId: vehicle.driver_id,
        driverName: vehicle.driver_id ? driverNameById.get(vehicle.driver_id) || null : null,
        isActive: vehicle.is_active,
        isOffline,
        latitude: latestLocation?.latitude ?? null,
        longitude: latestLocation?.longitude ?? null,
        speedKmh: latestLocation?.speed_kmh ?? 0,
        heading: latestLocation?.heading ?? 0,
        source: latestLocation?.source ?? null,
        lastSeen,
        openAlerts: vehicleAlerts.map((alert) => ({
          id: alert.id,
          alertType: alert.alert_type,
          severity: alert.severity,
          message: alert.message,
          createdAt: alert.created_at,
        })),
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
      { error: err.message || "Failed to load live fleet data." },
      { status: 500 }
    );
  }
}