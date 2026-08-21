import type {
  HsppAssessmentDecision,
} from "./hsppAssessmentDecision";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  type HsppMemberCorroborationDecision,
} from "./evaluateHsppMemberCorroboration";

export const HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION =
  "hspp-member-corroborated-assessment-v1" as const;

export type HsppCorroboratedMemberAssessment =
  HsppAssessmentDecision & {
    policyVersion:
      typeof HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION;

    trustState:
      "UNASSESSED" | "CORROBORATED";

    operationalEligible:
      false;

    crowdEligible:
      false;

    trainingEligible:
      false;

    validationEligible:
      false;

    reason:
      | "INDEPENDENT_CORROBORATION_ACCEPTED"
      | "INDEPENDENT_CORROBORATION_DENIED";
  };

export type AssessHsppCorroboratedMemberInput = {
  corroborationDecision:
    HsppMemberCorroborationDecision;
};

/**
 * HSPP B11F5 controlled corroborated-trust transition.
 *
 * This is the first assembly-derived layer permitted to construct
 * an HsppAssessmentDecision carrying CORROBORATED trust.
 *
 * CORROBORATED means only that B11F4 proved independent,
 * member-specific corroborating support for the exact immutable
 * target evidence identity.
 *
 * It does NOT grant:
 *
 * - operational eligibility;
 * - Crowd eligibility;
 * - ML training eligibility;
 * - validation eligibility;
 * - VERIFIED trust;
 * - physical-world certainty.
 *
 * Persistence remains a separate boundary.
 * This function does not call applyHsppAssessmentDecision().
 */
export function assessHsppCorroboratedMember(
  input:
    AssessHsppCorroboratedMemberInput
): HsppCorroboratedMemberAssessment {
  const decision =
    input.corroborationDecision;

  const base = {
    policyVersion:
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    operationalEligible:
      false as const,

    crowdEligible:
      false as const,

    trainingEligible:
      false as const,

    validationEligible:
      false as const,
  };

  if (
    decision.policyVersion !==
    HSPP_MEMBER_CORROBORATION_VERSION
  ) {
    return {
      ...base,

      trustState:
        "UNASSESSED",

      reason:
        "INDEPENDENT_CORROBORATION_DENIED",
    };
  }

  if (
    decision.state !==
      "MEMBER_CORROBORATION_ELIGIBLE" ||
    decision.reason !==
      "INDEPENDENT_SUPPORT_PRESENT"
  ) {
    return {
      ...base,

      trustState:
        "UNASSESSED",

      reason:
        "INDEPENDENT_CORROBORATION_DENIED",
    };
  }

  if (
    decision.authority !==
    "NONE"
  ) {
    return {
      ...base,

      trustState:
        "UNASSESSED",

      reason:
        "INDEPENDENT_CORROBORATION_DENIED",
    };
  }

  if (
    !decision.targetEvidenceId.trim() ||
    !/^[a-f0-9]{64}$/.test(
      decision.targetIntegrityFingerprint
    )
  ) {
    return {
      ...base,

      trustState:
        "UNASSESSED",

      reason:
        "INDEPENDENT_CORROBORATION_DENIED",
    };
  }

  if (
    !Number.isInteger(
      decision.independentSupportCount
    ) ||
    decision.independentSupportCount < 1 ||
    decision.supportingEvidenceIds.length !==
      decision.independentSupportCount
  ) {
    return {
      ...base,

      trustState:
        "UNASSESSED",

      reason:
        "INDEPENDENT_CORROBORATION_DENIED",
    };
  }

  const supporterIds =
    decision.supportingEvidenceIds.map(
      evidenceId =>
        evidenceId.trim()
    );

  if (
    supporterIds.some(
      evidenceId =>
        !evidenceId ||
        evidenceId ===
          decision.targetEvidenceId
    )
  ) {
    return {
      ...base,

      trustState:
        "UNASSESSED",

      reason:
        "INDEPENDENT_CORROBORATION_DENIED",
    };
  }

  if (
    new Set(
      supporterIds
    ).size !==
    supporterIds.length
  ) {
    return {
      ...base,

      trustState:
        "UNASSESSED",

      reason:
        "INDEPENDENT_CORROBORATION_DENIED",
    };
  }

  return {
    ...base,

    trustState:
      "CORROBORATED",

    reason:
      "INDEPENDENT_CORROBORATION_ACCEPTED",
  };
}