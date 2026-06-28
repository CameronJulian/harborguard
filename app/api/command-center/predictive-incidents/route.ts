import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function riskLevel(score: number) {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function predictionText(score: number) {
  if (score >= 85) return "High likelihood of incident escalation in the next 15 minutes.";
  if (score >= 70) return "Elevated likelihood of dispatcher or supervisor intervention.";
  if (score >= 50) return "Moderate operational risk. Continue close monitoring.";
  return "Low near-term incident risk.";
}

function recommendationFor(score: number) {
  if (score >= 85) {
    return [
      "Keep supervisor escalation active.",
      "Contact driver immediately.",
      "Prepare response dispatch.",
      "Monitor every 60 seconds.",
    ];
  }

  if (score >= 70) {
    return [
      "Review mission queue.",
      "Confirm driver status.",
      "Prepare reroute if road risk increases.",
    ];
  }

  if (score >= 50) {
    return [
      "Continue monitoring.",
      "Review related alerts.",
      "Check route safety context.",
    ];
  }

  return ["Continue routine monitoring."];
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
          driver_name
        )
      `)
      .eq("organization_id", organizationId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(50);

    if (alertsError) {
      return NextResponse.json({ error: alertsError.message }, { status: 500 });
    }

    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select("id, severity, status, summary, created_at, vehicle_alert_id")
      .eq("organization_id", organizationId)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(50);

    if (incidentsError) {
      return NextResponse.json({ error: incidentsError.message }, { status: 500 });
    }

    const { data: roadIncidents, error: roadError } = await supabase
      .from("road_incidents")
      .select("id, severity, type, title, created_at, is_active")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .limit(50);

    if (roadError) {
      return NextResponse.json({ error: roadError.message }, { status: 500 });
    }

    const grouped = new Map<string, any[]>();

    for (const alert of alerts || []) {
      const key = alert.vehicle_id || "unknown";
      grouped.set(key, [...(grouped.get(key) || []), alert]);
    }

    const predictions = Array.from(grouped.entries()).map(([vehicleId, vehicleAlerts]) => {
      const latest = vehicleAlerts[0];
      const criticalAlerts = vehicleAlerts.filter((alert: any) => alert.severity === "critical").length;
      const highAlerts = vehicleAlerts.filter((alert: any) => alert.severity === "high").length;
      const panicAlerts = vehicleAlerts.filter((alert: any) =>
        String(alert.alert_type || "").toLowerCase().includes("panic") ||
        String(alert.alert_type || "").toLowerCase().includes("sos")
      ).length;

      const avgIntelligence =
        vehicleAlerts.reduce((sum: number, alert: any) => sum + Number(alert.intelligence_score || 0), 0) /
        Math.max(vehicleAlerts.length, 1);

      const hasHighBehavioralRisk = vehicleAlerts.some((alert: any) =>
        String(alert.behavioral_risk || "").toLowerCase().includes("high")
      );

      const openIncidentCount = (incidents || []).filter((incident: any) =>
        vehicleAlerts.some((alert: any) => alert.id === incident.vehicle_alert_id)
      ).length;

      const activeRoadRisk = (roadIncidents || []).filter((item: any) =>
        ["critical", "high"].includes(String(item.severity || "").toLowerCase())
      ).length;

      const score = Math.min(
        99,
        Math.round(
          25 +
            criticalAlerts * 22 +
            highAlerts * 12 +
            panicAlerts * 20 +
            openIncidentCount * 12 +
            Math.min(avgIntelligence, 40) +
            (hasHighBehavioralRisk ? 10 : 0) +
            Math.min(activeRoadRisk, 3)
        )
      );

      return {
        vehicleId,
        vehicleName: latest.vehicle?.registration_number || vehicleId,
        driverName: latest.vehicle?.driver_name || null,
        score,
        riskLevel: riskLevel(score),
        prediction: predictionText(score),
        activeAlerts: vehicleAlerts.length,
        criticalAlerts,
        highAlerts,
        panicAlerts,
        openIncidentCount,
        activeRoadRisk,
        behavioralRisk: hasHighBehavioralRisk ? "high" : "normal",
        recommendedActions: recommendationFor(score),
        generatedAt: new Date().toISOString(),
      };
    });

    predictions.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      predictions: predictions.slice(0, 15),
      summary: {
        total: predictions.length,
        critical: predictions.filter((item) => item.riskLevel === "critical").length,
        high: predictions.filter((item) => item.riskLevel === "high").length,
        medium: predictions.filter((item) => item.riskLevel === "medium").length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load predictive incident intelligence." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

