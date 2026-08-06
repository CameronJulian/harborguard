export type HarshCorneringCandidate = {
  previousHeading: number;
  currentHeading: number;
  headingChangeDegrees: number;
  speedKmh: number;
  intervalSeconds: number;
};

export type DetectHarshCorneringCandidateInput = {
  source: "mobile" | "hardware" | "manual";
  previousHeading: number;
  currentHeading: number;
  normalizedHeadingDeltaDegrees: number | null;
  speedKmh: number;
  intervalSeconds: number;
  minimumSpeedKmh: number;
  minimumHeadingChangeDegrees: number;
  minimumIntervalSeconds: number;
  maximumIntervalSeconds: number;
};

export function detectHarshCorneringCandidate(
  input: DetectHarshCorneringCandidateInput
): HarshCorneringCandidate | null {
  const {
    source,
    previousHeading,
    currentHeading,
    normalizedHeadingDeltaDegrees,
    speedKmh,
    intervalSeconds,
    minimumSpeedKmh,
    minimumHeadingChangeDegrees,
    minimumIntervalSeconds,
    maximumIntervalSeconds,
  } = input;

  const validTelemetrySample =
    source !== "manual" &&
    normalizedHeadingDeltaDegrees !== null &&
    Number.isFinite(normalizedHeadingDeltaDegrees) &&
    Number.isFinite(previousHeading) &&
    Number.isFinite(currentHeading) &&
    Number.isFinite(speedKmh) &&
    speedKmh >= minimumSpeedKmh &&
    intervalSeconds >= minimumIntervalSeconds &&
    intervalSeconds <= maximumIntervalSeconds;

  if (
    !validTelemetrySample ||
    normalizedHeadingDeltaDegrees <
      minimumHeadingChangeDegrees
  ) {
    return null;
  }

  return {
    previousHeading:
      Math.round(previousHeading * 10) / 10,
    currentHeading:
      Math.round(currentHeading * 10) / 10,
    headingChangeDegrees:
      Math.round(
        normalizedHeadingDeltaDegrees * 10
      ) / 10,
    speedKmh:
      Math.round(speedKmh * 10) / 10,
    intervalSeconds:
      Math.round(intervalSeconds * 10) / 10,
  };
}
