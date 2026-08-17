export type RouteRiskModelPromotionPredictionEvidence = {
  shadowPredictionId: unknown;
  modelRegistryId: unknown;
  trainingRunId: unknown;
  vehicleId: unknown;
  predictionCreatedAt: unknown;
  outcomeCompletedAt: unknown;
  evaluationId: unknown;
};

export type AnalyzeRouteRiskModelPromotionEvidenceInput = {
  modelRegistryId: string;
  trainingRunId: string;
  predictions:
    RouteRiskModelPromotionPredictionEvidence[];
};

export const ROUTE_RISK_MODEL_PROMOTION_EVIDENCE_VERSION =
  "harborguard-route-risk-model-promotion-evidence-v1" as const;

function ratio(
  numerator: number,
  denominator: number
): number | null {
  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

function parseRequiredIdentity(
  value: string,
  fieldName: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function validIdentity(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function timestampMilliseconds(
  value: unknown
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed =
    new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getTime();
}

/**
 * Describes candidate-specific HarborGuard shadow evidence for one exact
 * model-registry / training-run identity.
 *
 * Coverage semantics:
 *
 * - The denominator is eligible persisted shadow predictions for completed
 *   journeys supplied to this analyzer.
 * - The numerator is those eligible predictions that have an immutable
 *   completed-trip route-risk shadow evaluation.
 *
 * This helper is descriptive only.
 *
 * It does NOT:
 *
 * - read or write the database;
 * - infer eligibility from organization-wide soft-cap evidence;
 * - select or invent promotion thresholds;
 * - establish statistical significance or calibration;
 * - approve a model;
 * - enter shadow mode;
 * - activate or retire a model;
 * - trigger retraining;
 * - change production Route Safety behavior.
 */
export function analyzeRouteRiskModelPromotionEvidence({
  modelRegistryId,
  trainingRunId,
  predictions,
}: AnalyzeRouteRiskModelPromotionEvidenceInput) {
  const normalizedModelRegistryId =
    parseRequiredIdentity(
      modelRegistryId,
      "modelRegistryId"
    );

  const normalizedTrainingRunId =
    parseRequiredIdentity(
      trainingRunId,
      "trainingRunId"
    );

  const eligiblePredictions =
    predictions
      .map((prediction) => {
        const predictionCreatedAt =
          timestampMilliseconds(
            prediction.predictionCreatedAt
          );

        const outcomeCompletedAt =
          timestampMilliseconds(
            prediction.outcomeCompletedAt
          );

        const shadowPredictionId =
          validIdentity(
            prediction.shadowPredictionId
          )
            ? prediction.shadowPredictionId.trim()
            : null;

        const vehicleId =
          validIdentity(
            prediction.vehicleId
          )
            ? prediction.vehicleId.trim()
            : null;

        const identityMatches =
          prediction.modelRegistryId ===
            normalizedModelRegistryId &&
          prediction.trainingRunId ===
            normalizedTrainingRunId;

        const valid =
          shadowPredictionId !== null &&
          vehicleId !== null &&
          identityMatches &&
          predictionCreatedAt !== null &&
          outcomeCompletedAt !== null &&
          predictionCreatedAt <=
            outcomeCompletedAt;

        if (!valid) {
          return null;
        }

        return {
          shadowPredictionId,

          vehicleId,

          predictionCreatedAt,

          outcomeCompletedAt,

          evaluated:
            validIdentity(
              prediction.evaluationId
            ),
        };
      })
      .filter(
        (
          prediction
        ): prediction is {
          shadowPredictionId: string;
          vehicleId: string;
          predictionCreatedAt: number;
          outcomeCompletedAt: number;
          evaluated: boolean;
        } => prediction !== null
      );

  const evaluatedPredictions =
    eligiblePredictions.filter(
      (prediction) =>
        prediction.evaluated
    );

  const vehicleEvaluationCounts =
    new Map<string, number>();

  evaluatedPredictions.forEach(
    (prediction) => {
      vehicleEvaluationCounts.set(
        prediction.vehicleId,
        (
          vehicleEvaluationCounts.get(
            prediction.vehicleId
          ) ?? 0
        ) + 1
      );
    }
  );

  const uniqueVehicleCount =
    vehicleEvaluationCounts.size;

  const largestVehicleEvaluationCount =
    vehicleEvaluationCounts.size === 0
      ? 0
      : Math.max(
          ...vehicleEvaluationCounts.values()
        );

  const largestVehicleShare =
    ratio(
      largestVehicleEvaluationCount,
      evaluatedPredictions.length
    );

  const byVehicle =
    Array.from(
      vehicleEvaluationCounts.entries()
    )
      .map(
        ([vehicleId, evaluationCount]) => ({
          vehicleId,
          evaluationCount,
          share:
            ratio(
              evaluationCount,
              evaluatedPredictions.length
            ),
        })
      )
      .sort(
        (left, right) =>
          right.evaluationCount -
            left.evaluationCount ||
          left.vehicleId.localeCompare(
            right.vehicleId
          )
      );

  const completedAtTimes =
    evaluatedPredictions.map(
      (prediction) =>
        prediction.outcomeCompletedAt
    );

  const oldestEvidenceCompletedAtTime =
    completedAtTimes.length === 0
      ? null
      : Math.min(...completedAtTimes);

  const newestEvidenceCompletedAtTime =
    completedAtTimes.length === 0
      ? null
      : Math.max(...completedAtTimes);

  const oldestEvidenceCompletedAt =
    oldestEvidenceCompletedAtTime === null
      ? null
      : new Date(
          oldestEvidenceCompletedAtTime
        ).toISOString();

  const newestEvidenceCompletedAt =
    newestEvidenceCompletedAtTime === null
      ? null
      : new Date(
          newestEvidenceCompletedAtTime
        ).toISOString();

  const evidenceSpanDays =
    oldestEvidenceCompletedAtTime === null ||
    newestEvidenceCompletedAtTime === null
      ? null
      : (
          newestEvidenceCompletedAtTime -
          oldestEvidenceCompletedAtTime
        ) /
        (24 * 60 * 60 * 1000);

  return {
    evidenceVersion:
      ROUTE_RISK_MODEL_PROMOTION_EVIDENCE_VERSION,

    modelIdentity: {
      modelRegistryId:
        normalizedModelRegistryId,

      trainingRunId:
        normalizedTrainingRunId,
    },

    semantics:
      "MODEL_SCOPED_COMPLETED_JOURNEY_SHADOW_EVIDENCE" as const,

    totalInputPredictionCount:
      predictions.length,

    eligiblePredictionCount:
      eligiblePredictions.length,

    evaluatedPredictionCount:
      evaluatedPredictions.length,

    unevaluatedPredictionCount:
      eligiblePredictions.length -
      evaluatedPredictions.length,

    evaluationCoverageRate:
      ratio(
        evaluatedPredictions.length,
        eligiblePredictions.length
      ),

    uniqueVehicleCount,

    largestVehicleEvaluationCount,

    largestVehicleShare,

    byVehicle,

    oldestEvidenceCompletedAt,

    newestEvidenceCompletedAt,

    evidenceSpanDays,
  };
}
