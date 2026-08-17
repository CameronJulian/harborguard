import "server-only";

import type {
  RouteRiskModelPromotionReadinessPolicy,
} from "@/lib/fleet/assessRouteRiskModelPromotionReadiness";

export const ROUTE_RISK_MODEL_PROMOTION_POLICY_ENVIRONMENT_KEYS =
  {
    policyVersion:
      "ROUTE_RISK_PROMOTION_POLICY_VERSION",

    minimumValidShadowEvaluations:
      "ROUTE_RISK_PROMOTION_MIN_VALID_SHADOW_EVALUATIONS",

    minimumUniqueVehicles:
      "ROUTE_RISK_PROMOTION_MIN_UNIQUE_VEHICLES",

    minimumEvidenceSpanDays:
      "ROUTE_RISK_PROMOTION_MIN_EVIDENCE_SPAN_DAYS",

    minimumShadowEvidenceCoverageRate:
      "ROUTE_RISK_PROMOTION_MIN_SHADOW_EVIDENCE_COVERAGE_RATE",

    minimumExplicitVersionCoverageRate:
      "ROUTE_RISK_PROMOTION_MIN_EXPLICIT_VERSION_COVERAGE_RATE",

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

    minimumValidShadowEvaluations:
      parseNonNegativeInteger(
        environment,
        keys.minimumValidShadowEvaluations
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

    minimumShadowEvidenceCoverageRate:
      parseRate(
        environment,
        keys.minimumShadowEvidenceCoverageRate
      ),

    minimumExplicitVersionCoverageRate:
      parseRate(
        environment,
        keys.minimumExplicitVersionCoverageRate
      ),

    maximumLargestVehicleShare:
      parseRate(
        environment,
        keys.maximumLargestVehicleShare
      ),
  };
}
