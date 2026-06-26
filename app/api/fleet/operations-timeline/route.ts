import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

function eventTime(value?: string | null) {
  return value || new Date().toISOString();
}

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [assignmentsResult, escalationsResult] = await Promise.all([
      supabase
        .from("route_assignments")
        .select("id, vehicle_id, status, route_data, created_at, acknowledged_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30),

      supabase
        .from("route_safety_escalation_logs")
        .select("id, vehicle_id, risk_score, risk_level, auto_escalated, duplicate_detected, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (assignmentsResult.error) throw assignmentsResult.error;
    if (escalationsResult.error) throw escalationsResult.error;

    const events = [
      ...(assignmentsResult.data || []).map((assignment: any) => ({
        id: `route-assignment-${assignment.id}`,
        type: "route_assignment",
        severity: assignment.status === "pending" ? "high" : "low",
        title:
          assignment.status === "acknowledged"
            ? "Driver acknowledged safer route"
            : "Safer route assigned",
        detail:
          assignment.route_data?.label ||
          assignment.route_data?.description ||
          assignment.route_data?.reason ||
          "Route assignment updated",
        vehicleId: assignment.vehicle_id,
        createdAt: eventTime(assignment.acknowledged_at || assignment.created_at),
      })),

      ...(escalationsResult.data || []).map((log: any) => ({
        id: `route-escalation-${log.id}`,
        type: "route_escalation",
        severity: log.risk_level === "CRITICAL" ? "critical" : "high",
        title: "Route safety escalation",
        detail: `Risk ${log.risk_score}/100 - ${log.risk_level}${
          log.duplicate_detected ? " - duplicate alert skipped" : ""
        }`,
        vehicleId: log.vehicle_id,
        createdAt: eventTime(log.created_at),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 25);

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


