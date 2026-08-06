export type HarshBrakingCandidate = {
  previousSpeedKmh: number;
  currentSpeedKmh: number;
  speedDropKmh: number;
  intervalSeconds: number;
  decelerationMps2: number;
};

export type DetectHarshBrakingCandidateInput = {
  source: "mobile" | "hardware" | "manual";
  previousSpeedKmh: number;
  currentSpeedKmh: number;
  intervalSeconds: number;
  minimumPreviousSpeedKmh: number;
  minimumSpeedDropKmh: number;
  minimumIntervalSeconds: number;
  maximumIntervalSeconds: number;
  minimumDecelerationMps2: number;
};

export function detectHarshBrakingCandidate(
  input: DetectHarshBrakingCandidateInput
): HarshBrakingCandidate | null {
  const {
    source,
    previousSpeedKmh,
    currentSpeedKmh,
    intervalSeconds,
    minimumPreviousSpeedKmh,
    minimumSpeedDropKmh,
    minimumIntervalSeconds,
    maximumIntervalSeconds,
    minimumDecelerationMps2,
  } = input;

  const speedDropKmh =
    previousSpeedKmh - currentSpeedKmh;

  const decelerationMps2 =
    intervalSeconds > 0
      ? (speedDropKmh / 3.6) /
        intervalSeconds
      : 0;

  const validTelemetrySample =
    source !== "manual" &&
    Number.isFinite(previousSpeedKmh) &&
    Number.isFinite(currentSpeedKmh) &&
    currentSpeedKmh >= 0 &&
    intervalSeconds >= minimumIntervalSeconds &&
    intervalSeconds <= maximumIntervalSeconds;

  if (
    !validTelemetrySample ||
    previousSpeedKmh < minimumPreviousSpeedKmh ||
    speedDropKmh < minimumSpeedDropKmh ||
    decelerationMps2 < minimumDecelerationMps2
  ) {
    return null;
  }

  return {
    previousSpeedKmh:
      Math.round(previousSpeedKmh * 10) / 10,
    currentSpeedKmh:
      Math.round(currentSpeedKmh * 10) / 10,
    speedDropKmh:
      Math.round(speedDropKmh * 10) / 10,
    intervalSeconds:
      Math.round(intervalSeconds * 10) / 10,
    decelerationMps2:
      Math.round(decelerationMps2 * 100) / 100,
  };
}
