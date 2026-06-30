import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/server-auth";
import { buildDispatcherRecommendations } from "@/lib/dispatcher/recommendations";

function trafficPriority(level?: string) {
  if (level === "critical") return "Critical";
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  return "Normal";
}

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

    let trafficSummary: any = null;
    let trafficWarning: string | null = null;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const response = await fetch(`${baseUrl}/api/traffic-intelligence`, {
        cache: "no-store",
        headers: {
          "x-harborguard-internal": "dispatcher-recommendations",
        },
      });

      const result = await response.json();

      if (response.ok) {
        trafficSummary = result.summary;
      } else {
        trafficWarning = result.error || "Traffic intelligence unavailable.";
      }
    } catch (trafficError: any) {
      trafficWarning = trafficError.message || "Traffic intelligence unavailable.";
    }

    const recommendations = (alerts || []).map((alert: any) => {
      const recommendation = buildDispatcherRecommendations({
        alertType: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        behavioralRisk: alert.behavioral_risk,
        intelligenceScore: alert.intelligence_score,
      });

      const trafficRiskLevel = trafficSummary?.riskLevel || "unknown";
      const trafficRiskScore = trafficSummary?.riskScore || 0;
      const averageCongestion = trafficSummary?.averageCongestion || 0;
      const averageDelay = trafficSummary?.averageDelay || 0;

      const trafficActions =
        trafficRiskLevel === "critical" || trafficRiskLevel === "high"
          ? [
              `Review traffic intelligence risk (${trafficRiskScore}/100).`,
              `Check congestion impact (${averageCongestion}% average congestion).`,
              `Consider reroute if ETA delay exceeds ${averageDelay} minutes.`,
            ]
          : trafficRiskLevel === "medium"
          ? [
              `Monitor traffic intelligence risk (${trafficRiskScore}/100).`,
              `Check current corridor delay (${averageDelay} minutes average).`,
            ]
          : [];

      const trafficReasons =
        trafficRiskLevel === "critical" || trafficRiskLevel === "high" || trafficRiskLevel === "medium"
          ? [
              `Unified traffic intelligence reports ${trafficRiskLevel} traffic risk with ${averageCongestion}% average congestion.`,
            ]
          : [];

      const enrichedRecommendation = {
        ...recommendation,
        priority:
          trafficRiskLevel === "critical" && recommendation.priority !== "Critical"
            ? "High"
            : recommendation.priority,
        actions: [...recommendation.actions, ...trafficActions],
        reasons: [...recommendation.reasons, ...trafficReasons],
        trafficIntelligence: {
          riskLevel: trafficRiskLevel,
          riskScore: trafficRiskScore,
          averageCongestion,
          averageDelay,
          activeIncidents: trafficSummary?.activeIncidents || 0,
          warning: trafficWarning,
        },
        trafficPriority: trafficPriority(trafficRiskLevel),
      };

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
        recommendation: enrichedRecommendation,
      };
    });

    return NextResponse.json({
      success: true,
      count: recommendations.length,
      trafficIntelligence: trafficSummary,
      trafficWarning,
      recommendations,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load dispatcher recommendations." },
      { status: err.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
