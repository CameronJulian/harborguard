import type {
  ReadAndVerifyHsppEvidenceResult,
} from "@/lib/hspp/readAndVerifyHsppEvidence";

export const HSPP_OPERATIONAL_USE_POLICY_VERSION =
  "hspp-operational-use-v1" as const;

export type HsppOperationalUseDecision = {
  policyVersion:
    typeof HSPP_OPERATIONAL_USE_POLICY_VERSION;

  allowed: boolean;

  reason:
    | "evidence_not_found"
    | "integrity_not_verified"
    | "validation_not_validated"
    | "assessment_missing"
    | "trust_not_operational"
    | "operational_not_eligible"
    | "operational_use_allowed";
};

const OPERATIONAL_TRUST_STATES =
  new Set([
    "PLAUSIBLE",
    "CORROBORATED",
    "VERIFIED",
  ]);

export function decideHsppOperationalUse(
  result: ReadAndVerifyHsppEvidenceResult
): HsppOperationalUseDecision {
  const base = {
    policyVersion:
      HSPP_OPERATIONAL_USE_POLICY_VERSION,
  };

  if (!result.found) {
    return {
      ...base,
      allowed: false,
      reason: "evidence_not_found",
    };
  }

  if (
    result.verification.status !== "MATCH"
  ) {
    return {
      ...base,
      allowed: false,
      reason: "integrity_not_verified",
    };
  }

  if (
    result.evidence.validationState !==
    "VALIDATED"
  ) {
    return {
      ...base,
      allowed: false,
      reason: "validation_not_validated",
    };
  }

  if (
    !result.evidence.assessmentPolicyVersion ||
    !result.evidence.assessmentReason ||
    !result.evidence.assessedAt
  ) {
    return {
      ...base,
      allowed: false,
      reason: "assessment_missing",
    };
  }

  if (
    !OPERATIONAL_TRUST_STATES.has(
      result.evidence.trustState
    )
  ) {
    return {
      ...base,
      allowed: false,
      reason: "trust_not_operational",
    };
  }

  if (
    result.evidence.operationalEligible !==
    true
  ) {
    return {
      ...base,
      allowed: false,
      reason: "operational_not_eligible",
    };
  }

  return {
    ...base,
    allowed: true,
    reason: "operational_use_allowed",
  };
}
