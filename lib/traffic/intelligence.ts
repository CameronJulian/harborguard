import { getHereTrafficFlow } from "@/lib/here/traffic";

function riskLevel(score: number) {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function distanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const earthRadius = 6371000;
  const toRadians = (value: number) =>
    (value * Math.PI) / 180;

  const latitudeDifference = toRadians(
    latitude2 - latitude1
  );
  const longitudeDifference = toRadians(
    longitude2 - longitude1
  );

  const a =
    Math.sin(latitudeDifference / 2) *
      Math.sin(latitudeDifference / 2) +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  return (
    earthRadius *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

function trafficRiskScore(incidentCount: number, avgCongestion: number, criticalCount: number) {
  return Math.min(100, Math.round(avgCongestion + incidentCount * 6 + criticalCount * 15));
}

function diagnosticBalancedTrafficRiskScore(
  incidentCount: number,
  averageCongestion: number,
  criticalCount: number
) {
  const congestionContribution = Math.min(
    55,
    averageCongestion * 0.55
  );

  const incidentContribution = Math.min(
    18,
    Math.sqrt(Math.max(0, incidentCount)) * 3
  );

  const criticalContribution = Math.min(
    22,
    Math.sqrt(Math.max(0, criticalCount)) * 4
  );

  const score = Math.min(
    100,
    Math.round(
      congestionContribution +
        incidentContribution +
        criticalContribution
    )
  );

  return {
    score,
    congestionContribution: Math.round(
      congestionContribution
    ),
    incidentContribution: Math.round(
      incidentContribution
    ),
    criticalContribution: Math.round(
      criticalContribution
    ),
  };
}

type TrafficIntelligenceOptions = {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
};

export async function buildTrafficIntelligence(
  supabase: any,
  organizationId: string,
  options: TrafficIntelligenceOptions = {}
) {
  const latitude = Number(options.latitude ?? -33.9249);
  const longitude = Number(options.longitude ?? 18.4241);
  const radiusMeters = Number(options.radiusMeters ?? 10000);

  const now = new Date().toISOString();

  const { data: incidents, error: incidentsError } = await supabase
    .from("route_safety_alerts")
    .select(`
      id,
      type,
      title,
      description,
      latitude,
      longitude,
      radius_meters,
      severity,
      source,
      status,
      expires_at,
      created_at,
      provider_confidence,
      provider_confirmation_count,
      provider_last_seen
    `)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .in("source", ["here_traffic", "tomtom"])
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (incidentsError) throw incidentsError;

  const scopedIncidents = (incidents || []).filter(
    (incident: any) => {
      const incidentLatitude = Number(incident.latitude);
      const incidentLongitude = Number(incident.longitude);
      const incidentRadius = Math.max(
        0,
        Number(incident.radius_meters || 0)
      );

      if (
        !Number.isFinite(incidentLatitude) ||
        !Number.isFinite(incidentLongitude)
      ) {
        return false;
      }

      const distance = distanceMeters(
        latitude,
        longitude,
        incidentLatitude,
        incidentLongitude
      );

      return distance <= radiusMeters + incidentRadius;
    }
  );

  const scopedCriticalCount = scopedIncidents.filter(
    (incident: any) =>
      ["critical", "high"].includes(
        String(incident.severity || "").toLowerCase()
      )
  ).length;

  const diagnosticProviderQuality = scopedIncidents.map(
    (incident: any) => {
      const providerConfidence = Math.max(
        0,
        Math.min(
          100,
          Number(incident.provider_confidence ?? 60)
        )
      );

      const providerConfirmationCount = Math.max(
        1,
        Number(
          incident.provider_confirmation_count ?? 1
        )
      );

      const confidenceWeight =
        providerConfidence / 100;

      const confirmationWeight = Math.min(
        1.2,
        0.8 +
          Math.max(
            0,
            providerConfirmationCount - 1
          ) * 0.2
      );

      const providerLastSeenEntries =
        incident.provider_last_seen &&
        typeof incident.provider_last_seen === "object"
          ? Object.values(
              incident.provider_last_seen
            )
          : [];

      const validProviderTimes =
        providerLastSeenEntries
          .map((value: unknown) =>
            new Date(String(value)).getTime()
          )
          .filter((value: number) =>
            Number.isFinite(value)
          );

      const freshestProviderTimestamp =
        validProviderTimes.length > 0
          ? Math.max(...validProviderTimes)
          : Number.NaN;

      const providerAgeHours = Number.isFinite(
        freshestProviderTimestamp
      )
        ? Math.max(
            0,
            (Date.now() - freshestProviderTimestamp) /
              (60 * 60 * 1000)
          )
        : null;

      const freshnessWeight =
        providerAgeHours === null
          ? 0.6
          : providerAgeHours <= 24
            ? 1
            : providerAgeHours <= 48
              ? 0.85
              : providerAgeHours <= 72
                ? 0.65
                : providerAgeHours <= 120
                  ? 0.4
                  : 0.2;

      const combinedWeight =
        confidenceWeight *
        confirmationWeight *
        freshnessWeight;

      return {
        id: incident.id,
        providerConfidence,
        providerConfirmationCount,
        confidenceWeight,
        confirmationWeight,
        providerAgeHours,
        freshnessWeight,
        combinedWeight,
      };
    }
  );

  const diagnosticAverageProviderWeight =
    diagnosticProviderQuality.length > 0
      ? diagnosticProviderQuality.reduce(
          (
            total: number,
            item: {
              combinedWeight: number;
            }
          ) =>
            total + item.combinedWeight,
          0
        ) / diagnosticProviderQuality.length
      : 1;

  const diagnosticAverageFreshnessWeight =
    diagnosticProviderQuality.length > 0
      ? diagnosticProviderQuality.reduce(
          (
            total: number,
            item: {
              freshnessWeight: number;
            }
          ) =>
            total + item.freshnessWeight,
          0
        ) / diagnosticProviderQuality.length
      : 1;

  const diagnosticStaleProviderIncidents =
    diagnosticProviderQuality.filter(
      (item: {
        freshnessWeight: number;
      }) => item.freshnessWeight < 1
    ).length;

  const diagnosticWeightedIncidentCount =
    scopedIncidents.length *
    diagnosticAverageProviderWeight;

  const diagnosticWeightedCriticalCount =
    scopedCriticalCount *
    diagnosticAverageProviderWeight;

  let flow: any[] = [];
  let flowWarning: string | null = null;

  try {
    const traffic = await getHereTrafficFlow({
      latitude,
      longitude,
      radiusMeters,
    });

    flow = traffic.flow;
  } catch (error: any) {
    flowWarning = error.message || "HERE Traffic Flow unavailable.";
  }

  const criticalCount = (incidents || []).filter((item: any) =>
    ["critical", "high"].includes(String(item.severity || "").toLowerCase())
  ).length;

  const averageCongestion = flow.length
    ? Math.round(flow.reduce((sum, item) => sum + Number(item.congestion || 0), 0) / flow.length)
    : 0;

  const averageDelay = flow.length
    ? Math.round(flow.reduce((sum, item) => sum + Number(item.delayMinutes || 0), 0) / flow.length)
    : 0;

  const score = trafficRiskScore((incidents || []).length, averageCongestion, criticalCount);
  const diagnosticScopedRiskScore = trafficRiskScore(
    scopedIncidents.length,
    averageCongestion,
    scopedCriticalCount
  );

  const diagnosticScopedRiskLevel = riskLevel(
    diagnosticScopedRiskScore
  );

  const diagnosticBalancedRisk =
    diagnosticBalancedTrafficRiskScore(
      scopedIncidents.length,
      averageCongestion,
      scopedCriticalCount
    );

  const diagnosticBalancedRiskLevel = riskLevel(
    diagnosticBalancedRisk.score
  );

  const diagnosticProviderWeightedBalancedRisk =
    diagnosticBalancedTrafficRiskScore(
      diagnosticWeightedIncidentCount,
      averageCongestion,
      diagnosticWeightedCriticalCount
    );

  const diagnosticProviderWeightedBalancedRiskLevel =
    riskLevel(
      diagnosticProviderWeightedBalancedRisk.score
    );

  const level = riskLevel(score);

  return {
    summary: {
      riskScore: score,
      riskLevel: level,
      activeIncidents: incidents?.length || 0,
      criticalIncidents: criticalCount,
      diagnosticScopedIncidents: scopedIncidents.length,
      diagnosticScopedCriticalIncidents:
        scopedCriticalCount,
      diagnosticScopedRiskScore,
      diagnosticScopedRiskLevel,
      diagnosticBalancedRiskScore:
        diagnosticBalancedRisk.score,
      diagnosticBalancedRiskLevel,
      diagnosticCongestionContribution:
        diagnosticBalancedRisk.congestionContribution,
      diagnosticIncidentContribution:
        diagnosticBalancedRisk.incidentContribution,
      diagnosticCriticalContribution:
        diagnosticBalancedRisk.criticalContribution,
      diagnosticAverageProviderWeight:
        Number(
          diagnosticAverageProviderWeight.toFixed(3)
        ),
      diagnosticAverageFreshnessWeight:
        Number(
          diagnosticAverageFreshnessWeight.toFixed(3)
        ),
      diagnosticStaleProviderIncidents,
      diagnosticWeightedIncidentCount:
        Number(
          diagnosticWeightedIncidentCount.toFixed(2)
        ),
      diagnosticWeightedCriticalCount:
        Number(
          diagnosticWeightedCriticalCount.toFixed(2)
        ),
      diagnosticProviderWeightedBalancedRiskScore:
        diagnosticProviderWeightedBalancedRisk.score,
      diagnosticProviderWeightedBalancedRiskLevel,
      flowCorridors: flow.length,
      averageCongestion,
      averageDelay,
      latitude,
      longitude,
      radiusMeters,
    },
    intelligence: {
      score,
      level,
      incidents: incidents || [],
      diagnosticScopedIncidentIds:
        scopedIncidents.map(
          (incident: any) => incident.id
        ),
      flow,
      sources: {
        incidents: "route_safety_alerts_provider_incidents",
        flow: flow.length > 0 ? "here_flow_live" : "unavailable",
      },
      warnings: flowWarning ? [flowWarning] : [],
    },
    generatedAt: new Date().toISOString(),
  };
}

