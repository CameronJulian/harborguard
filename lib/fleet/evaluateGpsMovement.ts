export type GpsMovementDecision =
  | {
      outcome: "accepted";
      calculatedSpeedKmh: number;
    }
  | {
      outcome: "jitter";
      calculatedSpeedKmh: number;
    }
  | {
      outcome: "gps_spike";
      calculatedSpeedKmh: number;
    };

export type EvaluateGpsMovementInput = {
  distanceMeters: number;
  intervalSeconds: number;
  minimumDistanceMeters: number;
  maximumAllowedSpeedKmh: number;
};

export function evaluateGpsMovement(
  input: EvaluateGpsMovementInput
): GpsMovementDecision {
  const {
    distanceMeters,
    intervalSeconds,
    minimumDistanceMeters,
    maximumAllowedSpeedKmh,
  } = input;

  const calculatedSpeedKmh =
    intervalSeconds > 0
      ? (distanceMeters / intervalSeconds) * 3.6
      : 0;

  if (distanceMeters < minimumDistanceMeters) {
    return {
      outcome: "jitter",
      calculatedSpeedKmh,
    };
  }

  if (
    calculatedSpeedKmh >
    maximumAllowedSpeedKmh
  ) {
    return {
      outcome: "gps_spike",
      calculatedSpeedKmh,
    };
  }

  return {
    outcome: "accepted",
    calculatedSpeedKmh,
  };
}
