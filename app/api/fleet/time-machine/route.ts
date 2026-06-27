import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function toIsoOrDefault(value: string | null, fallback: Date) {
  if (!value) return fallback.toISOString();

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallback.toISOString();
  }

  return parsed.toISOString();
}

function eventTime(value?: string | null) {
  return value || new Date().toISOString();
}

function label(value?: string | null) {
  return String(value || "event").replace(/_/g, " ");
}

export async function GET(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const { searchParams } = new URL(req.url);

    const now = new Date();
    const defaultStart = new Date(now.getTime() - 60 * 60 * 1000);

    const start = toIsoOrDefault(searchParams.get("start"), defaultStart);
    const end = toIsoOrDefault(searchParams.get("end"), now);

    const [
      locationsResult,
      alertsResult,
      incidentsResult,
      notificationsResult,
      routeAssignmentsResult,
      commandActionsResult,
    ] = await Promise.all([
      supabase
        .from("vehicle_locations")
        .select(`
          id,
          vehicle_id,
          latitude,
          longitude,
          speed_kmh,
          heading,
          recorded_at,
          vehicles (
            registration_number,
            nickname
          )
        `)
        .eq("organization_id", organizationId)
        .gte("recorded_at", start)
        .lte("recorded_at", end)
        .order("recorded_at", { ascending: true })
        .limit(2500),

      supabase
        .from("vehicle_alerts")
        .select("id, vehicle_id, alert_type, severity, message, intelligence_score, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true })
        .limit(300),

      supabase
        .from("incidents")
        .select("id, incident_code, severity, status, summary, created_at, vehicle_alert_id")
        .eq("organization_id", organizationId)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true })
        .limit(200),

      supabase
        .from("command_center_notifications")
        .select("id, vehicle_id, title, message, severity, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true })
        .limit(300),

      supabase
        .from("route_assignments")
        .select("id, vehicle_id, status, route_data, created_at, acknowledged_at")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true })
        .limit(200),

      supabase
        .from("incident_command_actions")
        .select("id, incident_id, action_type, status, completed_at, created_at, updated_at")
        .eq("organization_id", organizationId)
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: true })
        .limit(300),
    ]);

    if (locationsResult.error) throw locationsResult.error;
    if (alertsResult.error) throw alertsResult.error;
    if (incidentsResult.error) throw incidentsResult.error;
    if (notificationsResult.error) throw notificationsResult.error;
    if (routeAssignmentsResult.error) throw routeAssignmentsResult.error;
    if (commandActionsResult.error) throw commandActionsResult.error;

    const locations = locationsResult.data || [];
    const alerts = alertsResult.data || [];
    const incidents = incidentsResult.data || [];
    const notifications = notificationsResult.data || [];
    const routeAssignments = routeAssignmentsResult.data || [];
    const commandActions = commandActionsResult.data || [];

    const vehicleTracks = new Map<string, any>();

    for (const point of locations as any[]) {
      const vehicleRecord = Array.isArray(point.vehicles)
        ? point.vehicles[0]
        : point.vehicles;

      const current = vehicleTracks.get(point.vehicle_id) || {
        vehicleId: point.vehicle_id,
        registrationNumber:
          vehicleRecord?.registration_number ||
          vehicleRecord?.nickname ||
          "Unknown vehicle",
        points: [],
      };

      current.points.push({
        id: point.id,
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        speedKmh: Number(point.speed_kmh || 0),
        heading: Number(point.heading || 0),
        recordedAt: point.recorded_at,
      });

      vehicleTracks.set(point.vehicle_id, current);
    }

    const alertEvents = alerts.map((alert: any) => ({
      id: `alert-${alert.id}`,
      type: "alert",
      vehicleId: alert.vehicle_id,
      severity: alert.severity || "medium",
      title: label(alert.alert_type),
      detail: `${alert.message || "Alert generated."} AI score ${alert.intelligence_score || 0}/100.`,
      createdAt: eventTime(alert.created_at),
    }));

    const incidentEvents = incidents.map((incident: any) => ({
      id: `incident-${incident.id}`,
      type: "incident",
      vehicleId: null,
      severity: String(incident.severity || "medium").toLowerCase(),
      title: incident.incident_code || "Incident opened",
      detail: incident.summary || "Incident recorded.",
      createdAt: eventTime(incident.created_at),
    }));

    const notificationEvents = notifications.map((item: any) => ({
      id: `notification-${item.id}`,
      type: "notification",
      vehicleId: item.vehicle_id,
      severity: item.severity || "medium",
      title: item.title || "Command notification",
      detail: item.message || "Notification generated.",
      createdAt: eventTime(item.created_at),
    }));

    const routeEvents = routeAssignments.map((item: any) => ({
      id: `route-${item.id}`,
      type: "route_assignment",
      vehicleId: item.vehicle_id,
      severity: item.status === "acknowledged" ? "low" : "medium",
      title: item.status === "acknowledged" ? "Driver acknowledged route" : "Route assigned",
      detail:
        item.route_data?.label ||
        item.route_data?.description ||
        item.route_data?.reason ||
        "Route assignment recorded.",
      createdAt: eventTime(item.acknowledged_at || item.created_at),
    }));

    const commandEvents = commandActions.map((item: any) => ({
      id: `command-${item.id}`,
      type: "incident_command",
      vehicleId: null,
      severity: item.status === "completed" ? "low" : "medium",
      title: label(item.action_type),
      detail: `Incident command action ${item.status}.`,
      createdAt: eventTime(item.completed_at || item.updated_at || item.created_at),
    }));

    const events = [
      ...alertEvents,
      ...incidentEvents,
      ...notificationEvents,
      ...routeEvents,
      ...commandEvents,
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const highRiskEvents = events.filter((event) =>
      ["critical", "high"].includes(String(event.severity).toLowerCase())
    );

    return NextResponse.json({
      success: true,
      timeMachine: {
        window: { start, end },
        vehicleCount: vehicleTracks.size,
        pointCount: locations.length,
        eventCount: events.length,
        highRiskEventCount: highRiskEvents.length,
        tracks: Array.from(vehicleTracks.values()),
        events,
        summary:
          highRiskEvents.length > 0
            ? `Fleet playback found ${highRiskEvents.length} high-risk event(s) in the selected window.`
            : "Fleet playback window appears operationally stable.",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load Fleet Time Machine." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
