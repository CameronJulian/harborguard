import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function statusFromCounts(critical: number, high: number, sos: number) {
  if (sos > 0 || critical > 0) return "Critical";
  if (high > 0) return "Elevated";
  return "Operating Normally";
}

function confidenceFromCounts(total: number, critical: number, high: number) {
  if (critical > 0) return 97;
  if (high > 0) return 88;
  if (total > 0) return 76;
  return 92;
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, registration_number, nickname, driver_name")
      .eq("organization_id", organizationId);

    const { data: alerts } = await supabase
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
          nickname,
          driver_name
        )
      `)
      .eq("organization_id", organizationId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(25);

    const { data: incidents } = await supabase
      .from("incidents")
      .select("id, severity, status, summary, created_at")
      .eq("organization_id", organizationId)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: roadIncidents } = await supabase
      .from("road_incidents")
      .select("id, type, severity, title, is_active")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .limit(50);

    const openAlerts = alerts || [];
    const openIncidents = incidents || [];
    const activeRoadIncidents = roadIncidents || [];

    const criticalAlerts = openAlerts.filter((alert: any) => alert.severity === "critical");
    const highAlerts = openAlerts.filter((alert: any) => alert.severity === "high");
    const sosAlerts = openAlerts.filter((alert: any) =>
      String(alert.alert_type || "").toLowerCase().includes("sos") ||
      String(alert.alert_type || "").toLowerCase().includes("panic")
    );

    const highestRisk = [...openAlerts].sort(
      (a: any, b: any) =>
        Number(b.intelligence_score || 0) - Number(a.intelligence_score || 0)
    )[0];

    const criticalRoadThreats = activeRoadIncidents.filter(
      (item: any) => item.severity === "critical" || item.severity === "high"
    );

    const fleetStatus = statusFromCounts(
      criticalAlerts.length,
      highAlerts.length,
      sosAlerts.length
    );

    const recommendations: string[] = [];

    if (sosAlerts.length > 0) {
      recommendations.push("Prioritize SOS or panic alerts and confirm driver safety immediately.");
    }

    if (criticalAlerts.length > 0) {
      recommendations.push("Escalate critical vehicle alerts and keep dispatcher monitoring active.");
    }

    if (highAlerts.length > 0) {
      recommendations.push("Review high-risk vehicles and prepare reroute or incident escalation.");
    }

    if (criticalRoadThreats.length > 0) {
      recommendations.push("Review active road intelligence threats and avoid affected corridors.");
    }

    if (openIncidents.length > 0) {
      recommendations.push("Review open incidents and confirm command workflow status.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Fleet appears stable. Continue routine monitoring.");
    }

    const vehicle: any = highestRisk?.vehicle || {};

    return NextResponse.json({
      success: true,
      assistant: {
        fleetStatus,
        confidence: confidenceFromCounts(
          openAlerts.length,
          criticalAlerts.length,
          highAlerts.length
        ),
        monitoredVehicles: vehicles?.length || 0,
        openAlerts: openAlerts.length,
        criticalAlerts: criticalAlerts.length,
        highAlerts: highAlerts.length,
        sosAlerts: sosAlerts.length,
        openIncidents: openIncidents.length,
        activeRoadThreats: activeRoadIncidents.length,
        highestRisk: highestRisk
          ? {
              vehicleId: highestRisk.vehicle_id,
              registrationNumber:
                vehicle.registration_number || highestRisk.vehicle_id,
              nickname: vehicle.nickname || null,
              driverName: vehicle.driver_name || null,
              severity: highestRisk.severity,
              alertType: highestRisk.alert_type,
              message: highestRisk.message,
              intelligenceScore: highestRisk.intelligence_score || 0,
              behavioralRisk: highestRisk.behavioral_risk || "unknown",
            }
          : null,
        recommendations,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load AI Command Assistant." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
