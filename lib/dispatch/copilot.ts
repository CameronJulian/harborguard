import {
  buildFleetOptimization,
  rankFleetCandidatesForTarget,
} from "@/lib/fleet/optimizationEngine";
import { rankFleetCandidatesByETA } from "@/lib/dispatch/etaRanking";
import { filterCandidatesByCapability } from "@/lib/dispatch/capabilityMatcher";
import { buildTrafficIntelligence } from "@/lib/traffic/intelligence";
import { buildDispatcherRecommendations } from "@/lib/dispatcher/recommendations";

function trafficPriority(level?: string) {
  if (level === "critical") return "Critical";
  if (level === "high") return "High";
  if (level === "medium") return "Medium";
  return "Normal";
}

export async function buildDispatchCopilot(
  supabase: any,
  organizationId: string,
) {
  const [alertsResult, optimizationResult, trafficResult] = await Promise.all([
    supabase
      .from("vehicle_alerts")
      .select(
        `
        id,
        vehicle_id,
        alert_type,
        severity,
        message,
        intelligence_score,
        behavioral_risk,
        created_at,
        route_safety_alert_id,
        route_safety_alerts (
          id,
          latitude,
          longitude
        ),
        vehicles (
          id,
          nickname,
          registration_number
        )
      `,
      )
      .eq("organization_id", organizationId)
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(20),

    buildFleetOptimization(supabase, organizationId),

    buildTrafficIntelligence(supabase, organizationId, {
      radiusMeters: 10000,
    }),
  ]);

  if (alertsResult.error) throw alertsResult.error;

  const alerts = alertsResult.data || [];
  const trafficSummary = trafficResult.summary;
  const trafficWarning = trafficResult.intelligence?.warnings?.[0] || null;

  const bestCandidate = optimizationResult.summary?.bestCandidate || null;

  const recommendations = await Promise.all(
    alerts.map(async (alert: any) => {
      const routeSafetyAlert = Array.isArray(alert.route_safety_alerts)
        ? alert.route_safety_alerts[0]
        : alert.route_safety_alerts;

      const targetLatitude = Number(routeSafetyAlert?.latitude);

      const targetLongitude = Number(routeSafetyAlert?.longitude);

      const hasDispatchTarget =
        Number.isFinite(targetLatitude) && Number.isFinite(targetLongitude);

      const target = hasDispatchTarget
        ? {
            latitude: targetLatitude,
            longitude: targetLongitude,
          }
        : null;

      const capabilityCandidates =
        filterCandidatesByCapability(
          optimizationResult.candidates || [],
          alert.alert_type,
        );

      const capabilityBestCandidate =
        capabilityCandidates[0] || null;

      const targetCandidates = target
        ? rankFleetCandidatesForTarget(
            capabilityCandidates,
            target,
          )
        : capabilityCandidates;

      let etaCandidates = targetCandidates;

      if (target && targetCandidates.length > 0) {
        try {
          const etaTopCandidates = await rankFleetCandidatesByETA(
            targetCandidates,
            target,
            3,
          );

          etaCandidates = [
            ...etaTopCandidates,
            ...targetCandidates.filter(
              (candidate: any) =>
                !etaTopCandidates.some(
                  (etaCandidate: any) =>
                    etaCandidate.vehicleId === candidate.vehicleId,
                ),
            ),
          ];
        } catch (error) {
          console.warn("[Dispatch Copilot] ETA ranking unavailable:", error);
        }
      }

      const alertBestCandidate = etaCandidates[0] || capabilityBestCandidate;

      const baseRecommendation = buildDispatcherRecommendations({
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

      const trafficReasons = ["critical", "high", "medium"].includes(
        trafficRiskLevel,
      )
        ? [
            `Unified traffic intelligence reports ${trafficRiskLevel} traffic risk with ${averageCongestion}% average congestion.`,
          ]
        : [];

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
        recommendedResponder: alertBestCandidate,
        etaRankedCandidates: etaCandidates,
        dispatchTarget: target,
        recommendation: {
          ...baseRecommendation,
          priority:
            trafficRiskLevel === "critical" &&
            baseRecommendation.priority !== "Critical"
              ? "High"
              : baseRecommendation.priority,
          actions: [...baseRecommendation.actions, ...trafficActions],
          reasons: [...baseRecommendation.reasons, ...trafficReasons],
          trafficIntelligence: {
            riskLevel: trafficRiskLevel,
            riskScore: trafficRiskScore,
            averageCongestion,
            averageDelay,
            activeIncidents: trafficSummary?.activeIncidents || 0,
            warning: trafficWarning,
          },
          trafficPriority: trafficPriority(trafficRiskLevel),
        },
      };
    }),
  );

  return {
    summary: {
      alertCount: alerts.length,
      bestCandidate,
      trafficRiskLevel: trafficSummary?.riskLevel || "unknown",
      trafficRiskScore: trafficSummary?.riskScore || 0,
      averageCongestion: trafficSummary?.averageCongestion || 0,
      averageDelay: trafficSummary?.averageDelay || 0,
      availableVehicles: optimizationResult.summary?.available || 0,
      busyVehicles: optimizationResult.summary?.busy || 0,
      offlineVehicles: optimizationResult.summary?.offline || 0,
    },
    trafficIntelligence: trafficSummary,
    trafficWarning,
    fleetOptimization: optimizationResult.summary,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}
