import type {
  RouteRiskShadowModelHealthComparison,
  RouteRiskShadowModelHealthWindowMetrics,
} from "@/lib/fleet/analyzeRouteRiskShadowModelHealth";

export const ROUTE_RISK_SHADOW_MODEL_HEALTH_EVIDENCE_ASSESSMENT_VERSION =
  "harborguard-route-risk-shadow-model-health-evidence-v1" as const;

export type RouteRiskShadowModelHealthEvidenceState =
  | "NO_EVIDENCE"
  | "LIMITED_EVIDENCE"
  | "DESCRIPTIVE_EVIDENCE_AVAILABLE";

export type RouteRiskShadowModelHealthStatisticalSufficiency =
  "NOT_ESTABLISHED";

export type RouteRiskShadowModelHealthEvidenceAssessment = {
  assessmentVersion:
    typeof ROUTE_RISK_SHADOW_MODEL_HEALTH_EVIDENCE_ASSESSMENT_VERSION;

  state: RouteRiskShadowModelHealthEvidenceState;

  statisticalSufficiency:
    RouteRiskShadowModelHealthStatisticalSufficiency;

  semantics:
    "STRUCTURAL_EVIDENCE_ONLY_NO_STATISTICAL_THRESHOLD";

  reasonCodes: string[];

  windows: {
    reference: RouteRiskShadowModelHealthWindowEvidence;
    recent: RouteRiskShadowModelHealthWindowEvidence;
  };

  unavailableEvidence: [
    "STATISTICAL_SAMPLE_SIZE_POLICY",
    "POPULATION_REPRESENTATIVENESS",
    "GEOGRAPHIC_REPRESENTATIVENESS",
    "TEMPORAL_REPRESENTATIVENESS",
    "CROWD_INTELLIGENCE_SCALE",
    "CALIBRATION_SIGNIFICANCE",
    "DRIFT_THRESHOLD",
  ];
};

export type RouteRiskShadowModelHealthWindowEvidence = {
  totalInputCount: number;
  validEvaluationCount: number;
  excludedEvaluationCount: number;

  hasAnyInputEvidence: boolean;
  hasValidDescriptiveEvidence: boolean;
  containsExcludedEvidence: boolean;
};

function assessWindow(
  metrics: RouteRiskShadowModelHealthWindowMetrics
): RouteRiskShadowModelHealthWindowEvidence {
  return {
    totalInputCount:
      metrics.totalInputCount,

    validEvaluationCount:
      metrics.validEvaluationCount,

    excludedEvaluationCount:
      metrics.excludedEvaluationCount,

    hasAnyInputEvidence:
      metrics.totalInputCount > 0,

    hasValidDescriptiveEvidence:
      metrics.validEvaluationCount > 0,

    containsExcludedEvidence:
      metrics.excludedEvaluationCount > 0,
  };
}

/**
 * Describes whether two model-health windows contain structurally usable
 * descriptive evidence.
 *
 * This assessment deliberately does not establish statistical sufficiency.
 *
 * It does NOT:
 * - define a minimum sample size;
 * - establish population representativeness;
 * - establish calibration significance;
 * - classify drift or degradation;
 * - trigger retraining;
 * - approve or activate a model;
 * - affect production Route Safety.
 */
export function assessRouteRiskShadowModelHealthEvidence(
  comparison: RouteRiskShadowModelHealthComparison
): RouteRiskShadowModelHealthEvidenceAssessment {
  const reference =
    assessWindow(comparison.reference);

  const recent =
    assessWindow(comparison.recent);

  const reasonCodes: string[] = [];

  if (!reference.hasAnyInputEvidence) {
    reasonCodes.push(
      "REFERENCE_WINDOW_EMPTY"
    );
  }

  if (!recent.hasAnyInputEvidence) {
    reasonCodes.push(
      "RECENT_WINDOW_EMPTY"
    );
  }

  if (
    reference.hasAnyInputEvidence &&
    !reference.hasValidDescriptiveEvidence
  ) {
    reasonCodes.push(
      "REFERENCE_WINDOW_NO_VALID_EVALUATIONS"
    );
  }

  if (
    recent.hasAnyInputEvidence &&
    !recent.hasValidDescriptiveEvidence
  ) {
    reasonCodes.push(
      "RECENT_WINDOW_NO_VALID_EVALUATIONS"
    );
  }

  if (reference.containsExcludedEvidence) {
    reasonCodes.push(
      "REFERENCE_WINDOW_EXCLUDED_EVALUATIONS"
    );
  }

  if (recent.containsExcludedEvidence) {
    reasonCodes.push(
      "RECENT_WINDOW_EXCLUDED_EVALUATIONS"
    );
  }

  reasonCodes.push(
    "STATISTICAL_SUFFICIENCY_NOT_ESTABLISHED",
    "POPULATION_REPRESENTATIVENESS_NOT_ESTABLISHED",
    "CROWD_INTELLIGENCE_SCALE_NOT_ESTABLISHED",
    "DRIFT_THRESHOLD_NOT_ESTABLISHED"
  );

  let state:
    RouteRiskShadowModelHealthEvidenceState;

  if (
    !reference.hasAnyInputEvidence &&
    !recent.hasAnyInputEvidence
  ) {
    state = "NO_EVIDENCE";
  } else if (
    !reference.hasValidDescriptiveEvidence ||
    !recent.hasValidDescriptiveEvidence
  ) {
    state = "LIMITED_EVIDENCE";
  } else {
    state =
      "DESCRIPTIVE_EVIDENCE_AVAILABLE";
  }

  return {
    assessmentVersion:
      ROUTE_RISK_SHADOW_MODEL_HEALTH_EVIDENCE_ASSESSMENT_VERSION,

    state,

    statisticalSufficiency:
      "NOT_ESTABLISHED",

    semantics:
      "STRUCTURAL_EVIDENCE_ONLY_NO_STATISTICAL_THRESHOLD",

    reasonCodes,

    windows: {
      reference,
      recent,
    },

    unavailableEvidence: [
      "STATISTICAL_SAMPLE_SIZE_POLICY",
      "POPULATION_REPRESENTATIVENESS",
      "GEOGRAPHIC_REPRESENTATIVENESS",
      "TEMPORAL_REPRESENTATIVENESS",
      "CROWD_INTELLIGENCE_SCALE",
      "CALIBRATION_SIGNIFICANCE",
      "DRIFT_THRESHOLD",
    ],
  };
}
