export type SpeedingCandidate = {
  speedKmh: number;
  thresholdKmh: number;
  durationSeconds: number;
  consecutiveSamples: number;
};

export type DetectSustainedSpeedingCandidateInput = {
  supabase: any;
  organizationId: string;
  vehicleId: string;
  speedKmh: number;
  occurredAt: string;
  parseNumber: (value: unknown) => number;
  lookbackSeconds: number;
  minimumSpeedKmh: number;
  minimumSamples: number;
  minimumDurationSeconds: number;
};

export async function detectSustainedSpeedingCandidate(
  input: DetectSustainedSpeedingCandidateInput
): Promise<SpeedingCandidate | null> {
  const {
    supabase,
    organizationId,
    vehicleId,
    speedKmh,
    occurredAt,
    parseNumber,
    lookbackSeconds,
    minimumSpeedKmh,
    minimumSamples,
    minimumDurationSeconds,
  } = input;

  if (
    !Number.isFinite(speedKmh) ||
    speedKmh < minimumSpeedKmh
  ) {
    return null;
  }

  const lookbackSince = new Date(
    new Date(occurredAt).getTime() -
      lookbackSeconds * 1000
  ).toISOString();

  const {
    data: recentSpeedingPoints,
    error: recentSpeedingPointsError,
  } = await supabase
    .from("vehicle_locations")
    .select("speed_kmh, road_speed_limit_kmh, recorded_at")
    .eq("organization_id", organizationId)
    .eq("vehicle_id", vehicleId)
    .gte("recorded_at", lookbackSince)
    .order("recorded_at", { ascending: false })
    .limit(20);

  if (recentSpeedingPointsError) {
    console.error(
      "Sustained speeding history lookup failed:",
      recentSpeedingPointsError
    );

    return null;
  }

  const consecutiveSpeedingSamples = [
    {
      speedKmh,
      recordedAt: occurredAt,
    },
  ];

  for (
    const point of recentSpeedingPoints || []
  ) {
    const historicalSpeedKmh =
      parseNumber(point.speed_kmh);

    const historicalRoadSpeedLimitKmh =
      parseNumber(point.road_speed_limit_kmh);

    const historicalMinimumSpeedKmh =
      Number.isFinite(historicalRoadSpeedLimitKmh) &&
      historicalRoadSpeedLimitKmh > 0
        ? historicalRoadSpeedLimitKmh
        : minimumSpeedKmh;

    if (
      !Number.isFinite(historicalSpeedKmh) ||
      historicalSpeedKmh < historicalMinimumSpeedKmh
    ) {
      break;
    }

    consecutiveSpeedingSamples.push({
      speedKmh: historicalSpeedKmh,
      recordedAt: point.recorded_at,
    });
  }

  const oldestSpeedingSample =
    consecutiveSpeedingSamples[
      consecutiveSpeedingSamples.length - 1
    ];

  const sustainedDurationSeconds =
    oldestSpeedingSample
      ? (
          new Date(occurredAt).getTime() -
          new Date(
            oldestSpeedingSample.recordedAt
          ).getTime()
        ) / 1000
      : 0;

  if (
    consecutiveSpeedingSamples.length <
      minimumSamples ||
    sustainedDurationSeconds <
      minimumDurationSeconds
  ) {
    return null;
  }

  return {
    speedKmh:
      Math.round(speedKmh * 10) / 10,
    thresholdKmh: minimumSpeedKmh,
    durationSeconds:
      Math.round(
        sustainedDurationSeconds * 10
      ) / 10,
    consecutiveSamples:
      consecutiveSpeedingSamples.length,
  };
}
