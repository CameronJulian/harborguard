export type CandidateTrafficObservation = {
  congestion?: unknown;
  jamFactor?: unknown;
  delayMinutes?: unknown;
  observedAt?: string | null;
};

export type CandidateTrafficContextInput = {
  durationSeconds?: unknown;
  baseDurationSeconds?: unknown;
  trafficDelaySeconds?: unknown;
  observations?: CandidateTrafficObservation[];
  nowMs?: number;
  maximumAgeMinutes?: number;
};

export type CandidateTrafficContext = {
  trafficDelaySeconds: number;
  trafficDelayRatio: number;

  storedObservationCount: number;

  maximumCongestionPercent: number | null;
  averageCongestionPercent: number | null;
  maximumJamFactor: number | null;
  totalStoredDelayMinutes: number;

  newestObservationAt: string | null;
  trafficEvidenceFresh: boolean;

  source:
    | "none"
    | "routing_summary"
    | "stored_observations"
    | "combined";
};

function finiteNonNegative(
  value: unknown,
): number {
  const numberValue =
    Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue < 0
  ) {
    return 0;
  }

  return numberValue;
}

function clampPercent(
  value: unknown,
): number {
  return Math.max(
    0,
    Math.min(
      100,
      finiteNonNegative(value),
    ),
  );
}

export function buildCandidateTrafficContext(
  input: CandidateTrafficContextInput,
): CandidateTrafficContext {
  const durationSeconds =
    finiteNonNegative(
      input.durationSeconds,
    );

  const baseDurationSeconds =
    finiteNonNegative(
      input.baseDurationSeconds,
    );

  const explicitTrafficDelaySeconds =
    finiteNonNegative(
      input.trafficDelaySeconds,
    );

  const inferredTrafficDelaySeconds =
    Math.max(
      0,
      durationSeconds -
        baseDurationSeconds,
    );

  const trafficDelaySeconds =
    Math.max(
      explicitTrafficDelaySeconds,
      inferredTrafficDelaySeconds,
    );

  const trafficDelayRatio =
    baseDurationSeconds > 0
      ? Math.max(
          0,
          trafficDelaySeconds /
            baseDurationSeconds,
        )
      : 0;

  const observations =
    Array.isArray(input.observations)
      ? input.observations
      : [];

  const normalizedObservations =
    observations.map(
      (observation) => ({
        congestion:
          clampPercent(
            observation?.congestion,
          ),

        jamFactor:
          finiteNonNegative(
            observation?.jamFactor,
          ),

        delayMinutes:
          finiteNonNegative(
            observation?.delayMinutes,
          ),

        observedAt:
          typeof observation?.observedAt ===
            "string" &&
          observation.observedAt.trim()
            ? observation.observedAt
            : null,
      }),
    );

  const storedObservationCount =
    normalizedObservations.length;

  const congestionValues =
    normalizedObservations.map(
      (observation) =>
        observation.congestion,
    );

  const jamFactorValues =
    normalizedObservations.map(
      (observation) =>
        observation.jamFactor,
    );

  const maximumCongestionPercent =
    congestionValues.length > 0
      ? Math.max(
          ...congestionValues,
        )
      : null;

  const averageCongestionPercent =
    congestionValues.length > 0
      ? Math.round(
          (
            congestionValues.reduce(
              (
                total,
                congestion,
              ) =>
                total +
                congestion,
              0,
            ) /
            congestionValues.length
          ) *
            100,
        ) /
        100
      : null;

  const maximumJamFactor =
    jamFactorValues.length > 0
      ? Math.max(
          ...jamFactorValues,
        )
      : null;

  const totalStoredDelayMinutes =
    Math.round(
      normalizedObservations.reduce(
        (
          total,
          observation,
        ) =>
          total +
          observation.delayMinutes,
        0,
      ) *
        100,
    ) /
    100;

  const validObservationTimes =
    normalizedObservations
      .map(
        (observation) =>
          observation.observedAt,
      )
      .filter(
        (
          value,
        ): value is string =>
          typeof value === "string" &&
          value.length > 0 &&
          Number.isFinite(
            Date.parse(value),
          ),
      );

  const newestObservationAt =
    validObservationTimes.length > 0
      ? validObservationTimes.sort(
          (
            first,
            second,
          ) =>
            Date.parse(second) -
            Date.parse(first),
        )[0]
      : null;

  const nowMs =
    Number.isFinite(
      Number(input.nowMs),
    )
      ? Number(input.nowMs)
      : Date.now();

  const maximumAgeMinutes =
    finiteNonNegative(
      input.maximumAgeMinutes ??
        60,
    );

  const trafficEvidenceFresh =
    newestObservationAt !== null &&
    maximumAgeMinutes > 0 &&
    nowMs -
      Date.parse(
        newestObservationAt,
      ) <=
      maximumAgeMinutes *
        60 *
        1000;

  const hasRoutingSummary =
    durationSeconds > 0 ||
    baseDurationSeconds > 0 ||
    trafficDelaySeconds > 0;

  const hasStoredObservations =
    storedObservationCount > 0;

  const source =
    hasRoutingSummary &&
    hasStoredObservations
      ? "combined"
      : hasRoutingSummary
        ? "routing_summary"
        : hasStoredObservations
          ? "stored_observations"
          : "none";

  return {
    trafficDelaySeconds,
    trafficDelayRatio,

    storedObservationCount,

    maximumCongestionPercent,
    averageCongestionPercent,
    maximumJamFactor,
    totalStoredDelayMinutes,

    newestObservationAt,
    trafficEvidenceFresh,

    source,
  };
}
