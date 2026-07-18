import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { requireOrganization, requireRole } from "@/lib/server-auth";
import { createCommandCenterNotification } from "@/lib/command-center/notifications";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:cameron@healthsystems.co.za",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

type EscalateBody = {
  vehicleId?: string;
  tripId?: string | null;
  alertId?: string;
  riskScore?: number;
  riskLevel?: string;
  message?: string;
};

function normalizeSeverity(riskLevel?: string, riskScore?: number) {
  const score = Number(riskScore || 0);
  const level = String(riskLevel || "").toUpperCase();

  if (level === "CRITICAL" || score >= 80) return "critical";
  if (level === "HIGH" || score >= 60) return "high";
  if (level === "MEDIUM" || score >= 35) return "medium";

  return "low";
}

async function sendRouteSafetyPush(
  supabase: any,
  organizationId: string,
  message: string
) {
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh_key, auth_key")
    .eq("organization_id", organizationId)
    .eq("is_active", true);

  if (error) {
    console.error("Route safety push subscription lookup failed:", error);
    return;
  }

  if (!subscriptions || subscriptions.length === 0) return;

  await Promise.all(
    subscriptions.map(async (subscription: any) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key,
            },
          },
          JSON.stringify({
            title: "HarborGuard Route Threat",
            body: message,
            icon: "/icon.png",
            url: "/command-center",
          })
        );
      } catch (pushError: any) {
        console.error("Route safety push send failed:", pushError);

        if (pushError?.statusCode === 404 || pushError?.statusCode === 410) {
          await supabase
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("id", subscription.id);
        }
      }
    })
  );
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
      return NextResponse.json({ error: "vehicleId is required." }, { status: 400 });
    }

    if (!routeAlertId) {
      return NextResponse.json({ error: "alertId is required." }, { status: 400 });
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

    const message =
      body.message ||
      `Route safety escalation for ${vehicleName}: ${routeAlert.title}. Risk score ${body.riskScore || 0}/100. Route safety alert ID: ${routeAlertId}.`;

    const { data: existingOpenAlert } = await supabase
      .from("vehicle_alerts")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("vehicle_id", vehicleId)
      .eq("alert_type", "route_safety_threat")
      .eq("is_resolved", false)
      .eq("route_safety_alert_id", routeAlertId)
      .maybeSingle();

    if (existingOpenAlert) {
      await sendRouteSafetyPush(
        supabase,
        organizationId,
        `Duplicate route threat escalation for ${vehicleName}: ${routeAlert.title}. Existing alert remains open.`
      );

      return NextResponse.json({
        success: true,
        skipped: "duplicate_open_alert",
        alertId: existingOpenAlert.id,
        message: "This route threat already has an open alert. Push notification resent.",
      });
    }

    const { data: insertedAlert, error: alertError } = await supabase
      .from("vehicle_alerts")
      .insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        trip_id: tripId,
        route_safety_alert_id: routeAlertId,
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

    await createCommandCenterNotification({
      supabase,
      organizationId,
      vehicleId,
      title: "Route safety escalation",
      message,
      severity,
      type: "route_safety",
      source: "route_safety",
      metadata: {
        vehicleAlertId: insertedAlert.id,
        incidentId: insertedIncident.id,
        routeAlertId,
        riskScore: body.riskScore,
        riskLevel: body.riskLevel,
      },
    });

    await sendRouteSafetyPush(supabase, organizationId, message);

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


