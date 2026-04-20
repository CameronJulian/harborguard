import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LONG_STOP_MINUTES = 20;
const OFFLINE_MINUTES = 15;
const SUSPICIOUS_STOP_MINUTES = 5;
const MOVING_SPEED_THRESHOLD = 20;

function minutesAgoIso(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

type RoutePoint = {
  latitude: number;
  longitude: number;
  name?: string;
};

function getRouteDeviationKm(
  latitude: number,
  longitude: number,
  routePoints: RoutePoint[]
) {
  if (!routePoints.length) return 0;

  let minDistance = Number.POSITIVE_INFINITY;

  for (const point of routePoints) {
    const dist = distanceKm(latitude, longitude, point.latitude, point.longitude);
    if (dist < minDistance) minDistance = dist;
  }

  return minDistance;
}

async function notifyCriticalAlert(params: {
  vehicleNickname?: string | null;
  registrationNumber?: string | null;
  alertType: string;
  severity: string;
  message: string;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
}) {
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    await fetch(`${origin}/api/fleet/notify-alert`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
  } catch {
    // do not fail risk detection if email notification fails
  }
}

export async function POST() {
  try {
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("id, nickname, registration_number, is_active");

    if (vehiclesError) {
      return NextResponse.json(
        { error: vehiclesError.message },
        { status: 500 }
      );
    }

    const createdAlerts: any[] = [];

    for (const vehicle of vehicles || []) {
      const { data: latestLocations, error: locationError } = await supabase
        .from("vehicle_locations")
        .select("id, latitude, longitude, speed_kmh, recorded_at")
        .eq("vehicle_id", vehicle.id)
        .order("recorded_at", { ascending: false })
        .limit(10);

      if (locationError || !latestLocations || latestLocations.length === 0) {
        continue;
      }

      const latest = latestLocations[0];
      const lastSeenMs = new Date(latest.recorded_at).getTime();
      const ageMinutes = (Date.now() - lastSeenMs) / (1000 * 60);

      const { data: existingOpenAlerts } = await supabase
        .from("vehicle_alerts")
        .select("id, alert_type")
        .eq("vehicle_id", vehicle.id)
        .eq("is_resolved", false);

      const openTypes = new Set((existingOpenAlerts || []).map((a) => a.alert_type));

      if (ageMinutes >= OFFLINE_MINUTES && !openTypes.has("offline")) {
        const message = `${vehicle.nickname || vehicle.registration_number} has not reported location for ${Math.floor(ageMinutes)} minutes.`;

        const { data: insertedAlert } = await supabase
          .from("vehicle_alerts")
          .insert({
            vehicle_id: vehicle.id,
            alert_type: "offline",
            severity: "high",
            message,
            is_resolved: false,
          })
          .select()
          .single();

        if (insertedAlert) createdAlerts.push(insertedAlert);
      }

      const recentEnough = latestLocations.filter(
        (row) => row.recorded_at && row.recorded_at >= minutesAgoIso(LONG_STOP_MINUTES)
      );

      if (
        recentEnough.length >= 2 &&
        recentEnough.every((row) => (row.speed_kmh ?? 0) <= 3) &&
        !openTypes.has("long_stop")
      ) {
        const message = `${vehicle.nickname || vehicle.registration_number} appears stationary for over ${LONG_STOP_MINUTES} minutes.`;

        const { data: insertedAlert } = await supabase
          .from("vehicle_alerts")
          .insert({
            vehicle_id: vehicle.id,
            alert_type: "long_stop",
            severity: "high",
            message,
            is_resolved: false,
          })
          .select()
          .single();

        if (insertedAlert) createdAlerts.push(insertedAlert);
      }

      const suspiciousStopRows = latestLocations.filter(
        (row) => row.recorded_at && row.recorded_at >= minutesAgoIso(SUSPICIOUS_STOP_MINUTES)
      );

      if (
        suspiciousStopRows.length >= 2 &&
        suspiciousStopRows.every((row) => (row.speed_kmh ?? 0) === 0) &&
        !openTypes.has("suspicious_stop")
      ) {
        const message = `${vehicle.nickname || vehicle.registration_number} has been stopped unexpectedly for over ${SUSPICIOUS_STOP_MINUTES} minutes.`;

        const { data: insertedAlert } = await supabase
          .from("vehicle_alerts")
          .insert({
            vehicle_id: vehicle.id,
            alert_type: "suspicious_stop",
            severity: "high",
            message,
            is_resolved: false,
          })
          .select()
          .single();

        if (insertedAlert) createdAlerts.push(insertedAlert);
      }

      const previouslyMoving =
        latestLocations.length >= 2 &&
        latestLocations
          .slice(1)
          .some((row) => (row.speed_kmh ?? 0) >= MOVING_SPEED_THRESHOLD);

      if (previouslyMoving && ageMinutes >= 10 && !openTypes.has("signal_loss")) {
        const message = `${vehicle.nickname || vehicle.registration_number} lost signal after moving at speed. Possible tracking disruption.`;

        const { data: insertedAlert } = await supabase
          .from("vehicle_alerts")
          .insert({
            vehicle_id: vehicle.id,
            alert_type: "signal_loss",
            severity: "critical",
            message,
            is_resolved: false,
          })
          .select()
          .single();

        if (insertedAlert) {
          createdAlerts.push(insertedAlert);

          await notifyCriticalAlert({
            vehicleNickname: vehicle.nickname,
            registrationNumber: vehicle.registration_number,
            alertType: "signal_loss",
            severity: "critical",
            message,
            lastLatitude: latest.latitude,
            lastLongitude: latest.longitude,
          });
        }
      }

      const { data: activeTrip } = await supabase
        .from("vehicle_trips")
        .select("id, expected_route, deviation_threshold_km, status")
        .eq("vehicle_id", vehicle.id)
        .in("status", [
          "scheduled",
          "en_route_to_port",
          "collecting",
          "en_route_to_fishery",
          "emergency",
        ])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const routePoints = activeTrip?.expected_route?.points || [];
      const deviationThresholdKm = Number(activeTrip?.deviation_threshold_km ?? 3);

      if (
        activeTrip &&
        Array.isArray(routePoints) &&
        routePoints.length > 0 &&
        typeof latest.latitude === "number" &&
        typeof latest.longitude === "number" &&
        !openTypes.has("route_deviation")
      ) {
        const deviationKm = getRouteDeviationKm(
          latest.latitude,
          latest.longitude,
          routePoints
        );

        if (deviationKm > deviationThresholdKm) {
          const message = `${vehicle.nickname || vehicle.registration_number} is ${deviationKm.toFixed(
            2
          )} km away from the planned route.`;

          const { data: insertedAlert } = await supabase
            .from("vehicle_alerts")
            .insert({
              vehicle_id: vehicle.id,
              trip_id: activeTrip.id,
              alert_type: "route_deviation",
              severity: "critical",
              message,
              is_resolved: false,
            })
            .select()
            .single();

          if (insertedAlert) {
            createdAlerts.push(insertedAlert);

            await notifyCriticalAlert({
              vehicleNickname: vehicle.nickname,
              registrationNumber: vehicle.registration_number,
              alertType: "route_deviation",
              severity: "critical",
              message,
              lastLatitude: latest.latitude,
              lastLongitude: latest.longitude,
            });
          }

          await supabase
            .from("vehicle_trips")
            .update({ status: "emergency" })
            .eq("id", activeTrip.id);
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