import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function getVehicleRegistration(vehicle: any) {
  if (Array.isArray(vehicle)) {
    return vehicle[0]?.registration_number || "Unknown vehicle";
  }

  return vehicle?.registration_number || "Unknown vehicle";
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
    const body = await req.json();

    const question = String(body.question || "").trim().toLowerCase();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required." },
        { status: 400 }
      );
    }

    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id, nickname, registration_number")
      .eq("organization_id", organizationId);

    const { data: alerts } = await supabase
      .from("vehicle_alerts")
      .select(`
        id,
        vehicle_id,
        alert_type,
        severity,
        message,
        is_resolved,
        created_at,
        intelligence_score,
        behavioral_risk,
        intelligence_narrative,
        vehicle:vehicles (
          nickname,
          registration_number
        )
      `)
      .eq("organization_id", organizationId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false });

    const openAlerts = alerts || [];

    const criticalAlerts = openAlerts.filter(
      (a: any) => a.severity === "critical"
    );

    const highAlerts = openAlerts.filter(
      (a: any) => a.severity === "high"
    );

    const highestRisk = [...openAlerts].sort(
      (a: any, b: any) =>
        Number(b.intelligence_score || 0) -
        Number(a.intelligence_score || 0)
    )[0];

    let answer = "";

    if (
      question.includes("highest risk") ||
      question.includes("most dangerous")
    ) {
      if (!highestRisk) {
        answer = "No active high-risk vehicles were found right now.";
      } else {
        answer =
          `${getVehicleRegistration(highestRisk.vehicle)} is currently the highest-risk vehicle. ` +
          `Severity: ${highestRisk.severity}. ` +
          `Alert: ${highestRisk.alert_type}. ` +
          `Reason: ${
            highestRisk.intelligence_narrative ||
            highestRisk.message ||
            "No narrative available."
          }`;
      }
    } else if (question.includes("critical")) {
      if (criticalAlerts.length === 0) {
        answer = "There are no active critical alerts right now.";
      } else {
        const latest = criticalAlerts[0];

        answer =
          `There are ${criticalAlerts.length} active critical alerts. ` +
          `The latest is for ${getVehicleRegistration(latest.vehicle)}: ` +
          `${latest.message || "No message available."}`;
      }
    } else if (
      question.includes("summary") ||
      question.includes("status")
    ) {
      answer =
        `Fleet status: ${vehicles?.length || 0} vehicles monitored. ` +
        `${openAlerts.length} active alerts, ` +
        `${criticalAlerts.length} critical, and ` +
        `${highAlerts.length} high-risk alerts.`;
    } else if (question.includes("route anomaly")) {
      const routeAnomalies = openAlerts.filter((a: any) =>
        String(a.alert_type || "").includes("route_anomaly")
      );

      if (routeAnomalies.length === 0) {
        answer = "No active route anomaly alerts were found.";
      } else {
        const latest = routeAnomalies[0];

        answer =
          `There are ${routeAnomalies.length} active route anomaly alerts. ` +
          `Latest: ${getVehicleRegistration(latest.vehicle)} — ` +
          `${latest.message || "No message available."}`;
      }
    } else {
      answer =
        "I can currently answer questions about highest-risk vehicles, critical alerts, fleet status, and route anomalies.";
    }

    return NextResponse.json({
      success: true,
      answer,
      context: {
        vehicleCount: vehicles?.length || 0,
        openAlertCount: openAlerts.length,
        criticalAlertCount: criticalAlerts.length,
        highAlertCount: highAlerts.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Copilot failed." },
      { status: 500 }
    );
  }
}