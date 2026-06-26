import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function severityRank(severity?: string | null) {
  const value = String(severity || "").toLowerCase();
  if (value === "critical") return 4;
  if (value === "high") return 3;
  if (value === "medium") return 2;
  if (value === "low") return 1;
  return 0;
}

function formatType(value?: string | null) {
  return String(value || "event").replace(/_/g, " ");
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const since = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();

    const [alertsResult, incidentsResult, notificationsResult, etaResult] =
      await Promise.all([
        supabase
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
            vehicles (
              registration_number,
              nickname
            )
          `)
          .eq("organization_id", organizationId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(50),

        supabase
          .from("incidents")
          .select("id, incident_code, severity, status, summary, created_at, resolved_at")
          .eq("organization_id", organizationId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(30),

        supabase
          .from("command_center_notifications")
          .select("id, title, message, severity, type, created_at")
          .eq("organization_id", organizationId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(30),

        supabase
          .from("eta_predictions")
          .select("id, vehicle_id, trip_id, estimated_arrival, predicted_delay_minutes, confidence, recommendation, created_at")
          .eq("organization_id", organizationId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

    if (alertsResult.error) throw alertsResult.error;
    if (incidentsResult.error) throw incidentsResult.error;
    if (notificationsResult.error) throw notificationsResult.error;

    const alerts = alertsResult.data || [];
    const incidents = incidentsResult.data || [];
    const notifications = notificationsResult.data || [];
    const etaPredictions = etaResult.data || [];

    const criticalAlerts = alerts.filter((alert: any) => alert.severity === "critical");
    const highAlerts = alerts.filter((alert: any) => alert.severity === "high");
    const openIncidents = incidents.filter((incident: any) => incident.status !== "Resolved");
    const resolvedIncidents = incidents.filter((incident: any) => incident.status === "Resolved" || incident.resolved_at);

    const highestRiskAlert = [...alerts].sort((a: any, b: any) => {
      const scoreDiff = Number(b.intelligence_score || 0) - Number(a.intelligence_score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return severityRank(b.severity) - severityRank(a.severity);
    })[0];

    const worstEta = [...etaPredictions].sort(
      (a: any, b: any) => Number(b.predicted_delay_minutes || 0) - Number(a.predicted_delay_minutes || 0)
    )[0];

    let status = "Stable";
    if (criticalAlerts.length > 0 || openIncidents.some((i: any) => i.severity === "Critical")) {
      status = "Critical";
    } else if (highAlerts.length > 0 || openIncidents.length > 0) {
      status = "Elevated";
    }

    const storyParts = [
      `Operational status is ${status}.`,
      `${alerts.length} alert events were detected in the last 8 hours, including ${criticalAlerts.length} critical and ${highAlerts.length} high-risk alerts.`,
      `${incidents.length} incidents were opened or updated, with ${resolvedIncidents.length} resolved.`,
      `${notifications.length} command center notifications were generated.`,
    ];

    if (highestRiskAlert) {
      const vehicleRecord = Array.isArray(highestRiskAlert.vehicles)
        ? highestRiskAlert.vehicles[0]
        : highestRiskAlert.vehicles;

      const vehicleName =
        vehicleRecord?.registration_number ||
        vehicleRecord?.nickname ||
        "an affected vehicle";

      storyParts.push(
        `Highest-risk event was ${formatType(highestRiskAlert.alert_type)} for ${vehicleName}, with AI score ${highestRiskAlert.intelligence_score || 0}/100.`
      );
    }

    if (worstEta) {
      storyParts.push(
        `Worst ETA impact was a predicted delay of ${worstEta.predicted_delay_minutes || 0} minutes with ${worstEta.confidence || 0}% confidence.`
      );
    }

    const recommendations: string[] = [];

    if (criticalAlerts.length > 0) {
      recommendations.push("Prioritize unresolved critical alerts and confirm dispatcher ownership.");
    }

    if (openIncidents.length > 0) {
      recommendations.push("Review open incidents and update response notes before shift handover.");
    }

    if (worstEta && Number(worstEta.predicted_delay_minutes || 0) >= 15) {
      recommendations.push("Review delayed trips and consider rerouting or notifying affected customers.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Continue routine monitoring. No major operational escalation detected.");
    }

    const timeline = [
      ...alerts.map((alert: any) => ({
        id: `alert-${alert.id}`,
        time: alert.created_at,
        type: "alert",
        severity: alert.severity,
        title: formatType(alert.alert_type),
        description: alert.message || "Vehicle alert detected.",
      })),
      ...incidents.map((incident: any) => ({
        id: `incident-${incident.id}`,
        time: incident.created_at,
        type: "incident",
        severity: incident.severity,
        title: incident.incident_code || "Incident",
        description: incident.summary || "Incident recorded.",
      })),
      ...notifications.map((notification: any) => ({
        id: `notification-${notification.id}`,
        time: notification.created_at,
        type: "notification",
        severity: notification.severity,
        title: notification.title,
        description: notification.message,
      })),
      ...etaPredictions.map((eta: any) => ({
        id: `eta-${eta.id}`,
        time: eta.created_at,
        type: "eta",
        severity: Number(eta.predicted_delay_minutes || 0) >= 20 ? "high" : "medium",
        title: "Predictive ETA update",
        description: `${eta.predicted_delay_minutes || 0} minute predicted delay. ${eta.recommendation || ""}`,
      })),
    ]
      .filter((event: any) => event.time)
      .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 25);

    return NextResponse.json({
      success: true,
      story: {
        status,
        narrative: storyParts.join(" "),
        recommendations,
        counts: {
          alerts: alerts.length,
          criticalAlerts: criticalAlerts.length,
          highAlerts: highAlerts.length,
          incidents: incidents.length,
          openIncidents: openIncidents.length,
          resolvedIncidents: resolvedIncidents.length,
          notifications: notifications.length,
          etaPredictions: etaPredictions.length,
        },
        timeline,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate operational story." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
