import {
  HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION,
  type HsppAssemblyCorroborationSupportResult,
} from "./evaluateHsppAssemblyCorroborationSupport";

export const HSPP_MEMBER_CORROBORATION_VERSION =
  "hspp-member-corroboration-v1" as const;

export type HsppMemberCorroborationState =
  | "MEMBER_CORROBORATION_ELIGIBLE"
  | "MEMBER_CORROBORATION_DENIED";

export type HsppMemberCorroborationReason =
  | "INDEPENDENT_SUPPORT_PRESENT"
  | "UNSUPPORTED_CORROBORATION_SUPPORT_VERSION"
  | "ASSEMBLY_CORROBORATION_NOT_SUPPORTED"
  | "AUTHORITY_NOT_NONE"
  | "INVALID_MEMBER_SET"
  | "TARGET_NOT_IN_ASSEMBLY"
  | "TARGET_IDENTITY_MISMATCH"
  | "TARGET_INTEGRITY_NOT_MATCH"
  | "TARGET_NOT_VALIDATED"
  | "TARGET_CONFLICT_PRESENT"
  | "SAME_PROVIDER_ONLY"
  | "NO_INDEPENDENT_SUPPORT";

export type HsppMemberCorroborationEvidence = {
  evidenceId:
    string;

  integrityFingerprint:
    string;

  sourceProvider:
    string;

  sourceClass:
    string;

  observedAt:
    string;

  integrityStatus:
    "MATCH" | "MISMATCH" | "UNKNOWN";

  validationState:
    string;
};

export type HsppMemberCorroborationRelation = {
  leftEvidenceId:
    string;

  rightEvidenceId:
    string;

  /*
   * This must represent an already established assembly-membership
   * decision. B11F4 does not recreate B11A2's temporal, geographic,
   * event-type or source-class compatibility rules.
   */
  membershipEligible:
    boolean;

  membershipPolicyVersion:
    string;

  canonicalRelation:
    "AGREE" | "UNKNOWN" | "CONFLICT";
};

export type EvaluateHsppMemberCorroborationInput = {
  corroborationSupport:
    HsppAssemblyCorroborationSupportResult;

  targetEvidenceId:
    string;

  targetIntegrityFingerprint:
    string;

  members:
    HsppMemberCorroborationEvidence[];

  relations:
    HsppMemberCorroborationRelation[];
};

export type HsppMemberCorroborationDecision = {
  policyVersion:
    typeof HSPP_MEMBER_CORROBORATION_VERSION;

  state:
    HsppMemberCorroborationState;

  reason:
    HsppMemberCorroborationReason;

  organizationId:
    string;

  assemblyId:
    string;

  assemblyDecisionId:
    string;

  targetEvidenceId:
    string;

  targetIntegrityFingerprint:
    string;

  supportingEvidenceIds:
    string[];

  independentSupportCount:
    number;

  /*
   * B11F4 determines member-specific corroboration eligibility only.
   *
   * MEMBER_CORROBORATION_ELIGIBLE does NOT mean:
   *
   * - trustState CORROBORATED has been assigned;
   * - trustState VERIFIED has been assigned;
   * - physical-world truth has been established;
   * - operational eligibility has been granted;
   * - Crowd eligibility has been granted;
   * - ML training eligibility has been granted;
   * - validation eligibility has been granted.
   *
   * A later protocol slice must independently construct any
   * HsppAssessmentDecision and must still pass the existing
   * assessment-application safety boundary.
   */
  authority:
    "NONE";
};

function normalizedIdentity(
  value: string
): string {
  return value.trim();
}

function validFingerprint(
  value: string
): boolean {
  return /^[a-f0-9]{64}$/.test(
    value
  );
}

function validObservedAt(
  value: string
): boolean {
  const timestamp =
    Date.parse(value);

  return Number.isFinite(
    timestamp
  );
}

function denied(
  input:
    EvaluateHsppMemberCorroborationInput,
  reason:
    HsppMemberCorroborationReason
): HsppMemberCorroborationDecision {
  return {
    policyVersion:
      HSPP_MEMBER_CORROBORATION_VERSION,

    state:
      "MEMBER_CORROBORATION_DENIED",

    reason,

    organizationId:
      input.corroborationSupport.organizationId,

    assemblyId:
      input.corroborationSupport.assemblyId,

    assemblyDecisionId:
      input.corroborationSupport.assemblyDecisionId,

    targetEvidenceId:
      input.targetEvidenceId,

    targetIntegrityFingerprint:
      input.targetIntegrityFingerprint,

    supportingEvidenceIds:
      [],

    independentSupportCount:
      0,

    authority:
      "NONE",
  };
}

/**
 * HSPP B11F4 member-specific corroboration eligibility.
 *
 * This policy does not promote trust.
 *
 * It answers one question only:
 *
 * Does this exact immutable evidence member have at least one
 * independently sourced, compatible, integrity-valid, validated
 * member that canonically agrees with it without a known conflict?
 *
 * Compatibility itself remains owned by the earlier membership
 * policy. B11F4 consumes membershipEligible rather than inventing
 * a second temporal/geographic/source compatibility policy.
 */
