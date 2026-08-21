import {
  HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION,
  type HsppAssemblyAssessmentInput,
} from "./buildHsppAssemblyAssessmentInput";

export const HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION =
  "hspp-assembly-corroboration-support-v1" as const;

export type HsppAssemblyCorroborationSupportState =
  | "CORROBORATION_SUPPORTED"
  | "CORROBORATION_NOT_SUPPORTED";

export type HsppAssemblyCorroborationSupportReason =
  | "SUPPORTED_ASSESSMENT_CONTEXT"
  | "UNSUPPORTED_ASSESSMENT_CONTEXT_VERSION"
  | "ASSESSMENT_CONTEXT_NOT_CANDIDATE"
  | "AUTHORITY_NOT_NONE"
  | "INSUFFICIENT_EVIDENCE"
  | "INVALID_EVIDENCE_MEMBERSHIP"
  | "DUPLICATE_EVIDENCE_IDENTITY";

export type HsppAssemblyCorroborationSupportResult = {
  policyVersion:
    typeof HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION;

  state:
    HsppAssemblyCorroborationSupportState;

  reason:
    HsppAssemblyCorroborationSupportReason;

  organizationId:
    string;

  assemblyId:
    string;

  assemblyDecisionId:
    string;

  assessmentContextVersion:
    string;

  evidenceCount:
    number;

  evidenceIds:
    string[];

  /*
   * B11F3 is assembly-level support only.
   *
   * CORROBORATION_SUPPORTED means that the already validated,
   * versioned B11F2 context is structurally suitable to support
   * a later member-specific corroboration assessment.
   *
   * It does NOT mean:
   *
   * - any member has trustState CORROBORATED;
   * - any member has trustState VERIFIED;
   * - physical-world truth has been established;
   * - operational eligibility is granted;
   * - Crowd eligibility is granted;
   * - ML training eligibility is granted;
   * - validation eligibility is granted.
   *
   * B11F3 does not produce HsppAssessmentDecision.
   * B11F3 does not invoke applyHsppAssessmentDecision().
   */
  authority:
    "NONE";
};

function result(
  input:
    HsppAssemblyAssessmentInput,
  state:
    HsppAssemblyCorroborationSupportState,
  reason:
    HsppAssemblyCorroborationSupportReason
): HsppAssemblyCorroborationSupportResult {
  return {
    policyVersion:
      HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION,

    state,
    reason,

    organizationId:
      input.organizationId,

    assemblyId:
      input.assemblyId,

    assemblyDecisionId:
      input.assemblyDecisionId,

    assessmentContextVersion:
      input.contextVersion,

    evidenceCount:
      input.evidenceCount,

    evidenceIds:
      input.evidence.map(
        member =>
          member.evidenceId
      ),

    authority:
      "NONE",
  };
}

export function evaluateHsppAssemblyCorroborationSupport(
  input:
    HsppAssemblyAssessmentInput
): HsppAssemblyCorroborationSupportResult {
  if (
    input.contextVersion !==
    HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION
  ) {
    return result(
      input,
      "CORROBORATION_NOT_SUPPORTED",
      "UNSUPPORTED_ASSESSMENT_CONTEXT_VERSION"
    );
  }

  if (
    input.authorityState !==
      "ASSESSMENT_CANDIDATE" ||
    input.authorityReason !==
      "CONSISTENT_ASSEMBLY_CANDIDATE"
  ) {
    return result(
      input,
      "CORROBORATION_NOT_SUPPORTED",
      "ASSESSMENT_CONTEXT_NOT_CANDIDATE"
    );
  }

  if (
    input.authority !==
    "NONE"
  ) {
    return result(
      input,
      "CORROBORATION_NOT_SUPPORTED",
      "AUTHORITY_NOT_NONE"
    );
  }

  if (
    !Array.isArray(input.evidence) ||
    input.evidenceCount < 2 ||
    input.evidence.length !==
      input.evidenceCount
  ) {
    return result(
      input,
      "CORROBORATION_NOT_SUPPORTED",
      "INSUFFICIENT_EVIDENCE"
    );
  }

  const evidenceIds =
    new Set<string>();

  for (
    let index = 0;
    index < input.evidence.length;
    index += 1
  ) {
    const member =
      input.evidence[index];

    if (
      member.memberOrdinal !==
      index + 1 ||
      !member.evidenceId.trim() ||
      !/^[a-f0-9]{64}$/.test(
        member.integrityFingerprint
      )
    ) {
      return result(
        input,
        "CORROBORATION_NOT_SUPPORTED",
        "INVALID_EVIDENCE_MEMBERSHIP"
      );
    }

    if (
      evidenceIds.has(
        member.evidenceId
      )
    ) {
      return result(
        input,
        "CORROBORATION_NOT_SUPPORTED",
        "DUPLICATE_EVIDENCE_IDENTITY"
      );
    }

    evidenceIds.add(
      member.evidenceId
    );
  }

  return result(
    input,
    "CORROBORATION_SUPPORTED",
    "SUPPORTED_ASSESSMENT_CONTEXT"
  );
}