import {
  applyHsppAssessmentDecision,
  type AppliedHsppAssessmentDecision,
} from "./applyHsppAssessmentDecision";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  type HsppMemberCorroborationDecision,
} from "./evaluateHsppMemberCorroboration";

import {
  HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
  assessHsppCorroboratedMember,
  type HsppCorroboratedMemberAssessment,
} from "./assessHsppCorroboratedMember";

export const HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION =
  "hspp-member-corroborated-persistence-v1" as const;

export type PersistHsppCorroboratedMemberAssessmentInput = {
  supabase:
    any;

  corroborationDecision:
    HsppMemberCorroborationDecision;

  assessment:
    HsppCorroboratedMemberAssessment;

  /*
   * Deterministic retry identity.
   *
   * An identical B11F6 retry must reuse this exact logical
   * persistence timestamp. B11F6 never generates wall-clock time.
   */
  assessedAt:
    string;
};

export type HsppPersistedCorroboratedMemberAssessment = {
  persistenceVersion:
    typeof HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION;

  state:
    "CORROBORATED_ASSESSMENT_PERSISTED";

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

  assessmentPolicyVersion:
    typeof HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION;

  trustState:
    "CORROBORATED";

  operationalEligible:
    false;

  assessedAt:
    string;

  /*
   * B11F6 persists B11F5's controlled trust result only.
   *
   * The wrapper does not invent a second database write path.
   * The actual evidence mutation remains owned by the existing
   * applyHsppAssessmentDecision() boundary.
   *
   * Persistence of CORROBORATED trust does NOT grant:
   *
   * - operational authority;
   * - Crowd eligibility;
   * - ML training eligibility;
   * - validation eligibility;
   * - VERIFIED trust;
   * - physical-world certainty.
   */
  applied:
    AppliedHsppAssessmentDecision;
};

function fail(
  message: string
): never {
  throw new Error(
    message
  );
}

function normalizeAssessedAt(
  value: string
): string {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!normalized) {
    fail(
      "B11F6 assessedAt is required for deterministic retry identity."
    );
  }

  const parsed =
    new Date(
      normalized
    );

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    fail(
      "B11F6 assessedAt must be a valid date-time string."
    );
  }

  return parsed.toISOString();
}

function sameStringArray(
  left: string[],
  right: string[]
): boolean {
  if (
    left.length !==
    right.length
  ) {
    return false;
  }

  for (
    let index = 0;
    index < left.length;
    index += 1
  ) {
    if (
      left[index] !==
      right[index]
    ) {
      return false;
    }
  }

  return true;
}

/**
 * HSPP B11F6 controlled persistence boundary.
 *
 * This function verifies:
 *
 * 1. the exact B11F4 member corroboration decision;
 * 2. the supplied B11F5 assessment is exactly the assessment
 *    deterministically produced from that B11F4 decision;
 * 3. all downstream eligibility remains false;
 * 4. the exact tenant/evidence/fingerprint identity is handed to
 *    the existing generic assessment persistence boundary.
 *
 * It does not implement a second direct database mutation path.
 */
