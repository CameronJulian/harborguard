export type TelemetryAlertType =
  | "harsh_braking"
  | "rapid_acceleration"
  | "harsh_cornering"
  | "speeding";

export type TelemetryReviewOutcome =
  | "confirmed"
  | "false_positive"
  | "inconclusive";

export type TelemetryAlertReviewEvaluation = {
  alert_type: TelemetryAlertType;
  review_outcome: TelemetryReviewOutcome;
};

export type TelemetryAlertReviewSummary = {
  reviewedAlerts: number;
  evaluatedAlerts: number;
  confirmed: number;
  falsePositive: number;
  inconclusive: number;
  confirmationRate: number | null;
};

export type TelemetryAlertReviewBreakdown =
  TelemetryAlertReviewSummary & {
    alertType: TelemetryAlertType;
  };

export type TelemetryAlertReviewPerformance = {
  overall: TelemetryAlertReviewSummary;
  byAlertType: TelemetryAlertReviewBreakdown[];
};

export const TELEMETRY_ALERT_TYPES: TelemetryAlertType[] = [
  "harsh_braking",
  "rapid_acceleration",
  "harsh_cornering",
  "speeding",
];

function ratio(
  numerator: number,
  denominator: number
): number | null {
  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

function summarize(
  evaluations: TelemetryAlertReviewEvaluation[]
): TelemetryAlertReviewSummary {
  const counts = evaluations.reduce(
    (result, evaluation) => {
      switch (evaluation.review_outcome) {
        case "confirmed":
          result.confirmed += 1;
          break;

        case "false_positive":
          result.falsePositive += 1;
          break;

        case "inconclusive":
          result.inconclusive += 1;
          break;
      }

      return result;
    },
    {
      confirmed: 0,
      falsePositive: 0,
      inconclusive: 0,
    }
  );

  const evaluatedAlerts =
    counts.confirmed +
    counts.falsePositive;

  const reviewedAlerts =
    evaluatedAlerts +
    counts.inconclusive;

  return {
    reviewedAlerts,
    evaluatedAlerts,
    confirmed: counts.confirmed,
    falsePositive: counts.falsePositive,
    inconclusive: counts.inconclusive,
    confirmationRate: ratio(
      counts.confirmed,
      evaluatedAlerts
    ),
  };
}

export function calculateTelemetryAlertReviewPerformance(
  evaluations: TelemetryAlertReviewEvaluation[]
): TelemetryAlertReviewPerformance {
  return {
    overall: summarize(evaluations),

    byAlertType: TELEMETRY_ALERT_TYPES.map(
      (alertType) => ({
        alertType,
        ...summarize(
          evaluations.filter(
            (evaluation) =>
              evaluation.alert_type === alertType
          )
        ),
      })
    ),
  };
}
