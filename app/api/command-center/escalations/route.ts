import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildMissionEscalation } from "@/lib/escalation/missionEscalation";

function minutesSince(dateValue: string | null) {
  if (!dateValue) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateValue).getTime()) / 60000));
}

function slaMinutes(priority: string) {
  if (priority === "critical") return 5;
  if (priority === "high") return 15;
  return 30;
}

function slaStatus(ageMinutes: number, limitMinutes: number) {
  if (ageMinutes >= limitMinutes) return "breached";
  if (ageMinutes >= Math.floor(limitMinutes * 0.7)) return "warning";
  return "within_sla";
}

function priorityRank(priority: string) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function priorityFromEscalation(severity: string, score: number) {
  if (severity === "critical" || score >= 80) return "critical";
  if (severity === "high" || score >= 60) return "high";
  if (severity === "medium" || score >= 30) return "medium";
  return "medium";
}

function buildAlertEscalation(alert: any) {
  const engine = buildMissionEscalation({
    behavioralRisk: Number(alert.behavioral_risk || 0),
    intelligenceScore: Number(alert.intelligence_score || 0),
  });

  const severity = String(alert.severity || "medium").toLowerCase();
  const priority = priorityFromEscalation(
    engine.severity,
    Math.max(engine.score, severity === "critical" ? 80 : severity === "high" ? 60 : 30)
  );

  const ageMinutes = minutesSince(alert.created_at);
  const limitMinutes = slaMinutes(priority);
  const vehicle = alert.vehicle || {};

  return {
    id: `alert-${alert.id}`,
    sourceId: alert.id,
    sourceType: "vehicle_alert",
    priority,
    status: "pending_supervisor_review",
    title: `${vehicle.registration_number || "Unknown vehicle"} supervisor escalation`,
    detail: alert.message || "Vehicle alert requires supervisor review.",
    vehicleName: vehicle.registration_number || null,
    driverName: null,
    recommendedDecision:
      priority === "critical"
        ? "Approve immediate escalation and confirm response workflow."
        : "Review dispatcher action and approve escalation if risk persists.",
    escalationScore: engine.score,
    escalationReasons: engine.reasons,
    escalationActions: engine.actions,
    ageMinutes,
    slaMinutes: limitMinutes,
    slaStatus: slaStatus(ageMinutes, limitMinutes),
    createdAt: alert.created_at,
  };
}

function buildIncidentEscalation(incident: any) {
  const severity = String(incident.severity || "medium").toLowerCase();
  const priority = severity === "critical" ? "critical" : severity === "high" ? "high" : "medium";
  const ageMinutes = minutesSince(incident.created_at);
  const limitMinutes = slaMinutes(priority);

  return {
    id: `incident-${incident.id}`,
    sourceId: incident.id,
    sourceType: "incident",
    priority,
    status: "pending_supervisor_review",
    title: incident.summary || "Incident requires supervisor review",
    detail: "Open incident requires supervisor confirmation or assignment.",
    vehicleName: null,
    driverName: null,
    recommendedDecision: "Approve command workflow and assign response owner.",
    ageMinutes,
    slaMinutes: limitMinutes,
    slaStatus: slaStatus(ageMinutes, limitMinutes),
    createdAt: incident.created_at,
  };
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
        created_at
      `)
      .eq("organization_id", organizationId)
      .eq("is_resolved", false)
      .in("severity", ["critical", "high"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (alertsError) {
      return NextResponse.json({ error: alertsError.message }, { status: 500 });
    }

    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select(`
        id,
        severity,
        status,
        summary,
        created_at
      `)
      .eq("organization_id", organizationId)
      .neq("status", "resolved")
      .in("severity", ["critical", "high"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (incidentsError) {
      return NextResponse.json({ error: incidentsError.message }, { status: 500 });
    }

    const escalations = [
      ...(alerts || []).map(buildAlertEscalation),
      ...(incidents || []).map(buildIncidentEscalation),
    ]
      .sort((a, b) => {
        const priorityDiff = priorityRank(b.priority) - priorityRank(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return b.ageMinutes - a.ageMinutes;
      })
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      escalations,
      summary: {
        total: escalations.length,
        critical: escalations.filter((item) => item.priority === "critical").length,
        high: escalations.filter((item) => item.priority === "high").length,
        breached: escalations.filter((item) => item.slaStatus === "breached").length,
        warning: escalations.filter((item) => item.slaStatus === "warning").length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("ESCALATIONS ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load supervisor escalations." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
