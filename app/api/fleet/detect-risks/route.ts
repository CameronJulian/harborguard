import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OFFLINE_MINUTES = 15;
const LONG_STOP_MINUTES = 20;

function getDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function notifyAlert(params: {
  vehicleNickname?: string | null;
  registrationNumber?: string | null;
  alertType: string;
  severity: string;
  message: string;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    await fetch(`${siteUrl}/api/fleet/notify-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
  } catch {
    // Do not fail risk detection if notification sending fails.
  }
}

async function createAlert(params: {
  vehicleId: string;
  alertType: string;
  severity: string;
  message: string;
}) {
  const { data, error } = await supabase
    .from("vehicle_alerts")
    .insert({
      vehicle_id: params.vehicleId,
      alert_type: params.alertType,
      severity: params.severity,
      message: params.message,
      is_resolved: false,
    })
    .select()
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function POST() {
  try {
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, nickname, registration_number");

    if (vehiclesError) {
      return NextResponse.json(
        { error: vehiclesError.message },
        { status: 500 }
      );
    }

    const { data: geofences, error: geofenceError } = await supabase
      .from("geofences")
      .select("*")
      .eq("is_active", true);

    if (geofenceError) {
      return NextResponse.json(
        { error: geofenceError.message },
        { status: 500 }
      );
    }

    const createdAlerts: any[] = [];

    for (const vehicle of vehicles || []) {
      const { data: latest, error: latestError } = await supabase
        .from("vehicle_locations")
        .select("*")
        .eq("vehicle_id", vehicle.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError || !latest) continue;

      const lastSeen = latest.recorded_at
        ? new Date(latest.recorded_at).getTime()
        : 0;

      const minutes = (Date.now() - lastSeen) / (1000 * 60);

      const { data: openAlerts, error: openAlertsError } = await supabase
        .from("vehicle_alerts")
        .select("alert_type")
        .eq("vehicle_id", vehicle.id)
        .eq("is_resolved", false);

      if (openAlertsError) continue;

      const openTypes = new Set((openAlerts || []).map((a) => a.alert_type));

      if (minutes >= OFFLINE_MINUTES && !openTypes.has("offline")) {
        const message = `${vehicle.nickname || vehicle.registration_number} (${vehicle.registration_number}) offline for ${Math.floor(minutes)} minutes`;

        const alert = await createAlert({
          vehicleId: vehicle.id,
          alertType: "offline",
          severity: "high",
          message,
        });

        if (alert) {
          createdAlerts.push(alert);

          await notifyAlert({
            vehicleNickname: vehicle.nickname,
            registrationNumber: vehicle.registration_number,
            alertType: "offline",
            severity: "high",
            message,
            lastLatitude: latest.latitude,
            lastLongitude: latest.longitude,
          });
        }
      }

      if (
        (latest.speed_kmh ?? 0) < 3 &&
        minutes >= LONG_STOP_MINUTES &&
        !openTypes.has("long_stop")
      ) {
        const message = `${vehicle.nickname || vehicle.registration_number} (${vehicle.registration_number}) stationary too long`;

        const alert = await createAlert({
          vehicleId: vehicle.id,
          alertType: "long_stop",
          severity: "medium",
          message,
        });

        if (alert) {
          createdAlerts.push(alert);

          await notifyAlert({
            vehicleNickname: vehicle.nickname,
            registrationNumber: vehicle.registration_number,
            alertType: "long_stop",
            severity: "medium",
            message,
            lastLatitude: latest.latitude,
            lastLongitude: latest.longitude,
          });
        }
      }

      let insideAny = false;

      for (const zone of geofences || []) {
        const distance = getDistanceMeters(
          latest.latitude,
          latest.longitude,
          zone.center_lat,
          zone.center_lng
        );

        if (distance <= zone.radius_meters) {
          insideAny = true;
          break;
        }
      }

      if (!insideAny && !openTypes.has("geofence_breach")) {
        const message = `${vehicle.nickname || vehicle.registration_number} (${vehicle.registration_number}) is outside allowed zone`;

        const alert = await createAlert({
          vehicleId: vehicle.id,
          alertType: "geofence_breach",
          severity: "critical",
          message,
        });

        if (alert) {
          createdAlerts.push(alert);

          await notifyAlert({
            vehicleNickname: vehicle.nickname,
            registrationNumber: vehicle.registration_number,
            alertType: "geofence_breach",
            severity: "critical",
            message,
            lastLatitude: latest.latitude,
            lastLongitude: latest.longitude,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      createdCount: createdAlerts.length,
      alerts: createdAlerts,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Risk detection failed." },
      { status: 500 }
    );
  }
}