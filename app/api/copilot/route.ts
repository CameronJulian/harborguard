import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { requirePremiumAccess } from "@/lib/require-premium";

function getVehicleRegistration(vehicle: any) {
  if (Array.isArray(vehicle)) {
    return vehicle[0]?.registration_number || "Unknown vehicle";
  }

  return vehicle?.registration_number || "Unknown vehicle";
}

function getVehicleName(vehicle: any) {
  if (Array.isArray(vehicle)) {
    return vehicle[0]?.nickname || vehicle[0]?.registration_number || "Unknown vehicle";
  }

  return vehicle?.nickname || vehicle?.registration_number || "Unknown vehicle";
}

function buildIncidentNarrative(alert: any) {
  const vehicleName = getVehicleName(alert.vehicle);
  const registration = getVehicleRegistration(alert.vehicle);
  const severity = alert.severity || "unknown";
  const alertType = String(alert.alert_type || "operational_alert").replace(/_/g, " ");
  const score = Number(alert.intelligence_score || 0);
  const risk = alert.behavioral_risk || "unknown";
  const message = alert.message || "No operational message available.";
  const intelligence =
    alert.intelligence_narrative ||
    "No AI intelligence narrative was recorded for this alert.";

  return (
    `Incident narrative: ${vehicleName} (${registration}) is currently under a ${severity.toUpperCase()} ${alertType} condition. ` +
    `The AI risk score is ${score}/100 with behavioral risk classified as ${risk}. ` +
    `Operational context: ${message} ` +
    `AI assessment: ${intelligence} ` +
    `Recommended action: dispatch an operator review, verify vehicle position, contact the driver, and monitor escalation status until resolved.`
  );
}

function buildExecutiveSummary(params: {
  vehicleCount: number;
  openAlerts: any[];
  criticalAlerts: any[];
  highAlerts: any[];
}) {
  const { vehicleCount, openAlerts, criticalAlerts, highAlerts } = params;

  let status = "Stable";

  if (criticalAlerts.length > 0) status = "Critical";
  else if (highAlerts.length > 0) status = "High Alert";
  else if (openAlerts.length > 0) status = "Elevated";

  const highestRisk = [...openAlerts].sort(
    (a: any, b: any) =>
      Number(b.intelligence_score || 0) - Number(a.intelligence_score || 0)
  )[0];

  const highestRiskText = highestRisk
    ? `${getVehicleRegistration(highestRisk.vehicle)} is the current highest-risk unit with ${highestRisk.severity} severity.`
    : "No high-risk vehicle is currently active.";

  return (
    `Executive fleet status: ${status}. ` +
    `${vehicleCount} vehicles are being monitored. ` +
    `${openAlerts.length} active alerts are open, including ${criticalAlerts.length} critical and ${highAlerts.length} high-risk alerts. ` +
    `${highestRiskText} ` +
    `Recommended command action: review unresolved alerts, prioritize critical incidents, and verify telemetry integrity.`
  );
}

function buildRecommendation(alerts: any[]) {
  if (alerts.some((a: any) => a.severity === "critical")) {
    return (
      "Recommendation: prioritize immediate response to critical alerts, contact affected drivers, " +
      "verify live coordinates, and keep WhatsApp/SMS escalation active until the incident is resolved."
    );
  }

  if (alerts.some((a: any) => a.severity === "high")) {
    return (
      "Recommendation: monitor high-risk vehicles closely, review route history, and prepare escalation if risk increases."
    );
  }

  if (alerts.length > 0) {
    return (
      "Recommendation: continue monitoring active alerts and resolve any stale operational warnings."
    );
  }

  return "Recommendation: fleet status appears stable. Continue routine monitoring.";
}

export async function POST(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrganization();
	const premium =
  await requirePremiumAccess(
    organizationId
  );

if (!premium.allowed) {
  return NextResponse.json(
    {
      error:
        "Professional subscription required.",
    },
    { status: 403 }
  );
}
    const body = await req.json();

    const rawQuestion = String(body.question || "").trim();
    const question = rawQuestion.toLowerCase();

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
        answer = buildIncidentNarrative(highestRisk);
      }
    } else if (
      question.includes("incident narrative") ||
      question.includes("explain incident") ||
      question.includes("explain alert") ||
      question.includes("what happened")
    ) {
      if (!highestRisk) {
        answer = "There are no active incidents requiring an AI narrative right now.";
      } else {
        answer = buildIncidentNarrative(highestRisk);
      }
    } else if (
      question.includes("executive summary") ||
      question.includes("summary") ||
      question.includes("status")
    ) {
      answer = buildExecutiveSummary({
        vehicleCount: vehicles?.length || 0,
        openAlerts,
        criticalAlerts,
        highAlerts,
      });
    } else if (question.includes("critical")) {
      if (criticalAlerts.length === 0) {
        answer = "There are no active critical alerts right now.";
      } else {
        const latest = criticalAlerts[0];

        answer =
          `There are ${criticalAlerts.length} active critical alerts. ` +
          buildIncidentNarrative(latest);
      }
    } else if (question.includes("route anomaly")) {
      const routeAnomalies = openAlerts.filter((a: any) =>
        String(a.alert_type || "").includes("route_anomaly")
      );

      if (routeAnomalies.length === 0) {
        answer = "No active route anomaly alerts were found.";
      } else {
        answer =
          `There are ${routeAnomalies.length} active route anomaly alerts. ` +
          buildIncidentNarrative(routeAnomalies[0]);
      }
    } else if (
      question.includes("recommend") ||
      question.includes("next action") ||
      question.includes("what should")
    ) {
      answer = buildRecommendation(openAlerts);
    } else {
      answer =
        "I can answer questions about highest-risk vehicles, critical alerts, route anomalies, executive fleet status, incident narratives, and recommended operational actions.";
    }

    return NextResponse.json({
      success: true,
      answer,
      context: {
        organizationId,
        vehicleCount: vehicles?.length || 0,
        openAlertCount: openAlerts.length,
        criticalAlertCount: criticalAlerts.length,
        highAlertCount: highAlerts.length,
        highestRiskVehicle: highestRisk
          ? getVehicleRegistration(highestRisk.vehicle)
          : null,
      },
    });
  } catch (err: any) {
    const message = err.message || "Copilot failed.";
    const status = message === "Unauthorized" ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}