import {
  HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,
  type HsppPersistedCorroboratedMemberAssessment,
} from "./persistHsppCorroboratedMemberAssessment";

import {
  HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
} from "./assessHsppCorroboratedMember";

export const HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION =
  "hspp-corroborated-operational-authority-v1" as const;

export type HsppCorroboratedOperationalAuthorityState =
  | "OPERATIONAL_AUTHORITY_DENIED"
  | "OPERATIONAL_AUTHORITY_CANDIDATE";

export type HsppCorroboratedOperationalAuthorityReason =
  | "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET"
  | "UNSUPPORTED_PERSISTENCE_VERSION"
  | "CORROBORATED_ASSESSMENT_NOT_PERSISTED"
  | "INCOMPLETE_PROVENANCE_IDENTITY"
  | "INVALID_INTEGRITY_FINGERPRINT"
  | "UNSUPPORTED_ASSESSMENT_POLICY"
  | "TRUST_NOT_CORROBORATED"
  | "UPSTREAM_OPERATIONAL_AUTHORITY_PRESENT"
  | "INVALID_SUPPORT_CARDINALITY"
  | "INVALID_SUPPORTER_IDENTITY";

export type HsppCorroboratedOperationalAuthorityDecision = {
  policyVersion:
    typeof HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION;

  state:
    HsppCorroboratedOperationalAuthorityState;

  reason:
    HsppCorroboratedOperationalAuthorityReason;

  organizationId:
    string;

  assemblyId:
    string;

  assemblyDecisionId:
    string;

  evidenceId:
    string;

  integrityFingerprint:
    string;

  supportingEvidenceIds:
    string[];

  independentSupportCount:
    number;

  sourcePersistenceVersion:
    string;

  sourceAssessmentPolicyVersion:
    string;

  trustState:
    "CORROBORATED";

  /*
   * B11G2 determines operational-authority candidacy only.
   *
   * OPERATIONAL_AUTHORITY_CANDIDATE means that the exact immutable
   * target has survived the complete B11F corroboration chain and
   * is structurally suitable for a later explicit operational
   * authority decision.
   *
   * It does NOT mean:
   *
   * - operationalEligible has become true;
   * - operational use is currently allowed;
   * - OPERATIONAL_AUTHORITY_GRANTED has occurred;
   * - Crowd eligibility is granted;
   * - ML training eligibility is granted;
   * - validation eligibility is granted;
   * - VERIFIED trust is assigned;
   * - physical-world truth is established.
   *
   * B11G2 is intentionally pure and performs no persistence.
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

function result(
  input:
    HsppPersistedCorroboratedMemberAssessment,
  state:
    HsppCorroboratedOperationalAuthorityState,
  reason:
    HsppCorroboratedOperationalAuthorityReason
): HsppCorroboratedOperationalAuthorityDecision {
  return {
    policyVersion:
      HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    state,

    reason,

    organizationId:
      normalizedIdentity(
        input.organizationId
      ),

    assemblyId:
      normalizedIdentity(
        input.assemblyId
      ),

    assemblyDecisionId:
      normalizedIdentity(
        input.assemblyDecisionId
      ),

    evidenceId:
      normalizedIdentity(
        input.evidenceId
      ),

    integrityFingerprint:
      input.integrityFingerprint.trim(),

    supportingEvidenceIds:
      input.supportingEvidenceIds
        .map(normalizedIdentity)
        .sort(),

    independentSupportCount:
      input.independentSupportCount,

    sourcePersistenceVersion:
      input.persistenceVersion,

    sourceAssessmentPolicyVersion:
      input.assessmentPolicyVersion,

    trustState:
      "CORROBORATED",

    authority:
      "NONE",
  };
}

/**
 * HSPP B11G2.
 *
 * Converts a safely persisted B11F6 corroborated assessment into
 * an operational-authority candidacy decision.
 *
 * This function deliberately does not mutate HSPP evidence.
 */
export function evaluateHsppCorroboratedOperationalAuthority(
  input:
    HsppPersistedCorroboratedMemberAssessment
): HsppCorroboratedOperationalAuthorityDecision {
  if (
    input.persistenceVersion !==
    HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION
  ) {
    return result(
      input,
      "OPERATIONAL_AUTHORITY_DENIED",
      "UNSUPPORTED_PERSISTENCE_VERSION"
    );
  }

  if (
    input.state !==
    "CORROBORATED_ASSESSMENT_PERSISTED"
  ) {
    return result(
      input,
      "OPERATIONAL_AUTHORITY_DENIED",
      "CORROBORATED_ASSESSMENT_NOT_PERSISTED"
    );
  }

  const organizationId =
    normalizedIdentity(
      input.organizationId
    );

  const assemblyId =
    normalizedIdentity(
      input.assemblyId
    );

  const assemblyDecisionId =
    normalizedIdentity(
      input.assemblyDecisionId
    );

  const evidenceId =
    normalizedIdentity(
      input.evidenceId
    );

  if (
    !organizationId ||
    !assemblyId ||
    !assemblyDecisionId ||
    !evidenceId
  ) {
    return result(
      input,
      "OPERATIONAL_AUTHORITY_DENIED",
      "INCOMPLETE_PROVENANCE_IDENTITY"
    );
  }

  if (
    !validFingerprint(
      input.integrityFingerprint
    )
  ) {
    return result(
      input,
      "OPERATIONAL_AUTHORITY_DENIED",
      "INVALID_INTEGRITY_FINGERPRINT"
    );
  }

  if (
    input.assessmentPolicyVersion !==
    HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION
  ) {
    return result(
      input,
      "OPERATIONAL_AUTHORITY_DENIED",
      "UNSUPPORTED_ASSESSMENT_POLICY"
    );
  }

  if (
    input.trustState !==
    "CORROBORATED"
  ) {
    return result(
      input,
      "OPERATIONAL_AUTHORITY_DENIED",
      "TRUST_NOT_CORROBORATED"
    );
  }

  /*
   * B11F6 must have persisted CORROBORATED trust while leaving
   * operational authority explicitly disabled.
   *
   * If authority is already present, B11G2 refuses to reinterpret
   * or bless that state.
   */
  if (
    input.operationalEligible !==
    false
  ) {
    return result(
      input,
      "OPERATIONAL_AUTHORITY_DENIED",
      "UPSTREAM_OPERATIONAL_AUTHORITY_PRESENT"
    );
  }

  if (
    !Number.isInteger(
      input.independentSupportCount
    ) ||
    input.independentSupportCount < 1 ||
    input.supportingEvidenceIds.length !==
      input.independentSupportCount
  ) {
    return result(
      input,
      "OPERATIONAL_AUTHORITY_DENIED",
      "INVALID_SUPPORT_CARDINALITY"
    );
  }

  const supporters =
    input.supportingEvidenceIds.map(
      normalizedIdentity
    );

  if (
    supporters.some(
      supporter =>
        !supporter ||
        supporter ===
          evidenceId
    ) ||
    new Set(
      supporters
    ).size !==
      supporters.length
  ) {
    return result(
      input,
      "OPERATIONAL_AUTHORITY_DENIED",
      "INVALID_SUPPORTER_IDENTITY"
    );
  }

  return result(
    input,
    "OPERATIONAL_AUTHORITY_CANDIDATE",
    "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET"
  );
}