export function evaluateHsppMemberCorroboration(
  input:
    EvaluateHsppMemberCorroborationInput
): HsppMemberCorroborationDecision {
  const support =
    input.corroborationSupport;

  if (
    support.policyVersion !==
    HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION
  ) {
    return denied(
      input,
      "UNSUPPORTED_CORROBORATION_SUPPORT_VERSION"
    );
  }

  if (
    support.state !==
      "CORROBORATION_SUPPORTED" ||
    support.reason !==
      "SUPPORTED_ASSESSMENT_CONTEXT"
  ) {
    return denied(
      input,
      "ASSEMBLY_CORROBORATION_NOT_SUPPORTED"
    );
  }

  if (
    support.authority !==
    "NONE"
  ) {
    return denied(
      input,
      "AUTHORITY_NOT_NONE"
    );
  }

  const targetEvidenceId =
    normalizedIdentity(
      input.targetEvidenceId
    );

  const targetFingerprint =
    normalizedIdentity(
      input.targetIntegrityFingerprint
    );

  if (
    !targetEvidenceId ||
    !validFingerprint(
      targetFingerprint
    )
  ) {
    return denied(
      input,
      "TARGET_IDENTITY_MISMATCH"
    );
  }

  if (
    !Array.isArray(input.members) ||
    input.members.length < 2 ||
    input.members.length !==
      support.evidenceCount
  ) {
    return denied(
      input,
      "INVALID_MEMBER_SET"
    );
  }

  const supportEvidenceIds =
    new Set(
      support.evidenceIds
    );

  const membersById =
    new Map<
      string,
      HsppMemberCorroborationEvidence
    >();

  for (
    const member of
    input.members
  ) {
    const evidenceId =
      normalizedIdentity(
        member.evidenceId
      );

    const fingerprint =
      normalizedIdentity(
        member.integrityFingerprint
      );

    const provider =
      normalizedIdentity(
        member.sourceProvider
      );

    const sourceClass =
      normalizedIdentity(
        member.sourceClass
      );

    if (
      !evidenceId ||
      !validFingerprint(
        fingerprint
      ) ||
      !provider ||
      !sourceClass ||
      !validObservedAt(
        member.observedAt
      )
    ) {
      return denied(
        input,
        "INVALID_MEMBER_SET"
      );
    }

    if (
      !supportEvidenceIds.has(
        evidenceId
      )
    ) {
      return denied(
        input,
        "INVALID_MEMBER_SET"
      );
    }

    if (
      membersById.has(
        evidenceId
      )
    ) {
      return denied(
        input,
        "INVALID_MEMBER_SET"
      );
    }

    membersById.set(
      evidenceId,
      {
        ...member,
        evidenceId,
        integrityFingerprint:
          fingerprint,
        sourceProvider:
          provider,
        sourceClass,
      }
    );
  }

  if (
    membersById.size !==
    supportEvidenceIds.size
  ) {
    return denied(
      input,
      "INVALID_MEMBER_SET"
    );
  }

  const target =
    membersById.get(
      targetEvidenceId
    );

  if (!target) {
    return denied(
      input,
      "TARGET_NOT_IN_ASSEMBLY"
    );
  }

  if (
    target.integrityFingerprint !==
    targetFingerprint
  ) {
    return denied(
      input,
      "TARGET_IDENTITY_MISMATCH"
    );
  }

  if (
    target.integrityStatus !==
    "MATCH"
  ) {
    return denied(
      input,
      "TARGET_INTEGRITY_NOT_MATCH"
    );
  }

  if (
    target.validationState !==
    "VALIDATED"
  ) {
    return denied(
      input,
      "TARGET_NOT_VALIDATED"
    );
  }

  let sameProviderSupportSeen =
    false;

  const independentSupport =
    new Set<string>();

  for (
    const relation of
    input.relations
  ) {
    const left =
      normalizedIdentity(
        relation.leftEvidenceId
      );

    const right =
      normalizedIdentity(
        relation.rightEvidenceId
      );

    const involvesTarget =
      left === targetEvidenceId ||
      right === targetEvidenceId;

    if (!involvesTarget) {
      continue;
    }

    const otherEvidenceId =
      left === targetEvidenceId
        ? right
        : left;

    if (
      !otherEvidenceId ||
      otherEvidenceId ===
        targetEvidenceId
    ) {
      continue;
    }

    const other =
      membersById.get(
        otherEvidenceId
      );

    if (!other) {
      continue;
    }

    if (
      relation.canonicalRelation ===
      "CONFLICT"
    ) {
      return denied(
        input,
        "TARGET_CONFLICT_PRESENT"
      );
    }

    if (
      relation.canonicalRelation !==
      "AGREE"
    ) {
      continue;
    }

    if (
      !relation.membershipEligible ||
      !normalizedIdentity(
        relation.membershipPolicyVersion
      )
    ) {
      continue;
    }

    if (
      other.integrityStatus !==
      "MATCH" ||
      other.validationState !==
      "VALIDATED"
    ) {
      continue;
    }

    if (
      other.sourceProvider ===
      target.sourceProvider
    ) {
      sameProviderSupportSeen =
        true;

      continue;
    }

    independentSupport.add(
      other.evidenceId
    );
  }

  if (
    independentSupport.size ===
    0
  ) {
    return denied(
      input,
      sameProviderSupportSeen
        ? "SAME_PROVIDER_ONLY"
        : "NO_INDEPENDENT_SUPPORT"
    );
  }

  const supportingEvidenceIds =
    Array.from(
      independentSupport
    ).sort();

  return {
    policyVersion:
      HSPP_MEMBER_CORROBORATION_VERSION,

    state:
      "MEMBER_CORROBORATION_ELIGIBLE",

    reason:
      "INDEPENDENT_SUPPORT_PRESENT",

    organizationId:
      support.organizationId,

    assemblyId:
      support.assemblyId,

    assemblyDecisionId:
      support.assemblyDecisionId,

    targetEvidenceId,

    targetIntegrityFingerprint:
      targetFingerprint,

    supportingEvidenceIds,

    independentSupportCount:
      supportingEvidenceIds.length,

    authority:
      "NONE",
  };
}