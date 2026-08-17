export const ROUTE_RISK_SHADOW_MODEL_HEALTH_ANALYSIS_VERSION =
  "harborguard-route-risk-shadow-model-health-v1" as const;

export type RouteRiskShadowModelHealthEvaluation = {
  predictedProbability: unknown;
  observedAdverseEvent: unknown;
};

export type RouteRiskShadowModelHealthWindowMetrics = {
  totalInputCount: number;
  validEvaluationCount: number;
  excludedEvaluationCount: number;

  adverseEventCount: number;
  adverseEventRate: number | null;

  predictedProbability: {
    mean: number | null;
    median: number | null;
    min: number | null;
    max: number | null;
  };

  brierScore: number | null;
};

export type RouteRiskShadowModelHealthComparison = {
  analysisVersion:
    typeof ROUTE_RISK_SHADOW_MODEL_HEALTH_ANALYSIS_VERSION;

  semantics: "DESCRIPTIVE_ONLY_NO_DRIFT_THRESHOLD";

  reference: RouteRiskShadowModelHealthWindowMetrics;
  recent: RouteRiskShadowModelHealthWindowMetrics;

  delta: {
    adverseEventRate: number | null;
    predictedProbabilityMean: number | null;
    predictedProbabilityMedian: number | null;
    brierScore: number | null;
  };
};

function isValidProbability(
  value: unknown
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function median(values: number[]): number | null {
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

function mean(values: number[]): number | null {
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

function difference(
  recent: number | null,
  reference: number | null
): number | null {
  if (
    recent === null ||
    reference === null
  ) {
    return null;
  }

  return recent - reference;
}

function analyzeWindow(
  evaluations: RouteRiskShadowModelHealthEvaluation[]
): RouteRiskShadowModelHealthWindowMetrics {
  const validEvaluations =
    evaluations.filter(
      (
        evaluation
      ): evaluation is {
        predictedProbability: number;
        observedAdverseEvent: boolean;
      } =>
        isValidProbability(
          evaluation.predictedProbability
        ) &&
        typeof evaluation.observedAdverseEvent ===
          "boolean"
    );

  const probabilities =
    validEvaluations.map(
      (evaluation) =>
        evaluation.predictedProbability
    );

  const adverseEventCount =
    validEvaluations.filter(
      (evaluation) =>
        evaluation.observedAdverseEvent
    ).length;

  const brierValues =
    validEvaluations.map((evaluation) => {
      const observed =
        evaluation.observedAdverseEvent ? 1 : 0;

      return (
        evaluation.predictedProbability -
        observed
      ) ** 2;
    });

  return {
    totalInputCount: evaluations.length,
    validEvaluationCount:
      validEvaluations.length,
    excludedEvaluationCount:
      evaluations.length -
      validEvaluations.length,

    adverseEventCount,

    adverseEventRate:
      validEvaluations.length > 0
        ? adverseEventCount /
          validEvaluations.length
        : null,

    predictedProbability: {
      mean: mean(probabilities),
      median: median(probabilities),
      min:
        probabilities.length > 0
          ? Math.min(...probabilities)
          : null,
      max:
        probabilities.length > 0
          ? Math.max(...probabilities)
          : null,
    },

    brierScore: mean(brierValues),
  };
}

/**
 * Compares two immutable route-risk shadow-evaluation windows.
 *
 * This is descriptive model-health evidence only.
 *
 * It does NOT:
 * - establish a drift threshold;
 * - classify a model as healthy/degraded;
 * - establish calibration;
 * - approve/promote/activate a model;
 * - affect production Route Safety.
 */
export function analyzeRouteRiskShadowModelHealth({
  reference,
  recent,
}: {
  reference: RouteRiskShadowModelHealthEvaluation[];
  recent: RouteRiskShadowModelHealthEvaluation[];
}): RouteRiskShadowModelHealthComparison {
  const referenceMetrics =
    analyzeWindow(reference);

  const recentMetrics =
    analyzeWindow(recent);

  return {
    analysisVersion:
      ROUTE_RISK_SHADOW_MODEL_HEALTH_ANALYSIS_VERSION,

    semantics:
      "DESCRIPTIVE_ONLY_NO_DRIFT_THRESHOLD",

    reference: referenceMetrics,
    recent: recentMetrics,

    delta: {
      adverseEventRate: difference(
        recentMetrics.adverseEventRate,
        referenceMetrics.adverseEventRate
      ),

      predictedProbabilityMean: difference(
        recentMetrics.predictedProbability.mean,
        referenceMetrics.predictedProbability.mean
      ),

      predictedProbabilityMedian: difference(
        recentMetrics.predictedProbability.median,
        referenceMetrics.predictedProbability.median
      ),

      brierScore: difference(
        recentMetrics.brierScore,
        referenceMetrics.brierScore
      ),
    },
  };
}
