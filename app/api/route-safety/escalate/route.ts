import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, requireRole } from "@/lib/server-auth";

type EscalateBody = {
  vehicleId?: string;
  tripId?: string | null;
  alertId?: string;
  riskScore?: number;
  riskLevel?: string;
  message?: string;
};

function getBaseUrl(req: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${req.nextUrl.protocol}//${req.nextUrl.host}`
  );
}

function normalizeSeverity(riskLevel?: string, riskScore?: number) {
  const score = Number(riskScore || 0);
  const level = String(riskLevel || "").toUpperCase();

  if (level === "CRITICAL" || score >= 80) return "critical";
  if (level === "HIGH" || score >= 60) return "high";
  if (level === "MEDIUM" || score >= 35) return "medium";

  return "low";
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, organizationId, role } = await requireOrganization();

    requireRole(role, ["owner", "admin", "operator"]);

    const body = (await req.json()) as EscalateBody;

    const vehicleId = body.vehicleId;
    const tripId = body.tripId || null;
    const routeAlertId = body.alertId;
    const severity = normalizeSeverity(body.riskLevel, body.riskScore);

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId is required." },
        { status: 400 }
      );
    }

    if (!routeAlertId) {
      return NextResponse.json(
        { error: "alertId is required." },
        { status: 400 }
      );
    }

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("id, registration_number, nickname, organization_id")
      .eq("id", vehicleId)
      .eq("organization_id", organizationId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: vehicleError?.message || "Vehicle not found." },
        { status: 404 }
      );
    }

    const { data: routeAlert, error: routeAlertError } = await supabase
      .from("route_safety_alerts")
      .select("*")
      .eq("id", routeAlertId)
      .eq("organization_id", organizationId)
      .single();

    if (routeAlertError || !routeAlert) {
      return NextResponse.json(
        { error: routeAlertError?.message || "Route safety alert not found." },
        { status: 404 }
      );
    }

    const vehicleName =
      vehicle.nickname || vehicle.registration_number || "Unknown vehicle";

    const baseMessage =
      body.message ||
      `Route safety escalation for ${vehicleName}: ${routeAlert.title}. Risk score ${body.riskScore || 0}/100.`;

    const message = `${baseMessage} Route safety alert ID: ${routeAlertId}.`;

    const { data: existingOpenAlert } = await supabase
      .from("vehicle_alerts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("vehicle_id", vehicleId)
      .eq("alert_type", "route_safety_threat")
      .eq("is_resolved", false)
      .ilike("message", `%Route safety alert ID: ${routeAlertId}%`)
      .maybeSingle();

    if (existingOpenAlert) {
      return NextResponse.json({
        success: true,
        skipped: "duplicate_open_alert",
        alertId: existingOpenAlert.id,
      });
    }

    const { data: insertedAlert, error: alertError } = await supabase
      .from("vehicle_alerts")
      .insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        trip_id: tripId,
        alert_type: "route_safety_threat",
        severity,
        message,
        is_resolved: false,
      })
      .select("id")
      .single();

    if (alertError) {
      console.error("ROUTE SAFETY ESCALATE vehicle_alerts insert failed:", alertError);
      return NextResponse.json({ error: alertError.message, details: alertError }, { status: 500 });
    }

    const { data: insertedIncident, error: incidentError } = await supabase
      .from("incidents")
      .insert({
        organization_id: organizationId,
        incident_code: `INC-${Date.now()}`,
        severity:
          severity === "critical"
            ? "Critical"
            : severity === "high"
            ? "High"
            : severity === "medium"
            ? "Medium"
            : "Low",
        status: "Open",
        summary: `${message} Route alert type: ${routeAlert.type}. Location: ${routeAlert.latitude}, ${routeAlert.longitude}.`,
        vehicle_alert_id: insertedAlert.id,
      })
      .select("id, incident_code")
      .single();

    if (incidentError) {
      console.error("ROUTE SAFETY ESCALATE incidents insert failed:", incidentError);
      return NextResponse.json({ error: incidentError.message, details: incidentError }, { status: 500 });
    }

    try {
      await fetch(`${getBaseUrl(req)}/api/fleet/notify-alert`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vehicleId,
          tripId,
          alertType: "route_safety_threat",
          severity,
          message,
        }),
      });
    } catch (notifyError) {
      console.error("Route safety notify-alert failed:", notifyError);
    }

    return NextResponse.json({
      success: true,
      alertId: insertedAlert.id,
      incidentId: insertedIncident.id,
      incidentCode: insertedIncident.incident_code,
      severity,
    });
  } catch (error: any) {
    console.error("ROUTE SAFETY ESCALATE unexpected error:", error);
    return NextResponse.json(
      { error: error.message || "Route safety escalation failed." },
      { status: error.message === "Permission denied" ? 403 : 500 }
    );
  }
}



