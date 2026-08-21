import type { HsppOperationalUseDecision } from "@/lib/hspp/decideHsppOperationalUse";

export const HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION =
  "hspp-reservoir-eligibility-v1" as const;

export type HsppReservoirEligibilityReason =
  | "EVIDENCE_NOT_FOUND"
  | "INTEGRITY_NOT_VERIFIED"
  | "VALIDATION_NOT_VALIDATED"
  | "ASSESSMENT_MISSING"
  | "TRUST_NOT_ELIGIBLE"
  | "OPERATIONAL_NOT_ELIGIBLE"
  | "ALREADY_ASSEMBLED"
  | "RESERVOIR_ELIGIBLE";

export type HsppReservoirEligibilityInput = {
  operationalUseDecision: HsppOperationalUseDecision;
  hasAssemblyMembership: boolean;
};

export type HsppReservoirEligibilityDecision = {
  policyVersion: typeof HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION;

  eligible: boolean;

  reason: HsppReservoirEligibilityReason;
};

/**
 * B7490-06A deterministic Reservoir eligibility boundary.
 *
 * This function answers only:
 *
 *   "May this already-assessed HSPP evidence remain available
 *    outside an assembly for later assembly consideration?"
 *
 * Reservoir eligibility does NOT:
 *
 * - establish physical-world truth;
 * - create or modify an evidence assembly;
 * - select another evidence record;
 * - evaluate pairwise assembly membership;
 * - promote HSPP trust;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - schedule retry or background processing.
 */
export function evaluateHsppReservoirEligibility(
  input: HsppReservoirEligibilityInput,
): HsppReservoirEligibilityDecision {
  const base = {
    policyVersion: HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,
  };

  if (!input.operationalUseDecision.allowed) {
    switch (input.operationalUseDecision.reason) {
      case "evidence_not_found":
        return {
          ...base,
          eligible: false,
          reason: "EVIDENCE_NOT_FOUND",
        };

      case "integrity_not_verified":
        return {
          ...base,
          eligible: false,
          reason: "INTEGRITY_NOT_VERIFIED",
        };

      case "validation_not_validated":
        return {
          ...base,
          eligible: false,
          reason: "VALIDATION_NOT_VALIDATED",
        };

      case "assessment_missing":
        return {
          ...base,
          eligible: false,
          reason: "ASSESSMENT_MISSING",
        };

      case "trust_not_operational":
        return {
          ...base,
          eligible: false,
          reason: "TRUST_NOT_ELIGIBLE",
        };

      case "operational_not_eligible":
        return {
          ...base,
          eligible: false,
          reason: "OPERATIONAL_NOT_ELIGIBLE",
        };

      default:
        return {
          ...base,
          eligible: false,
          reason: "OPERATIONAL_NOT_ELIGIBLE",
        };
    }
  }

  if (input.hasAssemblyMembership) {
    return {
      ...base,
      eligible: false,
      reason: "ALREADY_ASSEMBLED",
    };
  }

  return {
    ...base,
    eligible: true,
    reason: "RESERVOIR_ELIGIBLE",
  };
}
