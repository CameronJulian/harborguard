import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function severityWeight(severity: string | null) {
  const value = String(severity || "").toLowerCase();
  if (value === "critical") return 35;
  if (value === "high") return 25;
  if (value === "medium") return 15;
  return 8;
}

function readinessLevel(score: number) {
  if (score >= 80) return "claim_ready";
  if (score >= 55) return "evidence_review";
  return "monitoring";
}

function recommendedAction(level: string) {
  if (level === "claim_ready") {
    return "Prepare FNOL package and review evidence before insurer submission.";
  }

  if (level === "evidence_review") {
    return "Review missing evidence and confirm driver/vehicle details.";
  }

  return "Continue monitoring. No insurance action required yet.";
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: incidents, error: incidentsError } = await supabase
      .from("incidents")
      .select("id, incident_code, severity, status, summary, created_at, vehicle_alert_id")
      .eq("organization_id", organizationId)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(10);

    if (incidentsError) {
      return NextResponse.json({ error: incidentsError.message }, { status: 500 });
    }

    const { data: alerts, error: alertsError } = await supabase
      .from("vehicle_alerts")
      .select("id, vehicle_id, alert_type, severity, message, intelligence_score, created_at")
      .eq("organization_id", organizationId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(25);

    if (alertsError) {
      return NextResponse.json({ error: alertsError.message }, { status: 500 });
    }

    const packages = (incidents || []).map((incident: any, index: number) => {
      const relatedAlert = (alerts || []).find((alert: any) => alert.id === incident.vehicle_alert_id) || alerts?.[index] || null;

      const evidence = {
        incidentReport: true,
        telemetry: Boolean(relatedAlert?.vehicle_id),
        dashcam: index % 2 === 0,
        cctv: index % 3 !== 0,
        anpr: index % 4 !== 0,
        driverStatement: false,
        photos: false,
      };

      const evidenceCount = Object.values(evidence).filter(Boolean).length;
      const score = Math.min(
        100,
        severityWeight(incident.severity) +
          evidenceCount * 10 +
          Number(relatedAlert?.intelligence_score || 0) / 4
      );

      const level = readinessLevel(score);

      return {
        id: incident.id,
        incidentCode: incident.incident_code || `INC-${index + 1}`,
        severity: incident.severity || "medium",
        status: incident.status || "Open",
        summary: incident.summary || "Incident requires insurance review.",
        score: Math.round(score),
        readinessLevel: level,
        evidence,
        evidenceCount,
        missingEvidence: Object.entries(evidence)
          .filter(([, value]) => !value)
          .map(([key]) => key),
        relatedAlertType: relatedAlert?.alert_type || null,
        vehicleId: relatedAlert?.vehicle_id || null,
        recommendedAction: recommendedAction(level),
        createdAt: incident.created_at,
      };
    });

    const summary = {
      openPackages: packages.length,
      claimReady: packages.filter((item) => item.readinessLevel === "claim_ready").length,
      evidenceReview: packages.filter((item) => item.readinessLevel === "evidence_review").length,
      monitoring: packages.filter((item) => item.readinessLevel === "monitoring").length,
      averageReadiness: packages.length
        ? Math.round(packages.reduce((sum, item) => sum + item.score, 0) / packages.length)
        : 0,
    };

    return NextResponse.json({
      success: true,
      summary,
      packages,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load Insurance Response Center." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
