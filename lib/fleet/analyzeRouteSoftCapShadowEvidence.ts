import type { RoutePredictionClassification } from "@/lib/fleet/calculateRoutePredictionPerformance";

export type RouteSoftCapShadowEvidenceEvaluation = {
  classification: unknown;
  metadata: unknown;
  outcomeCompletedAt: unknown;
  vehicleId: unknown;
};

type ValidShadowEvaluation = {
  productionOverallRiskScore: number;
  shadowOverallRiskScore: number;
  predictionPositiveThreshold: number;
  classificationAgreement: boolean;
  scoringVersion: string | null;
};

const routePredictionClassifications: RoutePredictionClassification[] = [
  "true_positive",
  "false_positive",
  "false_negative",
  "true_negative",
];

function validRoutePredictionClassification(
  value: unknown
): value is RoutePredictionClassification {
  return routePredictionClassifications.includes(
    value as RoutePredictionClassification
  );
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

function median(
  values: number[]
): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort(
    (left, right) => left - right
  );

  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle];
  }

  return (
    sorted[middle - 1] + sorted[middle]
  ) / 2;
}

function validFiniteScore(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

function parseOutcomeCompletedAt(
  value: unknown
): number | null {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.getTime();
}

function parseShadowEvaluation(
  metadata: unknown
): ValidShadowEvaluation | null {
  if (
    !metadata ||
    typeof metadata !== "object"
  ) {
    return null;
  }

  const shadow = (
    metadata as Record<string, unknown>
  ).routeSoftCapShadowEvaluation;

  if (
    !shadow ||
    typeof shadow !== "object"
  ) {
    return null;
  }

  const value =
    shadow as Record<string, unknown>;

  if (
    value.version !== 1 ||
    !validFiniteScore(
      value.productionOverallRiskScore
    ) ||
    !validFiniteScore(
      value.shadowOverallRiskScore
    ) ||
    !validFiniteScore(
      value.predictionPositiveThreshold
    ) ||
    typeof value.classificationAgreement !==
      "boolean"
  ) {
    return null;
  }

  const scoringVersion =
    typeof value.scoringVersion === "string" &&
    value.scoringVersion.trim().length > 0
      ? value.scoringVersion.trim()
      : null;

  return {
    productionOverallRiskScore:
      value.productionOverallRiskScore,
    shadowOverallRiskScore:
      value.shadowOverallRiskScore,
    predictionPositiveThreshold:
      value.predictionPositiveThreshold,
    classificationAgreement:
      value.classificationAgreement,
    scoringVersion,
  };
}

export function analyzeRouteSoftCapShadowEvidence(
  evaluations: RouteSoftCapShadowEvidenceEvaluation[]
) {
  const validEvaluations =
    evaluations
      .map((evaluation) => ({
        classification: evaluation.classification,
        outcomeCompletedAt: parseOutcomeCompletedAt(
          evaluation.outcomeCompletedAt
        ),
        vehicleId:
          typeof evaluation.vehicleId === "string" &&
          evaluation.vehicleId.length > 0
            ? evaluation.vehicleId
            : null,
        shadowEvaluation: parseShadowEvaluation(
          evaluation.metadata
        ),
      }))
      .filter(
        (
          evaluation
        ): evaluation is {
          classification: unknown;
          outcomeCompletedAt: number | null;
          vehicleId: string | null;
          shadowEvaluation: ValidShadowEvaluation;
        } => evaluation.shadowEvaluation !== null
      );

  const shadowEvaluations = validEvaluations.map(
    (evaluation) => evaluation.shadowEvaluation
  );

  const scoringVersionCounts = new Map<string, number>();

  shadowEvaluations.forEach((evaluation) => {
    if (evaluation.scoringVersion === null) {
      return;
    }

    scoringVersionCounts.set(
      evaluation.scoringVersion,
      (scoringVersionCounts.get(
        evaluation.scoringVersion
      ) ?? 0) + 1
    );
  });

  const explicitVersionedEvaluationCount =
    Array.from(scoringVersionCounts.values()).reduce(
      (sum, count) => sum + count,
      0
    );

  const unknownVersionEvaluationCount =
    shadowEvaluations.length -
    explicitVersionedEvaluationCount;

  const explicitVersionCoverageRate = ratio(
    explicitVersionedEvaluationCount,
    shadowEvaluations.length
  );

  const byVersion =
    Array.from(scoringVersionCounts.entries())
      .map(([scoringVersion, evaluationCount]) => ({
        scoringVersion,
        evaluationCount,
        share: ratio(
          evaluationCount,
          shadowEvaluations.length
        ),
      }))
      .sort((left, right) =>
        right.evaluationCount - left.evaluationCount ||
        left.scoringVersion.localeCompare(
          right.scoringVersion
        )
      );

  const vehicleEvaluationCounts = new Map<string, number>();

  validEvaluations.forEach((evaluation) => {
    if (evaluation.vehicleId === null) {
      return;
    }

    vehicleEvaluationCounts.set(
      evaluation.vehicleId,
      (vehicleEvaluationCounts.get(
        evaluation.vehicleId
      ) ?? 0) + 1
    );
  });

  const uniqueVehicleCount =
    vehicleEvaluationCounts.size;

  const byVehicle =
    Array.from(vehicleEvaluationCounts.entries())
      .map(([vehicleId, evaluationCount]) => ({
        vehicleId,
        evaluationCount,
        share: ratio(
          evaluationCount,
          validEvaluations.length
        ),
      }))
      .sort((left, right) =>
        right.evaluationCount - left.evaluationCount ||
        left.vehicleId.localeCompare(right.vehicleId)
      );

  const largestVehicleEvaluationCount =
    vehicleEvaluationCounts.size === 0
      ? 0
      : Math.max(
          ...vehicleEvaluationCounts.values()
        );

  const largestVehicleShare = ratio(
    largestVehicleEvaluationCount,
    validEvaluations.length
  );

  const evidenceCompletedAtTimes =
    validEvaluations
      .map(
        (evaluation) =>
          evaluation.outcomeCompletedAt
      )
      .filter(
        (value): value is number =>
          value !== null
      );

  const evidenceByUtcDayCounts =
    new Map<string, number>();

  evidenceCompletedAtTimes.forEach((completedAtTime) => {
    const utcDay =
      new Date(completedAtTime)
        .toISOString()
        .slice(0, 10);

    evidenceByUtcDayCounts.set(
      utcDay,
      (evidenceByUtcDayCounts.get(utcDay) ?? 0) + 1
    );
  });

  const byUtcDay =
    Array.from(evidenceByUtcDayCounts.entries())
      .map(([utcDay, evaluationCount]) => ({
        utcDay,
        evaluationCount,
      }))
      .sort((left, right) =>
        left.utcDay.localeCompare(right.utcDay)
      );

  const oldestEvidenceCompletedAtTime =
    evidenceCompletedAtTimes.length > 0
      ? Math.min(...evidenceCompletedAtTimes)
      : null;

  const newestEvidenceCompletedAtTime =
    evidenceCompletedAtTimes.length > 0
      ? Math.max(...evidenceCompletedAtTimes)
      : null;

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

  const scoreDeltas =
    shadowEvaluations.map(
      (evaluation) =>
        evaluation.productionOverallRiskScore -
        evaluation.shadowOverallRiskScore
    );

  const agreementCount =
    shadowEvaluations.filter(
      (evaluation) =>
        evaluation.classificationAgreement
    ).length;

  const positiveStateAgreementCount =
    shadowEvaluations.filter((evaluation) => {
      const productionPositive =
        evaluation.productionOverallRiskScore >=
        evaluation.predictionPositiveThreshold;

      const shadowPositive =
        evaluation.shadowOverallRiskScore >=
        evaluation.predictionPositiveThreshold;

      return productionPositive === shadowPositive;
    }).length;

  const positiveDeltaCount =
    scoreDeltas.filter((delta) => delta > 0).length;

  const zeroDeltaCount =
    scoreDeltas.filter((delta) => delta === 0).length;

  const negativeDeltaCount =
    scoreDeltas.filter((delta) => delta < 0).length;

  const scoreDeltaMean =
    scoreDeltas.length > 0
      ? scoreDeltas.reduce(
          (sum, delta) => sum + delta,
          0
        ) / scoreDeltas.length
      : null;

  const scoreDeltaMedian = median(scoreDeltas);

  const classifiedEvaluationCount =
    evaluations.filter((evaluation) =>
      validRoutePredictionClassification(
        evaluation.classification
      )
    ).length;

  const classifiedValidShadowEvaluationCount =
    validEvaluations.filter((evaluation) =>
      validRoutePredictionClassification(
        evaluation.classification
      )
    ).length;

  const byProductionClassification =
    routePredictionClassifications.map((classification) => {
      const eligibleEvaluationCount =
        evaluations.filter(
          (evaluation) =>
            validRoutePredictionClassification(
              evaluation.classification
            ) &&
            evaluation.classification === classification
        ).length;

      const classificationEvaluations =
        validEvaluations
          .filter(
            (evaluation) =>
              validRoutePredictionClassification(
                evaluation.classification
              ) &&
              evaluation.classification === classification
          )
          .map(
            (evaluation) =>
              evaluation.shadowEvaluation
          );

      const classificationAgreementCount =
        classificationEvaluations.filter(
          (evaluation) =>
            evaluation.classificationAgreement
        ).length;

      const classificationScoreDeltas =
        classificationEvaluations.map(
          (evaluation) =>
            evaluation.productionOverallRiskScore -
            evaluation.shadowOverallRiskScore
        );

      const classificationScoreDeltaMedian =
        median(classificationScoreDeltas);

      return {
        classification,
        eligibleEvaluationCount,
        eligibleDistributionRate: ratio(
          eligibleEvaluationCount,
          classifiedEvaluationCount
        ),
        validShadowEvaluationCount:
          classificationEvaluations.length,
        shadowEvidenceCoverageRate: ratio(
          classificationEvaluations.length,
          eligibleEvaluationCount
        ),
        shadowDistributionRate: ratio(
          classificationEvaluations.length,
          classifiedValidShadowEvaluationCount
        ),
        classificationAgreementCount,
        classificationDisagreementCount:
          classificationEvaluations.length -
          classificationAgreementCount,
        classificationAgreementRate:
          classificationEvaluations.length > 0
            ? classificationAgreementCount /
              classificationEvaluations.length
            : null,
        scoreDelta: {
          mean:
            classificationScoreDeltas.length > 0
              ? classificationScoreDeltas.reduce(
                  (sum, delta) => sum + delta,
                  0
                ) / classificationScoreDeltas.length
              : null,
          median: classificationScoreDeltaMedian,
          min:
            classificationScoreDeltas.length > 0
              ? Math.min(...classificationScoreDeltas)
              : null,
          max:
            classificationScoreDeltas.length > 0
              ? Math.max(...classificationScoreDeltas)
              : null,
        },
      };
    });

  return {
    totalEvaluationCount: evaluations.length,
    validShadowEvaluationCount:
      shadowEvaluations.length,
    shadowEvidenceCoverageRate: ratio(
      shadowEvaluations.length,
      evaluations.length
    ),
    uniqueVehicleCount,
    largestVehicleEvaluationCount,
    largestVehicleShare,
    byVehicle,
    scoringVersionDistribution: {
      explicitVersionedEvaluationCount,
      unknownVersionEvaluationCount,
      explicitVersionCoverageRate,
      byVersion,
    },
    oldestEvidenceCompletedAt,
    newestEvidenceCompletedAt,
    evidenceSpanDays,
    byUtcDay,
    classifiedEvaluationCount,
    classifiedValidShadowEvaluationCount,
    classificationAgreementCount:
      agreementCount,
    classificationDisagreementCount:
      shadowEvaluations.length - agreementCount,
    classificationAgreementRate:
      shadowEvaluations.length > 0
        ? agreementCount / shadowEvaluations.length
        : null,
    positiveStateAgreementCount,
    positiveStateChangeCount:
      shadowEvaluations.length -
      positiveStateAgreementCount,
    scoreDelta: {
      positiveCount: positiveDeltaCount,
      zeroCount: zeroDeltaCount,
      negativeCount: negativeDeltaCount,
      mean: scoreDeltaMean,
      median: scoreDeltaMedian,
      min:
        scoreDeltas.length > 0
          ? Math.min(...scoreDeltas)
          : null,
      max:
        scoreDeltas.length > 0
          ? Math.max(...scoreDeltas)
          : null,
    },
    byProductionClassification,

  };
}
