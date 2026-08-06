export type RapidAccelerationCandidate = {
  previousSpeedKmh: number;
  currentSpeedKmh: number;
  speedIncreaseKmh: number;
  intervalSeconds: number;
  accelerationMps2: number;
};

export type DetectRapidAccelerationCandidateInput = {
  source: "mobile" | "hardware" | "manual";
  previousSpeedKmh: number;
  currentSpeedKmh: number;
  intervalSeconds: number;
  minimumSpeedIncreaseKmh: number;
  minimumIntervalSeconds: number;
  maximumIntervalSeconds: number;
  minimumAccelerationMps2: number;
};

export function detectRapidAccelerationCandidate(
  input: DetectRapidAccelerationCandidateInput
): RapidAccelerationCandidate | null {
  const {
    source,
    previousSpeedKmh,
    currentSpeedKmh,
    intervalSeconds,
    minimumSpeedIncreaseKmh,
    minimumIntervalSeconds,
    maximumIntervalSeconds,
    minimumAccelerationMps2,
  } = input;

  const speedIncreaseKmh =
    currentSpeedKmh - previousSpeedKmh;

  const accelerationMps2 =
    intervalSeconds > 0
      ? (speedIncreaseKmh / 3.6) /
        intervalSeconds
      : 0;

  const validTelemetrySample =
    source !== "manual" &&
    Number.isFinite(previousSpeedKmh) &&
    Number.isFinite(currentSpeedKmh) &&
    previousSpeedKmh >= 0 &&
    currentSpeedKmh >= 0 &&
    intervalSeconds >= minimumIntervalSeconds &&
    intervalSeconds <= maximumIntervalSeconds;

  if (
    !validTelemetrySample ||
    speedIncreaseKmh < minimumSpeedIncreaseKmh ||
    accelerationMps2 < minimumAccelerationMps2
  ) {
    return null;
  }

  return {
    previousSpeedKmh:
      Math.round(previousSpeedKmh * 10) / 10,
    currentSpeedKmh:
      Math.round(currentSpeedKmh * 10) / 10,
    speedIncreaseKmh:
      Math.round(speedIncreaseKmh * 10) / 10,
    intervalSeconds:
      Math.round(intervalSeconds * 10) / 10,
    accelerationMps2:
      Math.round(accelerationMps2 * 100) / 100,
  };
}
