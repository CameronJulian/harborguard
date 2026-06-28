import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function priorityRank(priority: string) {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function buildAlertTask(alert: any) {
  const severity = String(alert.severity || "medium").toLowerCase();
  const vehicle = alert.vehicle || {};
  const registration = vehicle.registration_number || alert.vehicle_id || "Unknown vehicle";
  const alertType = String(alert.alert_type || "alert").replace(/_/g, " ");

  return {
    id: `alert-${alert.id}`,
    sourceId: alert.id,
    sourceType: "vehicle_alert",
    priority: severity === "critical" ? "critical" : severity === "high" ? "high" : "medium",
    status: "open",
    title: `${registration}: ${alertType}`,
    detail: alert.message || "Vehicle alert requires dispatcher review.",
    vehicleId: alert.vehicle_id,
    vehicleName: registration,
    driverName: vehicle.driver_name || null,
    recommendedAction:
      severity === "critical"
        ? "Contact driver immediately and escalate response."
        : severity === "high"
        ? "Review vehicle position and prepare reroute or escalation."
        : "Monitor alert and confirm whether intervention is required.",
    createdAt: alert.created_at,
  };
}

function buildIncidentTask(incident: any) {
  const severity = String(incident.severity || "medium").toLowerCase();

  return {
    id: `incident-${incident.id}`,
    sourceId: incident.id,
    sourceType: "incident",
    priority: severity === "critical" ? "critical" : severity === "high" ? "high" : "medium",
    status: incident.status || "open",
    title: incident.summary || "Open incident",
    detail: "Incident workflow requires dispatcher confirmation.",
    vehicleId: incident.vehicle_id || null,
    vehicleName: incident.vehicle?.registration_number || null,
    driverName: incident.vehicle?.driver_name || null,
    recommendedAction: "Review incident command workflow and confirm next action.",
    createdAt: incident.created_at,
  };
}

function buildRoadTask(incident: any) {
  const severity = String(incident.severity || "medium").toLowerCase();
  const type = String(incident.type || "road threat").replace(/_/g, " ");

  return {
    id: `road-${incident.id}`,
    sourceId: incident.id,
    sourceType: "road_incident",
    priority: severity === "critical" ? "critical" : severity === "high" ? "high" : "medium",
    status: "open",
    title: `${type}: ${incident.title || "Road intelligence threat"}`,
    detail: "Active road intelligence may affect fleet routing.",
    vehicleId: null,
    vehicleName: null,
    driverName: null,
    recommendedAction: "Review affected corridor and reroute nearby vehicles if required.",
    createdAt: incident.created_at || new Date().toISOString(),
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
        created_at,
        vehicle:vehicles (
          registration_number,
          driver_name
        )
      `)
      .eq("organization_id", organizationId)
      .eq("is_resolved", false)
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
        created_at,
        vehicle_id,
        vehicle:vehicles (
          registration_number,
          driver_name
        )
      `)
      .eq("organization_id", organizationId)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(20);

    if (incidentsError) {
      return NextResponse.json({ error: incidentsError.message }, { status: 500 });
    }

    const { data: roadIncidents, error: roadError } = await supabase
      .from("road_incidents")
      .select("id, title, type, severity, created_at")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .in("severity", ["critical", "high"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (roadError) {
      return NextResponse.json({ error: roadError.message }, { status: 500 });
    }

    const tasks = [
      ...(alerts || []).map(buildAlertTask),
      ...(incidents || []).map(buildIncidentTask),
      ...(roadIncidents || []).map(buildRoadTask),
    ]
      .sort((a, b) => {
        const priorityDiff = priorityRank(b.priority) - priorityRank(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 20);

    return NextResponse.json({
      success: true,
      count: tasks.length,
      tasks,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load Fleet Mission Queue." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
