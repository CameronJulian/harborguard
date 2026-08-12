import type { RoutePredictionClassification } from "@/lib/fleet/calculateRoutePredictionPerformance";

export type RouteSoftCapShadowEvidenceEvaluation = {
  classification: unknown;
  metadata: unknown;
};

type ValidShadowEvaluation = {
  productionOverallRiskScore: number;
  shadowOverallRiskScore: number;
  predictionPositiveThreshold: number;
  classificationAgreement: boolean;
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

  return {
    productionOverallRiskScore:
      value.productionOverallRiskScore,
    shadowOverallRiskScore:
      value.shadowOverallRiskScore,
    predictionPositiveThreshold:
      value.predictionPositiveThreshold,
    classificationAgreement:
      value.classificationAgreement,
  };
}

export function analyzeRouteSoftCapShadowEvidence(
  evaluations: RouteSoftCapShadowEvidenceEvaluation[]
) {
  const validEvaluations =
    evaluations
      .map((evaluation) => ({
        classification: evaluation.classification,
        shadowEvaluation: parseShadowEvaluation(
          evaluation.metadata
        ),
      }))
      .filter(
        (
          evaluation
        ): evaluation is {
          classification: unknown;
          shadowEvaluation: ValidShadowEvaluation;
        } => evaluation.shadowEvaluation !== null
      );

  const shadowEvaluations = validEvaluations.map(
    (evaluation) => evaluation.shadowEvaluation
  );

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
