import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { evaluateAutonomousOperation } from "@/lib/operations/autonomous-engine";

const COMMAND_ACTIONS = [
  "driver_contacted",
  "incident_confirmed",
  "supervisor_notified",
  "response_team_dispatched",
  "customer_notified",
  "evidence_reviewed",
  "incident_resolved",
];

function incidentCode() {
  return `INC-${Date.now()}`;
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const body = await req.json();

    const alertId = String(body.alertId || "").trim();

    if (!alertId) {
      return NextResponse.json({ error: "alertId is required." }, { status: 400 });
    }

    const { data: alert, error: alertError } = await supabase
      .from("vehicle_alerts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", alertId)
      .single();

    if (alertError) throw alertError;

    const decision = evaluateAutonomousOperation({
      alertType: alert.alert_type,
      severity: alert.severity,
      message: alert.message,
      intelligenceScore: alert.intelligence_score,
      behavioralRisk: alert.behavioral_risk,
    });

    if (!decision.shouldAct) {
      return NextResponse.json({
        success: true,
        acted: false,
        decision,
        message: "Autonomous engine evaluated alert. No automated action required.",
      });
    }

    let incident = null;

    if (decision.actions.includes("create_incident")) {
      const { data: existingIncident } = await supabase
        .from("incidents")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("vehicle_alert_id", alert.id)
        .limit(1)
        .maybeSingle();

      if (existingIncident) {
        incident = existingIncident;
      } else {
        const { data: createdIncident, error: incidentError } = await supabase
          .from("incidents")
          .insert({
            organization_id: organizationId,
            vehicle_alert_id: alert.id,
            incident_code: incidentCode(),
            severity: decision.riskLevel === "critical" ? "Critical" : "High",
            status: "Open",
            summary: `Autonomous AI Operations created incident from ${alert.alert_type}. ${alert.message || ""}`,
            assigned_to: null,
          })
          .select()
          .single();

        if (incidentError) throw incidentError;
        incident = createdIncident;
      }
    }

    if (incident && decision.actions.includes("start_command_workflow")) {
      const { data: existingActions } = await supabase
        .from("incident_command_actions")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("incident_id", incident.id)
        .limit(1);

      if (!existingActions || existingActions.length === 0) {
        const rows = COMMAND_ACTIONS.map((actionType) => ({
          organization_id: organizationId,
          incident_id: incident.id,
          action_type: actionType,
          status: "pending",
        }));

        const { error: commandError } = await supabase
          .from("incident_command_actions")
          .insert(rows);

        if (commandError) throw commandError;
      }
    }

    await supabase.from("emergency_response_events").insert({
      vehicle_alert_id: alert.id,
      event_type: "autonomous_ai_operations",
      note: `Autonomous AI Operations Engine triggered actions: ${decision.actions.join(", ")}. Reasons: ${decision.reasons.join(" ")}`,
      created_by: null,
    });

    await supabase.from("command_center_notifications").insert({
      organization_id: organizationId,
      vehicle_id: alert.vehicle_id,
      title: "Autonomous AI Operations triggered",
      message: `Automated response started for ${alert.alert_type}. ${decision.reasons.join(" ")}`,
      severity: decision.riskLevel,
      is_read: false,
      is_resolved: false,
    });

    return NextResponse.json({
      success: true,
      acted: true,
      decision,
      incident,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Autonomous AI Operations failed." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
