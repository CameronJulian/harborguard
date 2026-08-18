import type {
  analyzeRouteRiskModelPromotionEvidence,
} from "@/lib/fleet/analyzeRouteRiskModelPromotionEvidence";

import type {
  RouteRiskShadowModelHealthEvidenceAssessment,
} from "@/lib/fleet/assessRouteRiskShadowModelHealthEvidence";

export const ROUTE_RISK_MODEL_PROMOTION_READINESS_ASSESSMENT_VERSION =
  "harborguard-route-risk-model-promotion-readiness-v1" as const;

export type RouteRiskModelPromotionReadinessState =
  | "INSUFFICIENT_EVIDENCE"
  | "READY_FOR_HUMAN_REVIEW";

export type RouteRiskModelPromotionReadinessPolicy = {
  policyVersion: string;

  minimumEvaluatedPredictions: number;

  minimumUniqueVehicles: number;

  minimumEvidenceSpanDays: number;

  minimumEvaluationCoverageRate: number;

  maximumLargestVehicleShare: number;
};

export type RouteRiskModelPromotionReadinessInput = {
  promotionEvidence:
    ReturnType<
      typeof analyzeRouteRiskModelPromotionEvidence
    >;

  modelHealthEvidence:
    RouteRiskShadowModelHealthEvidenceAssessment;

  policy:
    RouteRiskModelPromotionReadinessPolicy;
};

export type RouteRiskModelPromotionReadinessAssessment = {
  assessmentVersion:
    typeof ROUTE_RISK_MODEL_PROMOTION_READINESS_ASSESSMENT_VERSION;

  policyVersion: string;

  state:
    RouteRiskModelPromotionReadinessState;

  semantics:
    "HUMAN_REVIEW_INPUT_ONLY_NO_ACTIVATION_AUTHORITY";

  reasonCodes: string[];

  checks: {
    evaluatedPredictions: {
      observed: number;
      requiredMinimum: number;
      satisfied: boolean;
    };

    uniqueVehicles: {
      observed: number;
      requiredMinimum: number;
      satisfied: boolean;
    };

    evidenceSpanDays: {
      observed: number | null;
      requiredMinimum: number;
      satisfied: boolean;
    };

    evaluationCoverageRate: {
      observed: number | null;
      requiredMinimum: number;
      satisfied: boolean;
    };

    largestVehicleShare: {
      observed: number | null;
      allowedMaximum: number;
      satisfied: boolean;
    };

    modelHealthStructuralEvidence: {
      observed:
        RouteRiskShadowModelHealthEvidenceAssessment["state"];

      required:
        "DESCRIPTIVE_EVIDENCE_AVAILABLE";

      satisfied: boolean;
    };
  };

  unresolvedStatisticalEvidence: {
    statisticalSufficiency:
      RouteRiskShadowModelHealthEvidenceAssessment["statisticalSufficiency"];

    unavailableEvidence:
      RouteRiskShadowModelHealthEvidenceAssessment["unavailableEvidence"];
  };
};

function requireNonNegativeInteger(
  value: number,
  fieldName: string
): number {
  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be a non-negative integer.`
    );
  }

  return value;
}

function requireNonNegativeNumber(
  value: number,
  fieldName: string
): number {
  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be a finite non-negative number.`
    );
  }

  return value;
}

