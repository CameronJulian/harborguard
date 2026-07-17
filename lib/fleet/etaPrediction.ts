type ETAOptions = {
  remainingKm: number;
  speedKmh: number;
  averageDelay: number;
  averageCongestion: number;
  activeIncidents: number;
  trafficRiskLevel: string;
  weatherDelayMinutes?: number;
};

function recommendation(delay: number, level: string) {
  if (level === "critical" || delay >= 25) {
    return "High traffic risk. Consider rerouting immediately.";
  }

  if (level === "high" || delay >= 15) {
    return "Monitor traffic and prepare alternate route.";
  }

  if (level === "medium" || delay >= 8) {
    return "Moderate delay expected. Monitor ETA.";
  }

  return "Route operating normally.";
}

export function predictETA(options: ETAOptions) {
  const speed = Math.max(options.speedKmh || 10, 10);

  const baseMinutes = (options.remainingKm / speed) * 60;

  const trafficDelay =
    options.averageDelay +
    Math.round(options.averageCongestion / 10) +
    (speed < 20 ? 10 : 0);

  const incidentDelay =
    options.activeIncidents > 0
      ? Math.min(20, options.activeIncidents * 3)
      : 0;

  const weatherDelay = Math.max(
    0,
    Math.min(
      30,
      Math.round(options.weatherDelayMinutes || 0)
    )
  );

  const predictedDelay = trafficDelay + incidentDelay + weatherDelay;

  const eta = new Date(
    Date.now() + (baseMinutes + predictedDelay) * 60000
  );

  return {
    baseMinutes: Math.round(baseMinutes),
    trafficDelay,
    incidentDelay,
    weatherDelay,
    predictedDelay,
    totalMinutes: Math.round(baseMinutes + predictedDelay),
    estimatedArrival: eta,
    confidence: Math.max(55, 100 - predictedDelay),
    recommendation: recommendation(predictedDelay, options.trafficRiskLevel),
  };
}
