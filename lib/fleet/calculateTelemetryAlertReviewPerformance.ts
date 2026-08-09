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
  vehicle_id: string | null;
  telemetry_evidence: Record<string, unknown> | null;
};

export type TelemetryAlertReviewSummary = {
  reviewedAlerts: number;
  evaluatedAlerts: number;
  confirmed: number;
  falsePositive: number;
  inconclusive: number;
  confirmationRate: number | null;
  evidenceAvailable: number;
  evidenceCoverageRate: number | null;
};

export type TelemetryAlertReviewBreakdown =
  TelemetryAlertReviewSummary & {
    alertType: TelemetryAlertType;
  };

export type TelemetryAlertReviewVehicleBreakdown =
  TelemetryAlertReviewSummary & {
    vehicleId: string;
  };

export type TelemetryAlertReviewPerformance = {
  overall: TelemetryAlertReviewSummary;
  byAlertType: TelemetryAlertReviewBreakdown[];
  byVehicle: TelemetryAlertReviewVehicleBreakdown[];
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

  const evidenceAvailable =
    evaluations.filter(
      (evaluation) =>
        evaluation.telemetry_evidence !== null &&
        typeof evaluation.telemetry_evidence === "object" &&
        Object.keys(evaluation.telemetry_evidence).length > 0
    ).length;

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
    evidenceAvailable,
    evidenceCoverageRate: ratio(
      evidenceAvailable,
      reviewedAlerts
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

    byVehicle: Array.from(
      new Set(
        evaluations
          .map((evaluation) => evaluation.vehicle_id)
          .filter(
            (vehicleId): vehicleId is string =>
              Boolean(vehicleId)
          )
      )
    )
      .sort((left, right) =>
        left.localeCompare(right)
      )
      .map((vehicleId) => ({
        vehicleId,
        ...summarize(
          evaluations.filter(
            (evaluation) =>
              evaluation.vehicle_id === vehicleId
          )
        ),
      })),
  };
}