function requireRate(
  value: number,
  fieldName: string
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${fieldName} must be a finite rate between 0 and 1.`
    );
  }

  return value;
}

function requirePolicyVersion(
  value: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      "policy.policyVersion is required."
    );
  }

  return normalized;
}

/**
 * Evaluates already-computed HarborGuard shadow evidence against one
 * explicit, externally supplied promotion-evidence policy.
 *
 * This helper deliberately separates descriptive evidence from lifecycle
 * authority.
 *
 * It:
 *
 * - consumes existing canonical descriptive evidence;
 * - consumes the existing structural model-health evidence assessment;
 * - evaluates deterministic policy checks;
 * - may indicate that evidence is ready for HUMAN review.
 *
 * It does NOT:
 *
 * - select or invent policy thresholds;
 * - establish statistical significance;
 * - establish calibration;
 * - classify model drift or health;
 * - approve a model;
 * - enter shadow mode;
 * - activate or retire a model;
 * - trigger retraining;
 * - select a production decision threshold;
 * - modify production Route Safety behavior.
 */
export function assessRouteRiskModelPromotionReadiness({
  promotionEvidence,
  modelHealthEvidence,
  policy,
}: RouteRiskModelPromotionReadinessInput): RouteRiskModelPromotionReadinessAssessment {
  const policyVersion =
    requirePolicyVersion(
      policy.policyVersion
    );

  const minimumEvaluatedPredictions =
    requireNonNegativeInteger(
      policy.minimumEvaluatedPredictions,
      "policy.minimumEvaluatedPredictions"
    );

  const minimumUniqueVehicles =
    requireNonNegativeInteger(
      policy.minimumUniqueVehicles,
      "policy.minimumUniqueVehicles"
    );

  const minimumEvidenceSpanDays =
    requireNonNegativeNumber(
      policy.minimumEvidenceSpanDays,
      "policy.minimumEvidenceSpanDays"
    );

  const minimumEvaluationCoverageRate =
    requireRate(
      policy.minimumEvaluationCoverageRate,
      "policy.minimumEvaluationCoverageRate"
    );

  const maximumLargestVehicleShare =
    requireRate(
      policy.maximumLargestVehicleShare,
      "policy.maximumLargestVehicleShare"
    );

  const evaluatedPredictionsSatisfied =
    promotionEvidence.evaluatedPredictionCount >=
      minimumEvaluatedPredictions;

  const uniqueVehiclesSatisfied =
    promotionEvidence.uniqueVehicleCount >=
      minimumUniqueVehicles;

  const evidenceSpanDaysSatisfied =
    promotionEvidence.evidenceSpanDays !== null &&
    promotionEvidence.evidenceSpanDays >=
      minimumEvidenceSpanDays;

  const evaluationCoverageRateSatisfied =
    promotionEvidence.evaluationCoverageRate !== null &&
    promotionEvidence.evaluationCoverageRate >=
      minimumEvaluationCoverageRate;

  const largestVehicleShareSatisfied =
    promotionEvidence.largestVehicleShare !== null &&
    promotionEvidence.largestVehicleShare <=
      maximumLargestVehicleShare;

  const modelHealthStructuralEvidenceSatisfied =
    modelHealthEvidence.state ===
      "DESCRIPTIVE_EVIDENCE_AVAILABLE";

  const reasonCodes: string[] = [];

  if (!evaluatedPredictionsSatisfied) {
    reasonCodes.push(
      "MINIMUM_EVALUATED_PREDICTIONS_NOT_MET"
    );
  }

  if (!uniqueVehiclesSatisfied) {
    reasonCodes.push(
      "MINIMUM_UNIQUE_VEHICLES_NOT_MET"
    );
  }

  if (!evidenceSpanDaysSatisfied) {
    reasonCodes.push(
      "MINIMUM_EVIDENCE_SPAN_NOT_MET"
    );
  }

  if (!evaluationCoverageRateSatisfied) {
    reasonCodes.push(
      "MINIMUM_EVALUATION_COVERAGE_NOT_MET"
    );
  }

  if (!largestVehicleShareSatisfied) {
    reasonCodes.push(
      "MAXIMUM_VEHICLE_CONCENTRATION_EXCEEDED"
    );
  }

  if (!modelHealthStructuralEvidenceSatisfied) {
    reasonCodes.push(
      "MODEL_HEALTH_DESCRIPTIVE_EVIDENCE_NOT_AVAILABLE"
    );
  }

  const readyForHumanReview =
    evaluatedPredictionsSatisfied &&
    uniqueVehiclesSatisfied &&
    evidenceSpanDaysSatisfied &&
    evaluationCoverageRateSatisfied &&
    largestVehicleShareSatisfied &&
    modelHealthStructuralEvidenceSatisfied;

  return {
    assessmentVersion:
      ROUTE_RISK_MODEL_PROMOTION_READINESS_ASSESSMENT_VERSION,

    policyVersion,

    state:
      readyForHumanReview
        ? "READY_FOR_HUMAN_REVIEW"
        : "INSUFFICIENT_EVIDENCE",

    semantics:
      "HUMAN_REVIEW_INPUT_ONLY_NO_ACTIVATION_AUTHORITY",

    reasonCodes,

    checks: {
      evaluatedPredictions: {
        observed:
          promotionEvidence.evaluatedPredictionCount,

        requiredMinimum:
          minimumEvaluatedPredictions,

        satisfied:
          evaluatedPredictionsSatisfied,
      },

      uniqueVehicles: {
        observed:
          promotionEvidence.uniqueVehicleCount,

        requiredMinimum:
          minimumUniqueVehicles,

        satisfied:
          uniqueVehiclesSatisfied,
      },

      evidenceSpanDays: {
        observed:
          promotionEvidence.evidenceSpanDays,

        requiredMinimum:
          minimumEvidenceSpanDays,

        satisfied:
          evidenceSpanDaysSatisfied,
      },

      evaluationCoverageRate: {
        observed:
          promotionEvidence.evaluationCoverageRate,

        requiredMinimum:
          minimumEvaluationCoverageRate,

        satisfied:
          evaluationCoverageRateSatisfied,
      },

      largestVehicleShare: {
        observed:
          promotionEvidence.largestVehicleShare,

        allowedMaximum:
          maximumLargestVehicleShare,

        satisfied:
          largestVehicleShareSatisfied,
      },

      modelHealthStructuralEvidence: {
        observed:
          modelHealthEvidence.state,

        required:
          "DESCRIPTIVE_EVIDENCE_AVAILABLE",

        satisfied:
          modelHealthStructuralEvidenceSatisfied,
      },
    },

    unresolvedStatisticalEvidence: {
      statisticalSufficiency:
        modelHealthEvidence.statisticalSufficiency,

      unavailableEvidence: [
        ...modelHealthEvidence.unavailableEvidence,
      ],
    },
  };
}
