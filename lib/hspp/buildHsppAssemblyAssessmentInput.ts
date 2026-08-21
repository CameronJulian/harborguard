import {
  HSPP_ASSEMBLY_AUTHORITY_VERSION,
  type HsppAssemblyAuthorityDecision,
} from "./evaluateHsppAssemblyAuthority";

export const HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION =
  "hspp-assembly-assessment-input-v1" as const;

export type HsppAssemblyAssessmentMember = {
  organizationId:
    string;

  assemblyId:
    string;

  evidenceId:
    string;

  integrityFingerprint:
    string;

  memberOrdinal:
    number;
};

export type BuildHsppAssemblyAssessmentInputInput = {
  authorityDecision:
    HsppAssemblyAuthorityDecision;

  members:
    HsppAssemblyAssessmentMember[];
};

export type HsppAssemblyAssessmentEvidenceReference = {
  evidenceId:
    string;

  integrityFingerprint:
    string;

  memberOrdinal:
    number;
};

export type HsppAssemblyAssessmentInput = {
  contextVersion:
    typeof HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION;

  organizationId:
    string;

  assemblyId:
    string;

  assemblyDecisionId:
    string;

  authorityPolicyVersion:
    string;

  authorityState:
    "ASSESSMENT_CANDIDATE";

  authorityReason:
    "CONSISTENT_ASSEMBLY_CANDIDATE";

  evidenceCount:
    number;

  evidence:
    HsppAssemblyAssessmentEvidenceReference[];

  /*
   * B11F2 prepares assessment context only.
   *
   * It does NOT:
   *
   * - produce HsppAssessmentDecision;
   * - assign UNASSESSED, PLAUSIBLE, CORROBORATED or VERIFIED trust;
   * - grant operational eligibility;
   * - grant Crowd eligibility;
   * - grant ML training eligibility;
   * - grant validation eligibility;
   * - establish physical-world truth;
   * - persist any evidence mutation;
   * - invoke applyHsppAssessmentDecision().
   *
   * A later policy must decide what, if anything, this context
   * permits for each individual evidence member.
   */
  authority:
    "NONE";
};

function requireIdentity(
  value: string,
  fieldName: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required for HSPP assembly assessment input.`
    );
  }

  return normalized;
}

function normalizeFingerprint(
  value: string
): string {
  const normalized =
    value.trim();

  if (
    !/^[a-f0-9]{64}$/.test(
      normalized
    )
  ) {
    throw new Error(
      "HSPP assembly assessment member requires a lowercase SHA-256 integrity fingerprint."
    );
  }

  return normalized;
}

/**
 * HSPP B11F2 safe assembly-assessment adapter.
 *
 * This converts a successful B11F1 assessment candidacy decision
 * plus immutable assembly-member identities into a deterministic
 * assessment context.
 *
 * It performs no trust, validation, eligibility or database mutation.
 */
export function buildHsppAssemblyAssessmentInput(
  input:
    BuildHsppAssemblyAssessmentInputInput
): HsppAssemblyAssessmentInput {
  const authority =
    input.authorityDecision;

  if (
    authority.policyVersion !==
    HSPP_ASSEMBLY_AUTHORITY_VERSION
  ) {
    throw new Error(
      "Unsupported HSPP assembly authority policy version."
    );
  }

  if (
    authority.state !==
      "ASSESSMENT_CANDIDATE" ||
    authority.reason !==
      "CONSISTENT_ASSEMBLY_CANDIDATE"
  ) {
    throw new Error(
      "HSPP assembly is not an assessment candidate."
    );
  }

  if (
    authority.authority !==
    "NONE"
  ) {
    throw new Error(
      "HSPP assembly assessment input requires authority NONE."
    );
  }

  const organizationId =
    requireIdentity(
      authority.organizationId,
      "organizationId"
    );

  const assemblyId =
    requireIdentity(
      authority.assemblyId,
      "assemblyId"
    );

  const assemblyDecisionId =
    requireIdentity(
      authority.assemblyDecisionId,
      "assemblyDecisionId"
    );

  if (
    !Array.isArray(
      input.members
    ) ||
    input.members.length < 2
  ) {
    throw new Error(
      "HSPP assembly assessment requires at least two evidence members."
    );
  }

  const normalizedMembers =
    input.members.map(
      (
        member
      ): HsppAssemblyAssessmentMember => {
        const memberOrganizationId =
          requireIdentity(
            member.organizationId,
            "member.organizationId"
          );

        const memberAssemblyId =
          requireIdentity(
            member.assemblyId,
            "member.assemblyId"
          );

        const evidenceId =
          requireIdentity(
            member.evidenceId,
            "member.evidenceId"
          );

        const integrityFingerprint =
          normalizeFingerprint(
            member.integrityFingerprint
          );

        if (
          memberOrganizationId !==
          organizationId
        ) {
          throw new Error(
            "HSPP assembly assessment member organization does not match authority provenance."
          );
        }

        if (
          memberAssemblyId !==
          assemblyId
        ) {
          throw new Error(
            "HSPP assembly assessment member assembly does not match authority provenance."
          );
        }

        if (
          !Number.isInteger(
            member.memberOrdinal
          ) ||
          member.memberOrdinal < 1
        ) {
          throw new Error(
            "HSPP assembly assessment member ordinal must be a positive integer."
          );
        }

        return {
          organizationId:
            memberOrganizationId,

          assemblyId:
            memberAssemblyId,

          evidenceId,

          integrityFingerprint,

          memberOrdinal:
            member.memberOrdinal,
        };
      }
    );

  normalizedMembers.sort(
    (left, right) =>
      left.memberOrdinal -
      right.memberOrdinal
  );

  const evidenceIds =
    new Set<string>();

  const fingerprints =
    new Set<string>();

  for (
    let index = 0;
    index <
    normalizedMembers.length;
    index += 1
  ) {
    const member =
      normalizedMembers[index];

    const expectedOrdinal =
      index + 1;

    if (
      member.memberOrdinal !==
      expectedOrdinal
    ) {
      throw new Error(
        "HSPP assembly assessment members require contiguous deterministic ordinals."
      );
    }

    if (
      evidenceIds.has(
        member.evidenceId
      )
    ) {
      throw new Error(
        "HSPP assembly assessment contains duplicate evidence identity."
      );
    }

    if (
      fingerprints.has(
        member.integrityFingerprint
      )
    ) {
      throw new Error(
        "HSPP assembly assessment contains duplicate immutable evidence fingerprint."
      );
    }

    evidenceIds.add(
      member.evidenceId
    );

    fingerprints.add(
      member.integrityFingerprint
    );
  }

  return {
    contextVersion:
      HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION,

    organizationId,

    assemblyId,

    assemblyDecisionId,

    authorityPolicyVersion:
      authority.policyVersion,

    authorityState:
      "ASSESSMENT_CANDIDATE",

    authorityReason:
      "CONSISTENT_ASSEMBLY_CANDIDATE",

    evidenceCount:
      normalizedMembers.length,

    evidence:
      normalizedMembers.map(
        member => ({
          evidenceId:
            member.evidenceId,

          integrityFingerprint:
            member.integrityFingerprint,

          memberOrdinal:
            member.memberOrdinal,
        })
      ),

    authority:
      "NONE",
  };
}