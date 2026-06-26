import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { createCommandCenterNotification } from "@/lib/command-center/notifications";




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

async function createIncident(
  supabase: any,
  organizationId: string,
  alert: any
) {
  try {
	  
    const incidentCode = `INC-${Date.now()}`;

    const summary =
      alert.message ||
      `${alert.alert_type || "Risk event"} detected`;

    const { error } = await supabase.from("incidents").insert({
      incident_code: incidentCode,
      severity:
        alert.severity === "critical"
          ? "Critical"
          : alert.severity === "high"
            ? "High"
            : alert.severity === "medium"
              ? "Medium"
              : "Low",
      status: "Open",
      summary,
      assigned_to: null,
      organization_id: organizationId,
    });

    if (error) {
      console.error("Failed to create incident:", error.message);
    }
  } catch (err) {
    console.error("Incident creation error:", err);
  }
}

async function createAlert(
  supabase: any,
  organizationId: string,
  params: {
  vehicleId: string;
  alertType: string;
  severity: string;
    message: string;
  }
) {
  const { data: historicalAlerts } = await supabase
    .from("vehicle_alerts")
    .select("id, severity, created_at")
    .eq("vehicle_id", params.vehicleId)
	.eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);

  const previousCount = historicalAlerts?.length || 0;

  const criticalCount =
    historicalAlerts?.filter((a: any) => a.severity === "critical").length || 0;

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
	  organization_id: organizationId,
    })
    .select()
    .single();

  if (error || !data) {
return null;
  }


await createCommandCenterNotification({
  supabase,
  organizationId,
  vehicleId: params.vehicleId,
  title: params.alertType.replace(/_/g, " ").toUpperCase(),
  message: params.message,
  severity: params.severity as any,
  type: params.alertType,
  source: "fleet_detect_risks",
  metadata: {
    vehicleAlertId: data.id,
    intelligenceScore: data.intelligence_score,
    behavioralRisk: data.behavioral_risk,
  },
});

if (data.severity === "critical" || data.severity === "high") {
  await createIncident(supabase, organizationId, data);
}

  return data;
}
export async function detectFleetRisks(params: {
  supabase: any;
  organizationId: string;
}) {
  const { supabase, organizationId } = params;

  const { data: vehicles, error: vehiclesError } = await supabase
    .from("vehicles")
    .select("id, nickname, registration_number")
    .eq("organization_id", organizationId);

  if (vehiclesError) {
    throw new Error(vehiclesError.message);
  }

  const { data: geofences, error: geofencesError } = await supabase
    .from("geofences")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  if (geofencesError) {
    throw new Error(geofencesError.message);
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

    const lastSeen = latest.recorded_at ? new Date(latest.recorded_at).getTime() : 0;
    const minutes = (Date.now() - lastSeen) / (1000 * 60);

    const { data: openAlerts, error: openAlertsError } = await supabase
      .from("vehicle_alerts")
      .select("alert_type")
      .eq("vehicle_id", vehicle.id)
      .eq("is_resolved", false);

    if (openAlertsError) continue;

    const openTypes = new Set((openAlerts || []).map((a: any) => a.alert_type));

    if (
      (latest.speed_kmh ?? 0) < 3 &&
      minutes >= LONG_STOP_MINUTES &&
      !openTypes.has("long_stop")
    ) {
      const message = String(vehicle.registration_number || "Unknown vehicle") + " stationary too long";

      const alert = await createAlert(supabase, organizationId, {
        vehicleId: vehicle.id,
        alertType: "long_stop",
        severity: "medium",
        message,
      });

      if (alert) createdAlerts.push(alert);
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
      const message = String(vehicle.registration_number || "Unknown vehicle") + " outside allowed zone";

      const alert = await createAlert(supabase, organizationId, {
        vehicleId: vehicle.id,
        alertType: "geofence_breach",
        severity: "critical",
        message,
      });

      if (alert) createdAlerts.push(alert);
    }
  }

  return {
    createdCount: createdAlerts.length,
    alerts: createdAlerts,
  };
}
