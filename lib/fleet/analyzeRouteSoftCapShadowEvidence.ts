export type RouteSoftCapShadowEvidenceEvaluation = {
  metadata: unknown;
};

type ValidShadowEvaluation = {
  productionOverallRiskScore: number;
  shadowOverallRiskScore: number;
  predictionPositiveThreshold: number;
  classificationAgreement: boolean;
};

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
      .map((evaluation) =>
        parseShadowEvaluation(evaluation.metadata)
      )
      .filter(
        (
          evaluation
        ): evaluation is ValidShadowEvaluation =>
          evaluation !== null
      );

  const scoreDeltas =
    validEvaluations.map(
      (evaluation) =>
        evaluation.productionOverallRiskScore -
        evaluation.shadowOverallRiskScore
    );

  const agreementCount =
    validEvaluations.filter(
      (evaluation) =>
        evaluation.classificationAgreement
    ).length;

  const positiveStateAgreementCount =
    validEvaluations.filter((evaluation) => {
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

  return {
    totalEvaluationCount: evaluations.length,
    validShadowEvaluationCount:
      validEvaluations.length,
    classificationAgreementCount:
      agreementCount,
    classificationDisagreementCount:
      validEvaluations.length - agreementCount,
    classificationAgreementRate:
      validEvaluations.length > 0
        ? agreementCount / validEvaluations.length
        : null,
    positiveStateAgreementCount,
    positiveStateChangeCount:
      validEvaluations.length -
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
  };
}
