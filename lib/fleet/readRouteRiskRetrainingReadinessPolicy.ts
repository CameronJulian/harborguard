import "server-only";

import type {
  RouteRiskRetrainingReadinessPolicy,
} from "@/lib/fleet/assessRouteRiskRetrainingReadiness";

export const ROUTE_RISK_RETRAINING_POLICY_ENVIRONMENT_KEYS =
  {
    policyVersion:
      "ROUTE_RISK_RETRAINING_POLICY_VERSION",

    minimumTotalExamples:
      "ROUTE_RISK_RETRAINING_MIN_TOTAL_EXAMPLES",

    minimumTrainingExamples:
      "ROUTE_RISK_RETRAINING_MIN_TRAINING_EXAMPLES",

    minimumValidationExamples:
      "ROUTE_RISK_RETRAINING_MIN_VALIDATION_EXAMPLES",

    minimumTestExamples:
      "ROUTE_RISK_RETRAINING_MIN_TEST_EXAMPLES",

    minimumTrainingPositiveExamples:
      "ROUTE_RISK_RETRAINING_MIN_TRAINING_POSITIVE_EXAMPLES",

    minimumTrainingNegativeExamples:
      "ROUTE_RISK_RETRAINING_MIN_TRAINING_NEGATIVE_EXAMPLES",
  } as const;

export type RouteRiskRetrainingPolicyEnvironment =
  Readonly<
    Record<
      string,
      string | undefined
    >
  >;

function requireConfiguredValue(
  environment: RouteRiskRetrainingPolicyEnvironment,
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
  environment: RouteRiskRetrainingPolicyEnvironment,
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

/**
 * Reads one explicit versioned HarborGuard route-risk retraining
 * readiness policy from server-side configuration.
 *
 * This loader does not define or invent retraining thresholds.
 * Every policy value must be supplied explicitly by configuration.
 *
 * These structural minimums do not establish statistical
 * sufficiency, statistical significance, or population
 * representativeness.
 *
 * It does NOT:
 *
 * - read client-controlled request input;
 * - select statistical thresholds;
 * - establish statistical significance;
 * - assess retraining readiness itself;
 * - execute training;
 * - persist a training run;
 * - register a lifecycle candidate;
 * - approve a candidate;
 * - enter shadow mode;
 * - activate or retire a model;
 * - modify production Route Safety behavior.
 */
export function readRouteRiskRetrainingReadinessPolicy(
  environment:
    RouteRiskRetrainingPolicyEnvironment =
      process.env
): RouteRiskRetrainingReadinessPolicy {
  const keys =
    ROUTE_RISK_RETRAINING_POLICY_ENVIRONMENT_KEYS;

  return {
    policyVersion:
      requireConfiguredValue(
        environment,
        keys.policyVersion
      ),

    minimumTotalExamples:
      parseNonNegativeInteger(
        environment,
        keys.minimumTotalExamples
      ),

    minimumTrainingExamples:
      parseNonNegativeInteger(
        environment,
        keys.minimumTrainingExamples
      ),

    minimumValidationExamples:
      parseNonNegativeInteger(
        environment,
        keys.minimumValidationExamples
      ),

    minimumTestExamples:
      parseNonNegativeInteger(
        environment,
        keys.minimumTestExamples
      ),

    minimumTrainingPositiveExamples:
      parseNonNegativeInteger(
        environment,
        keys.minimumTrainingPositiveExamples
      ),

    minimumTrainingNegativeExamples:
      parseNonNegativeInteger(
        environment,
        keys.minimumTrainingNegativeExamples
      ),
  };
}
