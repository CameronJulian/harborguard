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
    await fetch(siteUrl + "/api/fleet/notify-alert", {
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

async function createIncident(alert: any) {
  try {
    await supabase.from("incidents").insert({
      vehicle_id: alert.vehicle_id,
      alert_id: alert.id,
      type: alert.alert_type,
      severity: alert.severity,
      status: "open",
      description: alert.message,
    });
  } catch {
    // Do not block risk detection if incident creation fails.
  }
}

async function createAlert(params: {
  vehicleId: string;
  alertType: string;
  severity: string;
  message: string;
}) {
  const { data: historicalAlerts } = await supabase
    .from("vehicle_alerts")
    .select("id, severity, created_at")
    .eq("vehicle_id", params.vehicleId)
    .order("created_at", { ascending: false })
    .limit(20);

  const previousCount = historicalAlerts?.length || 0;

  const criticalCount =
    historicalAlerts?.filter((a) => a.severity === "critical").length || 0;

  let threatScore = 0;

  if (params.severity === "critical") threatScore += 45;
  else if (params.severity === "high") threatScore += 30;
  else if (params.severity === "medium") threatScore += 15;

  threatScore += previousCount * 2;
  threatScore += criticalCount * 6;
  threatScore = Math.min(threatScore, 100);

  let behavioralRisk = "low";

  if (threatScore >= 75) behavioralRisk = "critical";
  else if (threatScore >= 50) behavioralRisk = "high";
  else if (threatScore >= 25) behavioralRisk = "medium";

  let probableCause = "Operational anomaly detected.";

  if (params.alertType.includes("offline")) {
    probableCause = "Possible tracker tampering or prolonged signal loss.";
  }

  if (params.alertType.includes("long_stop")) {
    probableCause = "Vehicle stationary beyond operational threshold.";
  }

  if (params.alertType.includes("geofence")) {
    probableCause = "Vehicle deviated from approved operational area.";
  }
if (
  params.alertType.includes(
    "driver_fatigue"
  )
) {
  probableCause =
    "AI behavioral monitoring detected probable driver fatigue indicators.";
}
  const intelligenceNarrative =
    `Behavioral risk classified as ${behavioralRisk.toUpperCase()} ` +
    `with threat confidence score ${threatScore}/100. ` +
    probableCause;

  const { data, error } = await supabase
    .from("vehicle_alerts")
    .insert({
      vehicle_id: params.vehicleId,
      alert_type: params.alertType,
      severity: params.severity,
      message: params.message,
      is_resolved: false,
      intelligence_score: threatScore,
      behavioral_risk: behavioralRisk,
      intelligence_narrative: intelligenceNarrative,
    })
    .select()
    .single();

  if (error || !data) {
    return null;
  }

  if (data.severity === "critical" || data.severity === "high") {
    await createIncident(data);
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

    const { data: geofences, error: geofencesError } = await supabase
      .from("geofences")
      .select("*")
      .eq("is_active", true);

    if (geofencesError) {
      return NextResponse.json(
        { error: geofencesError.message },
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

      if (latestError || !latest) {
        continue;
      }
	 

      const lastSeen = latest.recorded_at
        ? new Date(latest.recorded_at).getTime()
        : 0;

      const minutes = (Date.now() - lastSeen) / (1000 * 60);

      const { data: openAlerts, error: openAlertsError } = await supabase
        .from("vehicle_alerts")
        .select("alert_type")
        .eq("vehicle_id", vehicle.id)
        .eq("is_resolved", false);

      if (openAlertsError) {
        continue;
      }

      const openTypes = new Set((openAlerts || []).map((a) => a.alert_type));
	  const currentHour = new Date().getHours();

const fatigueRiskWindow =
  currentHour >= 23 || currentHour <= 5;

const lowMovement =
  (latest.speed_kmh ?? 0) < 8;

const prolongedOperation =
  minutes <= 5;

const fatigueProbability =
  (fatigueRiskWindow ? 40 : 0) +
  (lowMovement ? 20 : 0) +
  (prolongedOperation ? 15 : 0) +
  Math.min(
    25,
    (latest.speed_kmh ?? 0) > 100 ? 25 : 0
  );

const fatigueDetected =
  fatigueProbability >= 60;
	  
	   const { data: recentLocations } = await supabase
  .from("vehicle_locations")
  .select("latitude, longitude, recorded_at")
  .eq("vehicle_id", vehicle.id)
  .order("recorded_at", {
    ascending: false,
  })
  .limit(5);

if (
  recentLocations &&
  recentLocations.length >= 2
) {
  const newest = recentLocations[0];
  const previous = recentLocations[1];

  const jumpDistance =
    getDistanceMeters(
      newest.latitude,
      newest.longitude,
      previous.latitude,
      previous.longitude
    );

  const newestTime = new Date(
    newest.recorded_at
  ).getTime();

  const previousTime = new Date(
    previous.recorded_at
  ).getTime();

  const minutesBetween =
    (newestTime - previousTime) /
    (1000 * 60);

  const estimatedSpeed =
    minutesBetween > 0
      ? (jumpDistance / 1000) /
        (minutesBetween / 60)
      : 0;

  if (
    estimatedSpeed > 180 &&
    !openTypes.has(
      "route_anomaly"
    )
  ) {
    const message =
      String(
        vehicle.registration_number ||
          "Unknown vehicle"
      ) +
      " abnormal route deviation detected";

    const alert =
      await createAlert({
        vehicleId: vehicle.id,
        alertType:
          "route_anomaly",
        severity: "critical",
        message,
      });

    if (alert) {
      createdAlerts.push(alert);

      await notifyAlert({
        vehicleNickname:
          vehicle.nickname,
        registrationNumber:
          vehicle.registration_number,
        alertType:
          "route_anomaly",
        severity: "critical",
        message,
        lastLatitude:
          latest.latitude,
        lastLongitude:
          latest.longitude,
      });
    }
  }
}
if (
  fatigueDetected &&
  !openTypes.has("driver_fatigue")
) {
  const message =
    String(
      vehicle.registration_number ||
        "Unknown vehicle"
    ) +
    " driver fatigue risk detected";

  const alert =
    await createAlert({
      vehicleId: vehicle.id,
      alertType: "driver_fatigue",
      severity:
        fatigueProbability >= 80
          ? "critical"
          : "high",
      message,
    });

  if (alert) {
    createdAlerts.push(alert);

    await notifyAlert({
      vehicleNickname:
        vehicle.nickname,
      registrationNumber:
        vehicle.registration_number,
      alertType:
        "driver_fatigue",
      severity:
        fatigueProbability >= 80
          ? "critical"
          : "high",
      message:
        message +
        ` (AI fatigue probability ${fatigueProbability}%)`,
      lastLatitude:
        latest.latitude,
      lastLongitude:
        latest.longitude,
    });
  }
}
      if (minutes >= OFFLINE_MINUTES && !openTypes.has("offline")) {
        const message =
          String(vehicle.registration_number || "Unknown vehicle") +
          " offline for " +
          Math.floor(minutes) +
          " minutes";

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
        const message =
          String(vehicle.registration_number || "Unknown vehicle") +
          " stationary too long";

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
        const message =
          String(vehicle.registration_number || "Unknown vehicle") +
          " outside allowed zone";

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