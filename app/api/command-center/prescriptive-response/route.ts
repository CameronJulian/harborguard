import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function priorityRank(priority: string) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function normalizePriority(severity: string) {
  const value = String(severity || "").toLowerCase();
  if (value === "critical") return "critical";
  if (value === "high") return "high";
  if (value === "medium") return "medium";
  return "low";
}

function buildSteps(priority: string, alertType: string) {
  const type = String(alertType || "").toLowerCase();
  const steps: string[] = [];

  if (type.includes("panic") || type.includes("sos")) {
    steps.push("Contact driver immediately.");
    steps.push("Escalate to supervisor.");
    steps.push("Dispatch nearest response support.");
    steps.push("Open incident investigation timeline.");
    steps.push("Monitor vehicle every 60 seconds.");
    return steps;
  }

  if (priority === "critical") {
    steps.push("Escalate to supervisor.");
    steps.push("Contact driver.");
    steps.push("Review live vehicle location.");
    steps.push("Prepare response dispatch.");
    steps.push("Keep incident workflow open.");
    return steps;
  }

  if (priority === "high") {
    steps.push("Review mission queue.");
    steps.push("Confirm driver status.");
    steps.push("Check road intelligence nearby.");
    steps.push("Prepare safer route if needed.");
    return steps;
  }

  if (priority === "medium") {
    steps.push("Continue monitoring.");
    steps.push("Review related alerts.");
    steps.push("Check predictive risk score.");
    return steps;
  }

  return ["Routine monitoring only."];
}

function estimatedResponseMinutes(priority: string) {
  if (priority === "critical") return 3;
  if (priority === "high") return 8;
  if (priority === "medium") return 15;
  return 30;
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
      .limit(30);

    if (alertsError) {
      return NextResponse.json({ error: alertsError.message }, { status: 500 });
    }

    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select("id, severity, status, summary, created_at, vehicle_alert_id")
      .eq("organization_id", organizationId)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(30);

    if (incidentsError) {
      return NextResponse.json({ error: incidentsError.message }, { status: 500 });
    }

    const plans = (alerts || []).map((alert: any) => {
      const priority = normalizePriority(alert.severity);
      const relatedIncident = (incidents || []).find(
        (incident: any) => incident.vehicle_alert_id === alert.id
      );

      const score = Math.min(
        99,
        Math.round(
          35 +
            Number(alert.intelligence_score || 0) * 0.45 +
            (priority === "critical" ? 25 : 0) +
            (priority === "high" ? 15 : 0) +
            (relatedIncident ? 10 : 0)
        )
      );

      return {
        id: `response-${alert.id}`,
        sourceAlertId: alert.id,
        sourceIncidentId: relatedIncident?.id || null,
        priority,
        score,
        title:
          priority === "critical"
            ? "Critical Response Plan"
            : priority === "high"
            ? "High Priority Response Plan"
            : "Operational Response Plan",
        vehicleName: alert.vehicle?.registration_number || alert.vehicle_id || "Unknown vehicle",
        driverName: alert.vehicle?.driver_name || null,
        trigger: String(alert.alert_type || "vehicle alert").replace(/_/g, " "),
        reason: alert.message || relatedIncident?.summary || "Active operational risk detected.",
        estimatedResponseMinutes: estimatedResponseMinutes(priority),
        requiredResources:
          priority === "critical"
            ? ["Dispatcher", "Supervisor", "Response Support"]
            : priority === "high"
            ? ["Dispatcher", "Supervisor Review"]
            : ["Dispatcher"],
        steps: buildSteps(priority, alert.alert_type),
        status: relatedIncident ? "incident-linked" : "recommended",
        createdAt: alert.created_at,
      };
    });

    plans.sort((a, b) => {
      const priorityDiff = priorityRank(b.priority) - priorityRank(a.priority);
      if (priorityDiff !== 0) return priorityDiff;
      return b.score - a.score;
    });

    return NextResponse.json({
      success: true,
      plans: plans.slice(0, 12),
      summary: {
        total: plans.length,
        critical: plans.filter((plan) => plan.priority === "critical").length,
        high: plans.filter((plan) => plan.priority === "high").length,
        incidentLinked: plans.filter((plan) => plan.status === "incident-linked").length,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load prescriptive response intelligence." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
