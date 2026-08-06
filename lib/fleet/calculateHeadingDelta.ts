export type CalculateHeadingDeltaInput = {
  previousHeading: number;
  currentHeading: number;
};

export function calculateHeadingDelta(
  input: CalculateHeadingDeltaInput
): number | null {
  const {
    previousHeading,
    currentHeading,
  } = input;

  if (
    !Number.isFinite(previousHeading) ||
    !Number.isFinite(currentHeading)
  ) {
    return null;
  }

  const normalizedPreviousHeading =
    ((previousHeading % 360) + 360) % 360;

  const normalizedCurrentHeading =
    ((currentHeading % 360) + 360) % 360;

  const rawHeadingDeltaDegrees =
    Math.abs(
      normalizedCurrentHeading -
      normalizedPreviousHeading
    );

  return Math.min(
    rawHeadingDeltaDegrees,
    360 - rawHeadingDeltaDegrees
  );
}
