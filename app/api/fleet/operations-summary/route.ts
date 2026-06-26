import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      vehiclesResult,
      tripsResult,
      routeLogsResult,
      routeAssignmentsResult,

    ] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id")
        .eq("organization_id", organizationId),

      supabase
        .from("vehicle_trips")
        .select("id, status")
        .eq("organization_id", organizationId),

      supabase
        .from("route_safety_escalation_logs")
        .select("id, risk_score, risk_level, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", today.toISOString()),

      supabase
        .from("route_assignments")
        .select("id, status, created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", today.toISOString()),


    ]);

    if (vehiclesResult.error) throw vehiclesResult.error;
    if (tripsResult.error) throw tripsResult.error;
    if (routeLogsResult.error) throw routeLogsResult.error;
    if (routeAssignmentsResult.error) throw routeAssignmentsResult.error;


    const vehicles = vehiclesResult.data || [];
    const trips = tripsResult.data || [];
    const routeLogs = routeLogsResult.data || [];
    const routeAssignments = routeAssignmentsResult.data || [];
    const panicAlerts: any[] = [];

    const activeVehicles = vehicles.length;

    const activeTrips = trips.filter((trip: any) =>
      ["active", "en_route_to_port", "in_progress"].includes(trip.status)
    ).length;

    const highRiskRoutes = routeLogs.filter((log: any) =>
      log.risk_score >= 80 || log.risk_level === "CRITICAL"
    ).length;

    const driversRerouted = routeAssignments.length;

    return NextResponse.json({
      success: true,
      summary: {
        activeVehicles,
        activeTrips,
        highRiskRoutes,
        driversRerouted,
        panicAlertsToday: panicAlerts.length,
      },
    });
  } catch (error: any) {
    console.error("Operations summary error:", error);

    return NextResponse.json(
      { error: error.message || "Failed to load fleet operations summary." },
      { status: 500 }
    );
  }
}




