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

export type TelemetryEvidenceOutcomeDiagnostic = {
  confirmedAverage: number | null;
  falsePositiveAverage: number | null;
};

export type TelemetryAlertReviewBreakdown =
  TelemetryAlertReviewSummary & {
    alertType: TelemetryAlertType;
    evidenceStrength: TelemetryEvidenceOutcomeDiagnostic;
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

function average(
  values: number[]
): number | null {
  if (values.length === 0) {
    return null;
  }

  return (
    values.reduce(
      (sum, value) => sum + value,
      0
    ) / values.length
  );
}

function evidenceStrength(
  evaluation: TelemetryAlertReviewEvaluation
): number | null {
  const evidence =
    evaluation.telemetry_evidence;

  if (
    evidence === null ||
    typeof evidence !== "object"
  ) {
    return null;
  }

  switch (evaluation.alert_type) {
    case "harsh_braking": {
      const value =
        evidence.decelerationMps2;

      return typeof value === "number"
        ? value
        : null;
    }

    case "rapid_acceleration": {
      const value =
        evidence.accelerationMps2;

      return typeof value === "number"
        ? value
        : null;
    }

    case "harsh_cornering": {
      const value =
        evidence.headingChangeDegrees;

      return typeof value === "number"
        ? value
        : null;
    }

    case "speeding": {
      const speed =
        evidence.speedKmh;

      const threshold =
        evidence.thresholdKmh;

      if (
        typeof speed !== "number" ||
        typeof threshold !== "number"
      ) {
        return null;
      }

      return speed - threshold;
    }
  }
}

function evidenceOutcomeDiagnostic(
  evaluations: TelemetryAlertReviewEvaluation[]
): TelemetryEvidenceOutcomeDiagnostic {
  return {
    confirmedAverage: average(
      evaluations
        .filter(
          (evaluation) =>
            evaluation.review_outcome === "confirmed"
        )
        .map(evidenceStrength)
        .filter(
          (value): value is number =>
            value !== null
        )
    ),
    falsePositiveAverage: average(
      evaluations
        .filter(
          (evaluation) =>
            evaluation.review_outcome === "false_positive"
        )
        .map(evidenceStrength)
        .filter(
          (value): value is number =>
            value !== null
        )
    ),
  };
}
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
      (alertType) => {
        const alertTypeEvaluations =
          evaluations.filter(
            (evaluation) =>
              evaluation.alert_type === alertType
          );

        return {
          alertType,
          ...summarize(
            alertTypeEvaluations
          ),
          evidenceStrength:
            evidenceOutcomeDiagnostic(
              alertTypeEvaluations
            ),
        };
      }
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
