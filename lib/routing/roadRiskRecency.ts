const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function historicalRoadRiskRecencyWeight(
  lastEventAt: unknown,
  nowMilliseconds = Date.now()
) {
  const lastEvent = Date.parse(String(lastEventAt ?? ""));

  if (!Number.isFinite(lastEvent)) {
    return 1;
  }

  const ageDays = Math.max(
    0,
    (nowMilliseconds - lastEvent) / MILLISECONDS_PER_DAY
  );

  if (ageDays <= 7) {
    return 1.25;
  }

  if (ageDays <= 30) {
    return 1.1;
  }

  if (ageDays <= 90) {
    return 1;
  }

  if (ageDays <= 180) {
    return 0.85;
  }

  return 0.7;
}

export function calculateOperationalRoadRisk(
  riskScore: unknown,
  lastEventAt: unknown,
  nowMilliseconds = Date.now()
) {
  const rawRiskScore = Math.min(
    100,
    Math.max(0, Number(riskScore) || 0)
  );

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        rawRiskScore *
          historicalRoadRiskRecencyWeight(
            lastEventAt,
            nowMilliseconds
          )
      )
    )
  );
}
