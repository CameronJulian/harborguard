import "server-only";

import type {
  RouteRiskModelPromotionReadinessPolicy,
} from "@/lib/fleet/assessRouteRiskModelPromotionReadiness";

export const ROUTE_RISK_MODEL_PROMOTION_POLICY_ENVIRONMENT_KEYS =
  {
    policyVersion:
      "ROUTE_RISK_PROMOTION_POLICY_VERSION",

    minimumEvaluatedPredictions:
      "ROUTE_RISK_PROMOTION_MIN_EVALUATED_PREDICTIONS",

    minimumUniqueVehicles:
      "ROUTE_RISK_PROMOTION_MIN_UNIQUE_VEHICLES",

    minimumEvidenceSpanDays:
      "ROUTE_RISK_PROMOTION_MIN_EVIDENCE_SPAN_DAYS",

    minimumEvaluationCoverageRate:
      "ROUTE_RISK_PROMOTION_MIN_EVALUATION_COVERAGE_RATE",

    maximumLargestVehicleShare:
      "ROUTE_RISK_PROMOTION_MAX_LARGEST_VEHICLE_SHARE",
  } as const;

export type RouteRiskModelPromotionPolicyEnvironment =
  Readonly<
    Record<
      string,
      string | undefined
    >
  >;

function requireConfiguredValue(
  environment: RouteRiskModelPromotionPolicyEnvironment,
  key: string
): string {
  const raw =
    environment[key];

  if (
    typeof raw !== "string" ||
    !raw.trim()
  ) {
    throw new Error(
      `${key} is not configured.`
    );
  }

  return raw.trim();
}

function parseNonNegativeInteger(
  environment: RouteRiskModelPromotionPolicyEnvironment,
  key: string
): number {
  const raw =
    requireConfiguredValue(
      environment,
      key
    );

  const value =
    Number(raw);

  if (
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${key} must be a non-negative integer.`
    );
  }

  return value;
}

function parseNonNegativeNumber(
  environment: RouteRiskModelPromotionPolicyEnvironment,
  key: string
): number {
  const raw =
    requireConfiguredValue(
      environment,
      key
    );

  const value =
    Number(raw);

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${key} must be a finite non-negative number.`
    );
  }

  return value;
}

function parseRate(
  environment: RouteRiskModelPromotionPolicyEnvironment,
  key: string
): number {
  const raw =
    requireConfiguredValue(
      environment,
      key
    );

  const value =
    Number(raw);

  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(
      `${key} must be a finite rate between 0 and 1.`
    );
  }

  return value;
}

/**
 * Reads one explicit versioned HarborGuard route-risk promotion
 * readiness policy from server-side configuration.
 *
 * This loader does not define or invent promotion thresholds.
 * Every policy value must be supplied explicitly by configuration.
 *
 * It does NOT:
 *
 * - read client-controlled request input;
 * - select statistical thresholds;
 * - establish statistical significance;
 * - assess promotion readiness itself;
 * - approve a candidate;
 * - enter shadow mode;
 * - activate or retire a model;
 * - trigger retraining;
 * - modify production Route Safety behavior.
 */
export function readRouteRiskModelPromotionReadinessPolicy(
  environment:
    RouteRiskModelPromotionPolicyEnvironment =
      process.env
): RouteRiskModelPromotionReadinessPolicy {
  const keys =
    ROUTE_RISK_MODEL_PROMOTION_POLICY_ENVIRONMENT_KEYS;

  return {
    policyVersion:
      requireConfiguredValue(
        environment,
        keys.policyVersion
      ),

    minimumEvaluatedPredictions:
      parseNonNegativeInteger(
        environment,
        keys.minimumEvaluatedPredictions
      ),

    minimumUniqueVehicles:
      parseNonNegativeInteger(
        environment,
        keys.minimumUniqueVehicles
      ),

    minimumEvidenceSpanDays:
      parseNonNegativeNumber(
        environment,
        keys.minimumEvidenceSpanDays
      ),

    minimumEvaluationCoverageRate:
      parseRate(
        environment,
        keys.minimumEvaluationCoverageRate
      ),

    maximumLargestVehicleShare:
      parseRate(
        environment,
        keys.maximumLargestVehicleShare
      ),
  };
}
