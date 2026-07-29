type ETAOptions = {
  remainingKm: number;
  speedKmh: number;
  averageDelay: number;
  averageCongestion: number;
  activeIncidents: number;
  trafficRiskLevel: string;
  weatherRiskScore?: number;
  weatherRiskLevel?: string;
};

function recommendation(
  delay: number,
  trafficLevel: string,
  weatherLevel: string
) {
  if (weatherLevel === "critical") {
    return "Critical weather conditions may significantly affect travel. Consider delaying or rerouting the mission.";
  }

  if (trafficLevel === "critical" || delay >= 25) {
    return "High operational delay risk. Consider rerouting immediately.";
  }

  if (weatherLevel === "high") {
    return "Severe weather may affect vehicle speed and visibility. Monitor the driver and prepare an alternate route.";
  }

  if (trafficLevel === "high" || delay >= 15) {
    return "Monitor traffic and prepare an alternate route.";
  }

  if (
    weatherLevel === "medium" ||
    trafficLevel === "medium" ||
    delay >= 8
  ) {
    return "Moderate delay expected. Monitor ETA and road conditions.";
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

  const normalizedWeatherRiskScore = Math.min(
    100,
    Math.max(0, Number(options.weatherRiskScore) || 0)
  );

  const weatherDelay = Math.min(
    20,
    Math.round(normalizedWeatherRiskScore * 0.2)
  );

  const predictedDelay =
    trafficDelay +
    incidentDelay +
    weatherDelay;

  const eta = new Date(
    Date.now() + (baseMinutes + predictedDelay) * 60000
  );

  const weatherRiskLevel =
    options.weatherRiskLevel || "low";

  return {
    baseMinutes: Math.round(baseMinutes),
    trafficDelay,
    incidentDelay,
    weatherDelay,
    predictedDelay,
    totalMinutes: Math.round(baseMinutes + predictedDelay),
    estimatedArrival: eta,
    confidence: Math.max(55, 100 - predictedDelay),
    recommendation: recommendation(
      predictedDelay,
      options.trafficRiskLevel,
      weatherRiskLevel
    ),
  };
}