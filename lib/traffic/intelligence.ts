function toKmh(value: any) {
  const speed = Number(value || 0);
  if (!Number.isFinite(speed) || speed <= 0) return 0;
  return Math.round(speed * 3.6);
}

function congestionPercent(currentSpeed: number, freeFlowSpeed: number) {
  if (!freeFlowSpeed || !currentSpeed) return 0;
  return Math.max(0, Math.min(100, Math.round((1 - currentSpeed / freeFlowSpeed) * 100)));
}

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
    if (!process.env.HERE_API_KEY) {
      flowWarning = "HERE_API_KEY is not configured.";
    } else {
      const url =
        "https://data.traffic.hereapi.com/v7/flow" +
        `?in=circle:${latitude},${longitude};r=${radiusMeters}` +
        "&locationReferencing=shape" +
        `&apikey=${process.env.HERE_API_KEY}`;

      const response = await fetch(url, { cache: "no-store" });
      const data = await response.json();

      if (!response.ok) {
        flowWarning = data?.title || data?.error || "HERE Traffic Flow unavailable.";
      } else {
        flow = (data.results || [])
          .map((item: any, index: number) => {
            const currentFlow = item.currentFlow || {};
            const currentSpeed = toKmh(currentFlow.speed);
            const freeFlowSpeed = toKmh(currentFlow.freeFlow);
            const congestion = congestionPercent(currentSpeed, freeFlowSpeed);

            return {
              id: item.location?.id || `here-flow-${index + 1}`,
              road: item?.location?.description || `HERE road segment ${index + 1}`,
              currentSpeed,
              freeFlowSpeed,
              congestion,
              delayMinutes: Math.round(congestion / 4),
              confidence: Number(currentFlow.confidence || 0),
              jamFactor: Number(currentFlow.jamFactor || 0),
              source: "here_flow_live",
            };
          })
          .filter((item: any) => item.currentSpeed > 0 || item.freeFlowSpeed > 0)
          .sort((a: any, b: any) => b.congestion - a.congestion)
          .slice(0, 20);
      }
    }
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
