import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildDispatcherRecommendations } from "@/lib/dispatcher/recommendations";

export async function GET() {
  try {
    const { supabase, organizationId } = await requireOrganization();

    const { data: alerts, error } = await supabase
      .from("vehicle_alerts")
      .select(`
        id,
        vehicle_id,
        alert_type,
        severity,
        message,
        intelligence_score,
        behavioral_risk,
        created_at,
        vehicles (
          id,
          nickname,
          registration_number
        )
      `)
      .eq("organization_id", organizationId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const recommendations = (alerts || []).map((alert: any) => {
      const recommendation = buildDispatcherRecommendations({
        alertType: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        behavioralRisk: alert.behavioral_risk,
        intelligenceScore: alert.intelligence_score,
      });

      return {
        alertId: alert.id,
        vehicleId: alert.vehicle_id,
        vehicleName:
          alert.vehicles?.registration_number ||
          alert.vehicles?.nickname ||
          "Unknown vehicle",
        alertType: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        intelligenceScore: alert.intelligence_score,
        behavioralRisk: alert.behavioral_risk,
        createdAt: alert.created_at,
        recommendation,
      };
    });

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load dispatcher recommendations." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
