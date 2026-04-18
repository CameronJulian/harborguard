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
        latestLocations.slice(1).some((row) => (row.speed_kmh ?? 0) >= MOVING_SPEED_THRESHOLD);

      if (
        previouslyMoving &&
        ageMinutes >= 10 &&
        !openTypes.has("signal_loss")
      ) {
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

        if (insertedAlert) createdAlerts.push(insertedAlert);
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