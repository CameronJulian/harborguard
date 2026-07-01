import { getHereTrafficFlow } from "@/lib/here/traffic";

function riskLevel(score: number) {
  if (score >= 85) return "critical";
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function trafficRiskScore(incidentCount: number, avgCongestion: number, criticalCount: number) {
  return Math.min(100, Math.round(avgCongestion + incidentCount * 6 + criticalCount * 15));
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
    .from("road_incidents")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (incidentsError) throw incidentsError;

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
  const level = riskLevel(score);

  return {
    summary: {
      riskScore: score,
      riskLevel: level,
      activeIncidents: incidents?.length || 0,
      criticalIncidents: criticalCount,
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
      flow,
      sources: {
        incidents: "road_incidents",
        flow: flow.length > 0 ? "here_flow_live" : "unavailable",
      },
      warnings: flowWarning ? [flowWarning] : [],
    },
    generatedAt: new Date().toISOString(),
  };
}
