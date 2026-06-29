import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function accidentScore(alert: any, roadAccidents: any[], incidents: any[]) {
  const severity = String(alert.severity || "").toLowerCase();
  const type = String(alert.alert_type || "").toLowerCase();
  const message = String(alert.message || "").toLowerCase();
  const intelligence = Number(alert.intelligence_score || 0);

  let score = 0;
  const reasons: string[] = [];

  if (severity === "critical") {
    score += 30;
    reasons.push("Critical vehicle alert detected.");
  }

  if (severity === "high") {
    score += 20;
    reasons.push("High severity vehicle alert detected.");
  }

  if (type.includes("panic") || type.includes("sos")) {
    score += 35;
    reasons.push("SOS or panic pattern detected.");
  }

  if (
    message.includes("impact") ||
    message.includes("collision") ||
    message.includes("crash") ||
    message.includes("accident") ||
    message.includes("sudden stop") ||
    message.includes("hard brake") ||
    message.includes("harsh brake")
  ) {
    score += 30;
    reasons.push("Impact, collision, sudden stop, or harsh braking language detected.");
  }

  if (intelligence >= 80) {
    score += 15;
    reasons.push("High intelligence score.");
  }

  if (roadAccidents.length > 0) {
    score += 10;
    reasons.push("Active road accident intelligence nearby or in the organization feed.");
  }

  if (incidents.length > 0) {
    score += 10;
    reasons.push("Open incidents exist in the current operating window.");
  }

  return {
    score: Math.min(score, 99),
    reasons: reasons.length ? reasons : ["No accident indicators detected."],
  };
}

function riskLevel(score: number) {
  if (score >= 75) return "critical";
  if (score >= 55) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function recommendedAction(level: string) {
  if (level === "critical") {
    return "Treat as possible accident. Contact driver immediately, open incident command, and prepare emergency escalation.";
  }

  if (level === "high") {
    return "Verify driver safety, review vehicle location, and prepare dispatcher escalation.";
  }

  if (level === "medium") {
    return "Monitor vehicle telemetry and check for repeated harsh braking, panic, or stopped-vehicle signals.";
  }

  return "Continue routine monitoring.";
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: alerts, error: alertsError } = await supabase
      .from("vehicle_alerts")
      .select(`
        id,
        vehicle_id,
        alert_type,
        severity,
        message,
        intelligence_score,
        behavioral_risk,
        created_at,
        vehicle:vehicles (
          registration_number,
          nickname
        )
      `)
      .eq("organization_id", organizationId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (alertsError) {
      return NextResponse.json({ error: alertsError.message }, { status: 500 });
    }

    const { data: roadAccidents, error: roadError } = await supabase
      .from("road_incidents")
      .select("id, title, type, severity, created_at")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .in("type", ["accident", "crash", "collision"])
      .limit(25);

    if (roadError) {
      return NextResponse.json({ error: roadError.message }, { status: 500 });
    }

    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select("id, severity, status, summary, created_at")
      .eq("organization_id", organizationId)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(25);

    if (incidentsError) {
      return NextResponse.json({ error: incidentsError.message }, { status: 500 });
    }

    const detections = (alerts || [])
      .map((alert: any) => {
        const result = accidentScore(alert, roadAccidents || [], incidents || []);
        const level = riskLevel(result.score);
        const vehicle = alert.vehicle || {};

        return {
          id: alert.id,
          vehicleId: alert.vehicle_id,
          vehicleName: vehicle.registration_number || alert.vehicle_id || "Unknown vehicle",
          nickname: vehicle.nickname || null,
          score: result.score,
          riskLevel: level,
          alertType: alert.alert_type,
          severity: alert.severity,
          message: alert.message,
          reasons: result.reasons,
          recommendedAction: recommendedAction(level),
          createdAt: alert.created_at,
        };
      })
      .filter((item: any) => item.score >= 25)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      summary: {
        monitoredAlerts: alerts?.length || 0,
        activeRoadAccidents: roadAccidents?.length || 0,
        openIncidents: incidents?.length || 0,
        detectionCount: detections.length,
        highestScore: detections[0]?.score || 0,
      },
      detections,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load AI accident detection." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
