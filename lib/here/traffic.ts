function toKmh(value: any) {
  const speed = Number(value || 0);
  if (!Number.isFinite(speed) || speed <= 0) return 0;
  return Math.round(speed * 3.6);
}

function congestionPercent(currentSpeed: number, freeFlowSpeed: number) {
  if (!freeFlowSpeed || !currentSpeed) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((1 - currentSpeed / freeFlowSpeed) * 100))
  );
}

function delayMinutes(currentSpeed: number, freeFlowSpeed: number) {
  const congestion = congestionPercent(currentSpeed, freeFlowSpeed);
  return Math.round(congestion / 4);
}

function riskLevel(congestion: number) {
  if (congestion >= 70) return "critical";
  if (congestion >= 40) return "high";
  if (congestion >= 20) return "medium";
  return "low";
}

function roadName(item: any, index: number) {
  return (
    item?.location?.description ||
    item?.location?.shape?.links?.[0]?.names?.[0]?.value ||
    item?.location?.shape?.links?.[0]?.linkId ||
    `HERE road segment ${index + 1}`
  );
}

function recommendation(congestion: number) {
  if (congestion >= 70) return "Avoid corridor and prepare reroute.";
  if (congestion >= 40) return "Monitor ETA impact and consider alternate route.";
  if (congestion >= 20) return "Warn dispatcher of moderate delay.";
  return "Traffic flow normal.";
}

export async function getHereTrafficFlow(options: {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}) {
  if (!process.env.HERE_API_KEY) {
    throw new Error("HERE_API_KEY is not configured.");
  }

  const latitude = Number(options.latitude);
  const longitude = Number(options.longitude);
  const radiusMeters = Number(options.radiusMeters);

  const url =
    "https://data.traffic.hereapi.com/v7/flow" +
    `?in=circle:${latitude},${longitude};r=${radiusMeters}` +
    "&locationReferencing=shape" +
    `&apikey=${process.env.HERE_API_KEY}`;

  const response = await fetch(url, { cache: "no-store" });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.title ||
        data?.error ||
        "HERE Traffic Flow request failed."
    );
  }

  const results = data.results || [];

  const flow = results
    .map((item: any, index: number) => {
      const currentFlow = item.currentFlow || {};
      const currentSpeed = toKmh(currentFlow.speed);
      const freeFlowSpeed = toKmh(currentFlow.freeFlow);
      const congestion = congestionPercent(currentSpeed, freeFlowSpeed);

      return {
        id: item.location?.id || `here-flow-${index + 1}`,
        road: roadName(item, index),
        currentSpeed,
        freeFlowSpeed,
        congestion,
        delayMinutes: delayMinutes(currentSpeed, freeFlowSpeed),
        confidence: Number(currentFlow.confidence || 0),
        jamFactor: Number(currentFlow.jamFactor || 0),
        riskLevel: riskLevel(congestion),
        source: "here_flow_live",
        recommendedAction: recommendation(congestion),
      };
    })
    .filter((item: any) => item.currentSpeed > 0 || item.freeFlowSpeed > 0)
    .sort((a: any, b: any) => b.congestion - a.congestion)
    .slice(0, 20);

  return {
    rawCount: results.length,
    flow,
  };
}
