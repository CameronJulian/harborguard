export type RoutePredictionClassification =
  | "true_positive"
  | "false_positive"
  | "false_negative"
  | "true_negative";

export type RoutePredictionEvaluation = {
  classification: RoutePredictionClassification;
};

export type RoutePredictionPerformance = {
  totalEvaluations: number;
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
  trueNegative: number;
  accuracy: number | null;
  precision: number | null;
  recall: number | null;
  falsePositiveRate: number | null;
  falseNegativeRate: number | null;
};

function ratio(
  numerator: number,
  denominator: number
): number | null {
  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

export function calculateRoutePredictionPerformance(
  evaluations: RoutePredictionEvaluation[]
): RoutePredictionPerformance {
  const counts = evaluations.reduce(
    (result, evaluation) => {
      switch (evaluation.classification) {
        case "true_positive":
          result.truePositive += 1;
          break;

        case "false_positive":
          result.falsePositive += 1;
          break;

        case "false_negative":
          result.falseNegative += 1;
          break;

        case "true_negative":
          result.trueNegative += 1;
          break;
      }

      return result;
    },
    {
      truePositive: 0,
      falsePositive: 0,
      falseNegative: 0,
      trueNegative: 0,
    }
  );

  const totalEvaluations =
    counts.truePositive +
    counts.falsePositive +
    counts.falseNegative +
    counts.trueNegative;

  return {
    totalEvaluations,
    truePositive: counts.truePositive,
    falsePositive: counts.falsePositive,
    falseNegative: counts.falseNegative,
    trueNegative: counts.trueNegative,

    accuracy: ratio(
      counts.truePositive + counts.trueNegative,
      totalEvaluations
    ),

    precision: ratio(
      counts.truePositive,
      counts.truePositive + counts.falsePositive
    ),

    recall: ratio(
      counts.truePositive,
      counts.truePositive + counts.falseNegative
    ),

    falsePositiveRate: ratio(
      counts.falsePositive,
      counts.falsePositive + counts.trueNegative
    ),

    falseNegativeRate: ratio(
      counts.falseNegative,
      counts.falseNegative + counts.truePositive
    ),
  };
}
