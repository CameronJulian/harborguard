import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function eventTime(value?: string | null) {
  return value || new Date().toISOString();
}

function formatType(value?: string | null) {
  return String(value || "event").replace(/_/g, " ");
}

function vehicleName(record: any) {
  const vehicle = Array.isArray(record?.vehicles) ? record.vehicles[0] : record?.vehicles;

  return (
    vehicle?.registration_number ||
    vehicle?.nickname ||
    record?.vehicle_id ||
    "Unknown vehicle"
  );
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      assignmentsResult,
      escalationsResult,
      alertsResult,
      incidentsResult,
      notificationsResult,
      etaResult,
    ] = await Promise.all([
      supabase
        .from("route_assignments")
        .select("id, vehicle_id, status, route_data, created_at, acknowledged_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30),

      supabase
        .from("route_safety_escalation_logs")
        .select("id, vehicle_id, risk_score, risk_level, auto_escalated, duplicate_detected, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30),

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
        .limit(40),

      supabase
        .from("incidents")
        .select("id, incident_code, severity, status, summary, created_at, resolved_at")
        .eq("organization_id", organizationId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30),

      supabase
        .from("command_center_notifications")
        .select("id, vehicle_id, title, message, severity, type, created_at")
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

    if (assignmentsResult.error) throw assignmentsResult.error;
    if (escalationsResult.error) throw escalationsResult.error;
    if (alertsResult.error) throw alertsResult.error;
    if (incidentsResult.error) throw incidentsResult.error;
    if (notificationsResult.error) throw notificationsResult.error;

    const events = [
      ...(assignmentsResult.data || []).map((assignment: any) => ({
        id: `route-assignment-${assignment.id}`,
        type: "route_assignment",
        category: "Dispatch",
        severity: assignment.status === "pending" ? "high" : "low",
        title:
          assignment.status === "acknowledged"
            ? "Driver acknowledged safer route"
            : "Safer route assigned",
        detail:
          assignment.route_data?.label ||
          assignment.route_data?.description ||
          assignment.route_data?.reason ||
          "Route assignment updated.",
        vehicleId: assignment.vehicle_id,
        createdAt: eventTime(assignment.acknowledged_at || assignment.created_at),
      })),

      ...(escalationsResult.data || []).map((log: any) => ({
        id: `route-escalation-${log.id}`,
        type: "route_escalation",
        category: "Route Safety",
        severity: log.risk_level === "CRITICAL" ? "critical" : "high",
        title: "Route safety escalation",
        detail: `Risk ${log.risk_score}/100 - ${log.risk_level}${
          log.duplicate_detected ? " - duplicate alert skipped" : ""
        }`,
        vehicleId: log.vehicle_id,
        createdAt: eventTime(log.created_at),
      })),

      ...(alertsResult.data || []).map((alert: any) => ({
        id: `alert-${alert.id}`,
        type: "vehicle_alert",
        category: "AI Alert",
        severity: alert.severity || "medium",
        title: `${formatType(alert.alert_type)} - ${vehicleName(alert)}`,
        detail:
          `${alert.message || "Vehicle alert detected."} AI score: ${
            alert.intelligence_score || 0
          }/100. Risk: ${alert.behavioral_risk || "unknown"}.`,
        vehicleId: alert.vehicle_id,
        createdAt: eventTime(alert.created_at),
      })),

      ...(incidentsResult.data || []).map((incident: any) => ({
        id: `incident-${incident.id}`,
        type: "incident",
        category: "Incident",
        severity:
          incident.severity === "Critical"
            ? "critical"
            : incident.severity === "High"
            ? "high"
            : "medium",
        title: `${incident.incident_code || "Incident"} - ${incident.status || "Open"}`,
        detail: incident.summary || "Incident recorded.",
        vehicleId: null,
        createdAt: eventTime(incident.resolved_at || incident.created_at),
      })),

      ...(notificationsResult.data || []).map((notification: any) => ({
        id: `notification-${notification.id}`,
        type: "notification",
        category: "Notification",
        severity: notification.severity || "medium",
        title: notification.title || "Command Center notification",
        detail: notification.message || "Notification generated.",
        vehicleId: notification.vehicle_id,
        createdAt: eventTime(notification.created_at),
      })),

      ...((etaResult.data || []) as any[]).map((eta: any) => ({
        id: `eta-${eta.id}`,
        type: "predictive_eta",
        category: "Predictive ETA",
        severity: Number(eta.predicted_delay_minutes || 0) >= 20 ? "high" : "medium",
        title: "Predictive ETA update",
        detail: `${eta.predicted_delay_minutes || 0} minute predicted delay. Confidence ${
          eta.confidence || 0
        }%. ${eta.recommendation || ""}`,
        vehicleId: eta.vehicle_id,
        createdAt: eventTime(eta.created_at),
      })),
    ]
      .filter((event: any) => event.createdAt)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 40);

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load operations timeline." },
      { status: 500 }
    );
  }
}
