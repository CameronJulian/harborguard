import {
  calculateRoutePredictionPerformance,
  type RoutePredictionClassification,
  type RoutePredictionPerformance,
} from "@/lib/fleet/calculateRoutePredictionPerformance";

export type RoutePredictionThresholdEvaluation = {
  predictedRiskScore: number;
  observedAdverseEvent: boolean;
};

export type RoutePredictionThresholdAnalysis = {
  threshold: number;
  performance: RoutePredictionPerformance;
};

function classificationAtThreshold(
  evaluation: RoutePredictionThresholdEvaluation,
  threshold: number
): RoutePredictionClassification {
  const predictedAdverseEvent =
    evaluation.predictedRiskScore >= threshold;

  if (
    predictedAdverseEvent &&
    evaluation.observedAdverseEvent
  ) {
    return "true_positive";
  }

  if (
    predictedAdverseEvent &&
    !evaluation.observedAdverseEvent
  ) {
    return "false_positive";
  }

  if (
    !predictedAdverseEvent &&
    evaluation.observedAdverseEvent
  ) {
    return "false_negative";
  }

  return "true_negative";
}

export function analyzeRoutePredictionThresholds(
  evaluations: RoutePredictionThresholdEvaluation[]
): RoutePredictionThresholdAnalysis[] {
  return Array.from(
    {
      length: 101,
    },
    (_, threshold) => {
      const classifiedEvaluations = evaluations.map(
        (evaluation) => ({
          classification: classificationAtThreshold(
            evaluation,
            threshold
          ),
        })
      );

      return {
        threshold,
        performance:
          calculateRoutePredictionPerformance(
            classifiedEvaluations
          ),
      };
    }
  );
}
