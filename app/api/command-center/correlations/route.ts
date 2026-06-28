import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function confidenceScore(alertCount: number, severity: string, hasResponseEvents: boolean) {
  let score = Math.min(60 + alertCount * 8, 92);

  if (severity === "critical") score += 8;
  if (severity === "high") score += 4;
  if (hasResponseEvents) score += 5;

  return Math.min(score, 99);
}

function classifyIncident(summary: string, alertTypes: string[]) {
  const text = `${summary} ${alertTypes.join(" ")}`.toLowerCase();

  if (text.includes("panic") || text.includes("sos")) return "Possible Hijacking / Driver Distress";
  if (text.includes("offline") || text.includes("gps")) return "Possible Tracker Tampering";
  if (text.includes("stop") || text.includes("stationary")) return "Unexpected Stop Pattern";
  if (text.includes("speed")) return "High-Risk Driving Behaviour";
  if (text.includes("route")) return "Route Deviation Risk";

  return "Correlated Operational Incident";
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: incidents, error } = await supabase
      .from("incidents")
      .select(`
        id,
        incident_code,
        severity,
        status,
        summary,
        created_at,
        vehicle_alert_id,
        vehicle:vehicles (
          registration_number,
          driver_name
        )
      `)
      .eq("organization_id", organizationId)
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const correlations = await Promise.all(
      (incidents || []).map(async (incident: any) => {
        const since = new Date(
          new Date(incident.created_at).getTime() - 60 * 60 * 1000
        ).toISOString();

        const { data: relatedAlerts } = await supabase
          .from("vehicle_alerts")
          .select("id, alert_type, severity, message, created_at, intelligence_score, behavioral_risk")
          .eq("organization_id", organizationId)
          .eq("id", incident.vehicle_alert_id)
          .order("created_at", { ascending: true })
          .limit(20);

        const { data: responseEvents } = await supabase
          .from("emergency_response_events")
          .select("id, event_type, note, created_at")
          .eq("vehicle_alert_id", incident.vehicle_alert_id)
          .order("created_at", { ascending: true })
          .limit(20);

        const alertTypes = Array.from(
          new Set((relatedAlerts || []).map((alert: any) => alert.alert_type).filter(Boolean))
        );

        const evidence = [
          ...(relatedAlerts || []).map((alert: any) => ({
            type: "alert",
            title: String(alert.alert_type || "Vehicle alert").replace(/_/g, " "),
            detail: alert.message || "Vehicle alert detected.",
            severity: alert.severity,
            createdAt: alert.created_at,
          })),
          ...(responseEvents || []).map((event: any) => ({
            type: "response",
            title: String(event.event_type || "Response event").replace(/_/g, " "),
            detail: event.note || "Emergency response event recorded.",
            severity: "medium",
            createdAt: event.created_at,
          })),
        ].sort(
          (a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        const confidence = confidenceScore(
          relatedAlerts?.length || 0,
          incident.severity,
          (responseEvents?.length || 0) > 0
        );

        return {
          id: incident.id,
          incidentCode: incident.incident_code,
          severity: incident.severity,
          status: incident.status,
          summary: incident.summary,
          classification: classifyIncident(incident.summary || "", alertTypes),
          confidence,
          vehicleName: incident.vehicle?.registration_number || "Unknown vehicle",
          driverName: incident.vehicle?.driver_name || null,
          alertCount: relatedAlerts?.length || 0,
          responseEventCount: responseEvents?.length || 0,
          evidence,
          recommendedActions:
            confidence >= 90
              ? ["Escalate to supervisor", "Contact driver", "Dispatch response support", "Open investigation timeline"]
              : confidence >= 75
              ? ["Review related alerts", "Contact driver", "Monitor vehicle movement"]
              : ["Continue monitoring", "Review if more alerts appear"],
          createdAt: incident.created_at,
        };
      })
    );

    return NextResponse.json({
      success: true,
      correlations,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load incident correlations." },
      { status: error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

