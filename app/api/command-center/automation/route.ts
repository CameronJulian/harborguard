import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { evaluateAutonomousOperation } from "@/lib/operations/autonomous-engine";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: alerts, error } = await supabase
      .from("vehicle_alerts")
      .select(`
        id,
        alert_type,
        severity,
        message,
        intelligence_score,
        behavioral_risk,
        created_at,
        vehicle:vehicles (
          registration_number
        )
      `)
      .eq("organization_id", organizationId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const evaluations = (alerts || []).map((alert: any) => {
      const evaluation = evaluateAutonomousOperation({
        alertType: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        intelligenceScore: alert.intelligence_score,
        behavioralRisk: alert.behavioral_risk,
      });

      return {
        alertId: alert.id,
        vehicleName:
          alert.vehicle?.registration_number || "Unknown vehicle",
        driverName: null,
        alertType: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        createdAt: alert.created_at,
        evaluation,
      };
    });

    const actionable = evaluations.filter((item: any) => item.evaluation.shouldAct);

    const actionCounts = actionable.reduce((acc: Record<string, number>, item: any) => {
      for (const action of item.evaluation.actions || []) {
        acc[action] = (acc[action] || 0) + 1;
      }
      return acc;
    }, {});

    const rules = [
      {
        id: "panic-response",
        name: "Panic / SOS Response",
        trigger: "alert_type contains panic or sos",
        actions: ["create_incident", "start_command_workflow", "notify_dispatcher"],
        status: actionCounts.create_incident ? "active" : "watching",
        matches: actionCounts.create_incident || 0,
      },
      {
        id: "critical-alert-escalation",
        name: "Critical Alert Escalation",
        trigger: "severity equals critical",
        actions: ["notify_dispatcher", "escalate_supervisor", "start_command_workflow"],
        status: actionCounts.escalate_supervisor ? "active" : "watching",
        matches: actionCounts.escalate_supervisor || 0,
      },
      {
        id: "high-risk-route-review",
        name: "High Risk Route Review",
        trigger: "high intelligence score or high behavioral risk",
        actions: ["recommend_reroute", "monitor_vehicle", "notify_dispatcher"],
        status: actionCounts.recommend_reroute ? "active" : "watching",
        matches: actionCounts.recommend_reroute || 0,
      },
      {
        id: "driver-safety-check",
        name: "Driver Safety Check",
        trigger: "critical or high operational risk",
        actions: ["contact_driver", "verify_location", "monitor_escalation"],
        status: actionCounts.contact_driver ? "active" : "watching",
        matches: actionCounts.contact_driver || 0,
      },
    ];

    return NextResponse.json({
      success: true,
      rules,
      evaluations,
      actionable,
      summary: {
        totalAlerts: alerts?.length || 0,
        actionableAlerts: actionable.length,
        activeRules: rules.filter((rule) => rule.status === "active").length,
        actionCounts,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load automation rules." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}