export async function persistHsppCorroboratedMemberAssessment(
  input:
    PersistHsppCorroboratedMemberAssessmentInput
): Promise<HsppPersistedCorroboratedMemberAssessment> {
  const corroboration =
    input.corroborationDecision;

  const assessment =
    input.assessment;

  /*
   * Normalize the caller-owned retry identity once.
   *
   * Equivalent date-time representations become one canonical
   * ISO timestamp, and no internal wall-clock value is generated.
   */
  const assessedAt =
    normalizeAssessedAt(
      input.assessedAt
    );

  if (
    corroboration.policyVersion !==
    HSPP_MEMBER_CORROBORATION_VERSION
  ) {
    fail(
      "B11F6 requires the canonical B11F4 member corroboration policy version."
    );
  }

  if (
    corroboration.state !==
      "MEMBER_CORROBORATION_ELIGIBLE" ||
    corroboration.reason !==
      "INDEPENDENT_SUPPORT_PRESENT"
  ) {
    fail(
      "B11F6 requires an eligible independently supported B11F4 member."
    );
  }

  if (
    corroboration.authority !==
    "NONE"
  ) {
    fail(
      "B11F6 requires B11F4 authority NONE."
    );
  }

  const organizationId =
    corroboration.organizationId.trim();

  const assemblyId =
    corroboration.assemblyId.trim();

  const assemblyDecisionId =
    corroboration.assemblyDecisionId.trim();

  const evidenceId =
    corroboration.targetEvidenceId.trim();

  const integrityFingerprint =
    corroboration.targetIntegrityFingerprint.trim();

  if (
    !organizationId ||
    !assemblyId ||
    !assemblyDecisionId ||
    !evidenceId
  ) {
    fail(
      "B11F6 requires complete B11F4 provenance identity."
    );
  }

  if (
    !/^[a-f0-9]{64}$/.test(
      integrityFingerprint
    )
  ) {
    fail(
      "B11F6 requires the exact lowercase SHA-256 target fingerprint."
    );
  }

  if (
    !Number.isInteger(
      corroboration.independentSupportCount
    ) ||
    corroboration.independentSupportCount < 1 ||
    corroboration.supportingEvidenceIds.length !==
      corroboration.independentSupportCount
  ) {
    fail(
      "B11F6 requires coherent independent corroboration provenance."
    );
  }

  const normalizedSupporters =
    corroboration.supportingEvidenceIds.map(
      supporter =>
        supporter.trim()
    );

  if (
    normalizedSupporters.some(
      supporter =>
        !supporter ||
        supporter ===
          evidenceId
    )
  ) {
    fail(
      "B11F6 rejects blank or self-referential corroboration provenance."
    );
  }

  if (
    new Set(
      normalizedSupporters
    ).size !==
    normalizedSupporters.length
  ) {
    fail(
      "B11F6 rejects duplicate corroborating evidence identities."
    );
  }

  /*
   * Reconstruct the canonical B11F5 assessment from the exact
   * B11F4 decision. This prevents a caller from pairing valid
   * corroboration provenance with a modified assessment object.
   */
  const expectedAssessment =
    assessHsppCorroboratedMember({
      corroborationDecision:
        corroboration,
    });

  if (
    assessment.policyVersion !==
      expectedAssessment.policyVersion ||
    assessment.trustState !==
      expectedAssessment.trustState ||
    assessment.operationalEligible !==
      expectedAssessment.operationalEligible ||
    assessment.crowdEligible !==
      expectedAssessment.crowdEligible ||
    assessment.trainingEligible !==
      expectedAssessment.trainingEligible ||
    assessment.validationEligible !==
      expectedAssessment.validationEligible ||
    assessment.reason !==
      expectedAssessment.reason
  ) {
    fail(
      "B11F6 assessment does not match the canonical B11F5 decision."
    );
  }

  if (
    assessment.policyVersion !==
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION ||
    assessment.trustState !==
      "CORROBORATED" ||
    assessment.reason !==
      "INDEPENDENT_CORROBORATION_ACCEPTED"
  ) {
    fail(
      "B11F6 persists only accepted CORROBORATED B11F5 assessments."
    );
  }

  if (
    assessment.operationalEligible !==
      false ||
    assessment.crowdEligible !==
      false ||
    assessment.trainingEligible !==
      false ||
    assessment.validationEligible !==
      false
  ) {
    fail(
      "B11F6 refuses any corroborated assessment carrying downstream eligibility."
    );
  }

  const applied =
    await applyHsppAssessmentDecision({
      supabase:
        input.supabase,

      organizationId,

      evidenceId,

      integrityFingerprint,

      assessment,

      assessedAt,
    });

  if (
    applied.evidenceId !==
      evidenceId ||
    applied.assessedAt !==
      assessedAt ||
    applied.trustState !==
      "CORROBORATED" ||
    applied.operationalEligible !==
      false ||
    applied.policyVersion !==
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION ||
    applied.reason !==
      "INDEPENDENT_CORROBORATION_ACCEPTED"
  ) {
    fail(
      "B11F6 persisted result does not match the controlled corroborated assessment."
    );
  }

  return {
    persistenceVersion:
      HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,

    state:
      "CORROBORATED_ASSESSMENT_PERSISTED",

    organizationId,

    assemblyId,

    assemblyDecisionId,

    evidenceId,

    integrityFingerprint,

    supportingEvidenceIds:
      [...normalizedSupporters].sort(),

    independentSupportCount:
      normalizedSupporters.length,

    assessmentPolicyVersion:
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState:
      "CORROBORATED",

    operationalEligible:
      false,

    assessedAt,

    applied,
  };
}