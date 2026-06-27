import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

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
    const incidentId = searchParams.get("incidentId");

    if (!incidentId) {
      const { data, error } = await supabase
        .from("incidents")
        .select("id, incident_code, severity, status, summary, created_at")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        incidents: data || [],
      });
    }

    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", incidentId)
      .single();

    if (incidentError) throw incidentError;

    const alertId = incident.vehicle_alert_id || null;

    const { data: alert } = alertId
      ? await supabase
          .from("vehicle_alerts")
          .select("*")
          .eq("organization_id", organizationId)
          .eq("id", alertId)
          .single()
      : { data: null };

    const vehicleId = alert?.vehicle_id || incident.vehicle_id || null;

    const centerTime = new Date(
      alert?.created_at || incident.created_at || Date.now()
    ).getTime();

    const start = new Date(centerTime - 60 * 60 * 1000).toISOString();
    const end = new Date(centerTime + 60 * 60 * 1000).toISOString();

    const [
      locationsResult,
      alertsResult,
      commandActionsResult,
      responseEventsResult,
      notificationsResult,
      routeAssignmentsResult,
    ] = await Promise.all([
      vehicleId
        ? supabase
            .from("vehicle_locations")
            .select("id, vehicle_id, latitude, longitude, speed_kmh, heading, recorded_at")
            .eq("organization_id", organizationId)
            .eq("vehicle_id", vehicleId)
            .gte("recorded_at", start)
            .lte("recorded_at", end)
            .order("recorded_at", { ascending: true })
            .limit(200)
        : Promise.resolve({ data: [], error: null }),

      vehicleId
        ? supabase
            .from("vehicle_alerts")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("vehicle_id", vehicleId)
            .gte("created_at", start)
            .lte("created_at", end)
            .order("created_at", { ascending: true })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),

      supabase
        .from("incident_command_actions")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: true }),

      alertId
        ? supabase
            .from("emergency_response_events")
            .select("*")
            .eq("vehicle_alert_id", alertId)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),

      vehicleId
        ? supabase
            .from("command_center_notifications")
            .select("*")
            .eq("organization_id", organizationId)
            .eq("vehicle_id", vehicleId)
            .gte("created_at", start)
            .lte("created_at", end)
            .order("created_at", { ascending: true })
            .limit(50)
        : Promise.resolve({ data: [], error: null }),

      vehicleId
        ? supabase
            .from("route_assignments")
            .select("*")
            .eq("vehicle_id", vehicleId)
            .gte("created_at", start)
            .lte("created_at", end)
            .order("created_at", { ascending: true })
            .limit(30)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (locationsResult.error) throw locationsResult.error;
    if (alertsResult.error) throw alertsResult.error;
    if (commandActionsResult.error) throw commandActionsResult.error;
    if (responseEventsResult.error) throw responseEventsResult.error;
    if (notificationsResult.error) throw notificationsResult.error;
    if (routeAssignmentsResult.error) throw routeAssignmentsResult.error;

    const locationEvents = (locationsResult.data || [])
      .filter((point: any, index: number) => index === 0 || index % 10 === 0)
      .map((point: any) => ({
        id: `location-${point.id}`,
        type: "telemetry",
        category: "Vehicle Movement",
        severity: Number(point.speed_kmh || 0) > 110 ? "high" : "low",
        title: Number(point.speed_kmh || 0) > 110 ? "High speed detected" : "Vehicle telemetry recorded",
        detail: `Speed ${point.speed_kmh || 0} km/h. Heading ${point.heading || 0}.`,
        createdAt: eventTime(point.recorded_at),
      }));

    const alertEvents = (alertsResult.data || []).map((item: any) => ({
      id: `alert-${item.id}`,
      type: "alert",
      category: "AI Alert",
      severity: item.severity || "medium",
      title: label(item.alert_type),
      detail: `${item.message || "Alert generated."} AI score ${item.intelligence_score || 0}/100.`,
      createdAt: eventTime(item.created_at),
    }));

    const commandEvents = (commandActionsResult.data || []).map((item: any) => ({
      id: `command-${item.id}`,
      type: "command_action",
      category: "Incident Command",
      severity: item.status === "completed" ? "low" : "medium",
      title: label(item.action_type),
      detail: `Status: ${item.status}${item.note ? `. ${item.note}` : ""}`,
      createdAt: eventTime(item.completed_at || item.updated_at || item.created_at),
    }));

    const responseEvents = (responseEventsResult.data || []).map((item: any) => ({
      id: `response-${item.id}`,
      type: "response_event",
      category: "Emergency Response",
      severity: "high",
      title: label(item.event_type),
      detail: item.note || "Emergency response event recorded.",
      createdAt: eventTime(item.created_at),
    }));

    const notificationEvents = (notificationsResult.data || []).map((item: any) => ({
      id: `notification-${item.id}`,
      type: "notification",
      category: "Command Notification",
      severity: item.severity || "medium",
      title: item.title || "Command Center notification",
      detail: item.message || "Notification generated.",
      createdAt: eventTime(item.created_at),
    }));

    const routeEvents = (routeAssignmentsResult.data || []).map((item: any) => ({
      id: `route-${item.id}`,
      type: "route_assignment",
      category: "Route Action",
      severity: item.status === "acknowledged" ? "low" : "medium",
      title: item.status === "acknowledged" ? "Driver acknowledged route" : "Safer route assigned",
      detail:
        item.route_data?.label ||
        item.route_data?.description ||
        item.route_data?.reason ||
        "Route assignment recorded.",
      createdAt: eventTime(item.acknowledged_at || item.created_at),
    }));

    const incidentEvent = {
      id: `incident-${incident.id}`,
      type: "incident",
      category: "Incident",
      severity: String(incident.severity || "medium").toLowerCase(),
      title: incident.incident_code || "Incident created",
      detail: incident.summary || "Incident recorded.",
      createdAt: eventTime(incident.created_at),
    };

    const timeline = [
      incidentEvent,
      ...locationEvents,
      ...alertEvents,
      ...commandEvents,
      ...responseEvents,
      ...notificationEvents,
      ...routeEvents,
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const criticalEvents = timeline.filter((event) =>
      ["critical", "high"].includes(String(event.severity).toLowerCase())
    );

    const investigationSummary =
      criticalEvents.length > 0
        ? `Investigation found ${criticalEvents.length} high-risk event(s) around this incident. Review alerts, route actions, and command workflow timestamps.`
        : "Investigation timeline shows no high-risk supporting events in the selected incident window.";

    return NextResponse.json({
      success: true,
      investigation: {
        incident,
        vehicleId,
        window: { start, end },
        summary: investigationSummary,
        eventCount: timeline.length,
        criticalEventCount: criticalEvents.length,
        timeline,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load incident investigation timeline." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
