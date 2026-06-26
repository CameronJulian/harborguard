import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function shiftWindow() {
  const end = new Date();
  const start = new Date(end.getTime() - 8 * 60 * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const window = shiftWindow();

    const [
      vehiclesResult,
      alertsResult,
      incidentsResult,
      tripsResult,
      notificationsResult,
    ] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, nickname, registration_number")
        .eq("organization_id", organizationId),

      supabase
        .from("vehicle_alerts")
        .select("id, vehicle_id, alert_type, severity, message, intelligence_score, behavioral_risk, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", window.start)
        .lte("created_at", window.end)
        .order("created_at", { ascending: false }),

      supabase
        .from("incidents")
        .select("id, incident_code, severity, status, summary, created_at, resolved_at")
        .eq("organization_id", organizationId)
        .gte("created_at", window.start)
        .lte("created_at", window.end)
        .order("created_at", { ascending: false }),

      supabase
        .from("vehicle_trips")
        .select("id, status, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", window.start)
        .lte("created_at", window.end),

      supabase
        .from("command_center_notifications")
        .select("id, severity, type, title, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", window.start)
        .lte("created_at", window.end),
    ]);

    if (vehiclesResult.error) throw vehiclesResult.error;
    if (alertsResult.error) throw alertsResult.error;
    if (incidentsResult.error) throw incidentsResult.error;
    if (tripsResult.error) throw tripsResult.error;
    if (notificationsResult.error) throw notificationsResult.error;

    const vehicles = vehiclesResult.data || [];
    const alerts = alertsResult.data || [];
    const incidents = incidentsResult.data || [];
    const trips = tripsResult.data || [];
    const notifications = notificationsResult.data || [];

    const criticalAlerts = alerts.filter((a: any) => a.severity === "critical");
    const highAlerts = alerts.filter((a: any) => a.severity === "high");
    const sosAlerts = alerts.filter((a: any) => String(a.alert_type || "").includes("panic"));
    const openedIncidents = incidents.filter((i: any) => i.status !== "Resolved");
    const resolvedIncidents = incidents.filter((i: any) => i.status === "Resolved" || i.resolved_at);
    const completedTrips = trips.filter((t: any) =>
      ["completed", "closed", "finished"].includes(String(t.status || "").toLowerCase())
    );

    const highestRiskAlert = [...alerts].sort(
      (a: any, b: any) => Number(b.intelligence_score || 0) - Number(a.intelligence_score || 0)
    )[0];

    const alertTypeCounts = alerts.reduce((acc: Record<string, number>, alert: any) => {
      const key = alert.alert_type || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topAlertType =
      Object.entries(alertTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";

    let operationalStatus = "Stable";
    if (criticalAlerts.length > 0 || sosAlerts.length > 0) operationalStatus = "Critical";
    else if (highAlerts.length > 0 || openedIncidents.length > 0) operationalStatus = "Elevated";

    const summary =
      `Shift status: ${operationalStatus}. ` +
      `${vehicles.length} vehicles monitored. ` +
      `${alerts.length} alerts recorded, including ${criticalAlerts.length} critical and ${highAlerts.length} high-risk alerts. ` +
      `${incidents.length} incidents were opened or updated, with ${resolvedIncidents.length} resolved. ` +
      `${completedTrips.length} trips were completed. ` +
      `Top operational pattern: ${topAlertType}. ` +
      (highestRiskAlert
        ? `Highest-risk event: ${highestRiskAlert.alert_type} with AI score ${highestRiskAlert.intelligence_score || 0}/100.`
        : "No high-risk event was detected.");

    const recommendations: string[] = [];

    if (sosAlerts.length > 0) {
      recommendations.push("Review all SOS events and confirm response actions were completed.");
    }

    if (criticalAlerts.length > 0) {
      recommendations.push("Prioritize handover of unresolved critical alerts to the next dispatcher.");
    }

    if (topAlertType.includes("geofence")) {
      recommendations.push("Review geofence breaches and confirm whether routes or zones need adjustment.");
    }

    if (topAlertType.includes("offline")) {
      recommendations.push("Investigate tracker connectivity issues and verify last known vehicle locations.");
    }

    if (recommendations.length === 0) {
      recommendations.push("Continue routine monitoring. No major operational escalation detected.");
    }

    return NextResponse.json({
      success: true,
      window,
      shiftSummary: {
        operationalStatus,
        summary,
        vehiclesMonitored: vehicles.length,
        alertsTotal: alerts.length,
        criticalAlerts: criticalAlerts.length,
        highAlerts: highAlerts.length,
        sosAlerts: sosAlerts.length,
        incidentsTotal: incidents.length,
        openIncidents: openedIncidents.length,
        resolvedIncidents: resolvedIncidents.length,
        tripsTotal: trips.length,
        completedTrips: completedTrips.length,
        notificationsTotal: notifications.length,
        topAlertType,
        highestRiskAlert: highestRiskAlert
          ? {
              id: highestRiskAlert.id,
              alertType: highestRiskAlert.alert_type,
              severity: highestRiskAlert.severity,
              message: highestRiskAlert.message,
              intelligenceScore: highestRiskAlert.intelligence_score,
              behavioralRisk: highestRiskAlert.behavioral_risk,
              createdAt: highestRiskAlert.created_at,
            }
          : null,
        recommendations,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to generate shift summary." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
