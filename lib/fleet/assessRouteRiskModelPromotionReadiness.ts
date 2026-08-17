import type {
  analyzeRouteSoftCapShadowEvidence,
} from "@/lib/fleet/analyzeRouteSoftCapShadowEvidence";

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

  minimumValidShadowEvaluations: number;

  minimumUniqueVehicles: number;

  minimumEvidenceSpanDays: number;

  minimumShadowEvidenceCoverageRate: number;

  minimumExplicitVersionCoverageRate: number;

  maximumLargestVehicleShare: number;
};

export type RouteRiskModelPromotionReadinessInput = {
  shadowEvidence:
    ReturnType<
      typeof analyzeRouteSoftCapShadowEvidence
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
    validShadowEvaluations: {
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

    shadowEvidenceCoverageRate: {
      observed: number | null;
      requiredMinimum: number;
      satisfied: boolean;
    };

    explicitVersionCoverageRate: {
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
  shadowEvidence,
  modelHealthEvidence,
  policy,
}: RouteRiskModelPromotionReadinessInput): RouteRiskModelPromotionReadinessAssessment {
  const policyVersion =
    requirePolicyVersion(
      policy.policyVersion
    );

  const minimumValidShadowEvaluations =
    requireNonNegativeInteger(
      policy.minimumValidShadowEvaluations,
      "policy.minimumValidShadowEvaluations"
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

  const minimumShadowEvidenceCoverageRate =
    requireRate(
      policy.minimumShadowEvidenceCoverageRate,
      "policy.minimumShadowEvidenceCoverageRate"
    );

  const minimumExplicitVersionCoverageRate =
    requireRate(
      policy.minimumExplicitVersionCoverageRate,
      "policy.minimumExplicitVersionCoverageRate"
    );

  const maximumLargestVehicleShare =
    requireRate(
      policy.maximumLargestVehicleShare,
      "policy.maximumLargestVehicleShare"
    );

  const validShadowEvaluationsSatisfied =
    shadowEvidence.validShadowEvaluationCount >=
      minimumValidShadowEvaluations;

  const uniqueVehiclesSatisfied =
    shadowEvidence.uniqueVehicleCount >=
      minimumUniqueVehicles;

  const evidenceSpanDaysSatisfied =
    shadowEvidence.evidenceSpanDays !== null &&
    shadowEvidence.evidenceSpanDays >=
      minimumEvidenceSpanDays;

  const shadowEvidenceCoverageRateSatisfied =
    shadowEvidence.shadowEvidenceCoverageRate !== null &&
    shadowEvidence.shadowEvidenceCoverageRate >=
      minimumShadowEvidenceCoverageRate;

  const explicitVersionCoverageRate =
    shadowEvidence
      .scoringVersionDistribution
      .explicitVersionCoverageRate;

  const explicitVersionCoverageRateSatisfied =
    explicitVersionCoverageRate !== null &&
    explicitVersionCoverageRate >=
      minimumExplicitVersionCoverageRate;

  const largestVehicleShareSatisfied =
    shadowEvidence.largestVehicleShare !== null &&
    shadowEvidence.largestVehicleShare <=
      maximumLargestVehicleShare;

  const modelHealthStructuralEvidenceSatisfied =
    modelHealthEvidence.state ===
      "DESCRIPTIVE_EVIDENCE_AVAILABLE";

  const reasonCodes: string[] = [];

  if (!validShadowEvaluationsSatisfied) {
    reasonCodes.push(
      "MINIMUM_VALID_SHADOW_EVALUATIONS_NOT_MET"
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

  if (!shadowEvidenceCoverageRateSatisfied) {
    reasonCodes.push(
      "MINIMUM_SHADOW_EVIDENCE_COVERAGE_NOT_MET"
    );
  }

  if (!explicitVersionCoverageRateSatisfied) {
    reasonCodes.push(
      "MINIMUM_EXPLICIT_VERSION_COVERAGE_NOT_MET"
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
    validShadowEvaluationsSatisfied &&
    uniqueVehiclesSatisfied &&
    evidenceSpanDaysSatisfied &&
    shadowEvidenceCoverageRateSatisfied &&
    explicitVersionCoverageRateSatisfied &&
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
      validShadowEvaluations: {
        observed:
          shadowEvidence.validShadowEvaluationCount,

        requiredMinimum:
          minimumValidShadowEvaluations,

        satisfied:
          validShadowEvaluationsSatisfied,
      },

      uniqueVehicles: {
        observed:
          shadowEvidence.uniqueVehicleCount,

        requiredMinimum:
          minimumUniqueVehicles,

        satisfied:
          uniqueVehiclesSatisfied,
      },

      evidenceSpanDays: {
        observed:
          shadowEvidence.evidenceSpanDays,

        requiredMinimum:
          minimumEvidenceSpanDays,

        satisfied:
          evidenceSpanDaysSatisfied,
      },

      shadowEvidenceCoverageRate: {
        observed:
          shadowEvidence.shadowEvidenceCoverageRate,

        requiredMinimum:
          minimumShadowEvidenceCoverageRate,

        satisfied:
          shadowEvidenceCoverageRateSatisfied,
      },

      explicitVersionCoverageRate: {
        observed:
          explicitVersionCoverageRate,

        requiredMinimum:
          minimumExplicitVersionCoverageRate,

        satisfied:
          explicitVersionCoverageRateSatisfied,
      },

      largestVehicleShare: {
        observed:
          shadowEvidence.largestVehicleShare,

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
