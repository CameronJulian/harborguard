import type {
  HsppReservoirCandidate,
  HsppEvidenceAssemblyMembershipClassification,
} from "@/lib/hspp/readHsppReservoirCandidates";

import type {
  HsppSealedAssemblyVerifiedMemberMetadata,
  ReadHsppSealedEvidenceAssemblyResult,
} from "@/lib/hspp/readHsppSealedEvidenceAssembly";

import type {
  HsppEvidenceAssemblyReconstructionRecoverySnapshot,
} from "@/lib/hspp/readHsppEvidenceAssemblyReconstructionRecovery";


export const HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_EQUIVALENCE_VERSION =
  "hspp-evidence-assembly-reconstruction-recovery-equivalence-v1" as const;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


export type VerifyHsppEvidenceAssemblyReconstructionRecoveryEquivalenceInput = {
  organizationId: string;

  /**
   * Caller-owned immutable Q14h retry identity.
   */
  childAssemblyId: string;

  /**
   * Candidate already resolved from the selected B07B pair.
   */
  historicalCandidate: HsppReservoirCandidate;

  /**
   * Candidate already resolved from the selected B07B pair.
   */
  replacementCandidate: HsppReservoirCandidate;

  /**
   * Must be selected.membershipDecision.policyVersion.
   */
  membershipPolicyVersion: string;

  /**
   * Trusted reconstruction orchestration input.
   *
   * This verifier does not derive it from cessation provenance.
   */
  reconstructionPolicyVersion: string;

  /**
   * Trusted reconstruction orchestration input.
   *
   * This verifier does not derive it from cessation provenance.
   */
  reconstructionReason: string;

  /**
   * Immutable SEALED H1 loaded by Q14ag18A using the parent id
   * returned by Q14ag22B.
   */
  parentAssembly: ReadHsppSealedEvidenceAssemblyResult;

  /**
   * Already validated Q14ag22B FOUND snapshot.
   */
  recovery: HsppEvidenceAssemblyReconstructionRecoverySnapshot;
};


export type VerifyHsppEvidenceAssemblyReconstructionRecoveryEquivalenceResult = {
  verifierVersion:
    typeof HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_EQUIVALENCE_VERSION;

  state:
    "EXACT_RECOVERY";

  organizationId: string;

  parentAssemblyId: string;

  childAssemblyId: string;

  historicalEvidenceId: string;

  replacementEvidenceId: string;

  membershipPolicyVersion: string;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;

  assemblyState:
    | "OPEN"
    | "SEALED";

  memberCount: number;
};


type CandidateIdentity = {
  evidenceId: string;

  integrityFingerprint: string;
};


type ParentMember = {
  membershipId: string;

  evidenceId: string;

  integrityFingerprint: string;

  memberOrdinal: number;
};


function requireNonBlank(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} must be a non-empty string.`,
    );
  }

  return value.trim();
}


function requireSha256(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName,
    );

  if (
    !SHA256_PATTERN.test(
      normalized,
    )
  ) {
    throw new Error(
      `${fieldName} must be a lowercase SHA-256 fingerprint.`,
    );
  }

  return normalized;
}


function requirePositiveInteger(
  value: unknown,
  fieldName: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1
  ) {
    throw new Error(
      `${fieldName} must be a positive integer.`,
    );
  }

  return value;
}


function validateCandidate(
  candidate: HsppReservoirCandidate,
  expectedClassification:
    HsppEvidenceAssemblyMembershipClassification,
  organizationId: string,
  label: string,
): CandidateIdentity {
  const evidenceId =
    requireNonBlank(
      candidate?.evidenceId,
      `${label}.evidenceId`,
    );


  if (
    candidate.membershipClassification !==
    expectedClassification
  ) {
    throw new Error(
      `${label} must be lifecycle-classified ${expectedClassification}.`,
    );
  }


  if (candidate.hasAssemblyMembership) {
    throw new Error(
      `${label} cannot have current-effective assembly membership.`,
    );
  }


  if (
    !candidate.reservoirDecision?.eligible
  ) {
    throw new Error(
      `${label} must remain Reservoir eligible.`,
    );
  }


  const evidence =
    candidate.operationalRead?.evidence;


  if (!evidence) {
    throw new Error(
      `${label} must contain persisted operational evidence.`,
    );
  }


  const persistedEvidenceId =
    requireNonBlank(
      evidence.id,
      `${label}.operationalRead.evidence.id`,
    );


  if (
    persistedEvidenceId !==
    evidenceId
  ) {
    throw new Error(
      `${label} persisted evidence identity does not match the selected evidence identity.`,
    );
  }


  const evidenceOrganizationId =
    requireNonBlank(
      evidence.organizationId,
      `${label}.operationalRead.evidence.organizationId`,
    );


  if (
    evidenceOrganizationId !==
    organizationId
  ) {
    throw new Error(
      `${label} evidence organization does not match the reconstruction organization.`,
    );
  }


  const integrityFingerprint =
    requireSha256(
      evidence.integrityFingerprint,
      `${label}.operationalRead.evidence.integrityFingerprint`,
    );


  return {
    evidenceId,

    integrityFingerprint,
  };
}


function normalizeParentMembers(
  members:
    HsppSealedAssemblyVerifiedMemberMetadata[],
): ParentMember[] {
  if (
    !Array.isArray(members) ||
    members.length < 2
  ) {
    throw new Error(
      "Recovered reconstruction parent must contain at least two immutable members.",
    );
  }


  const membershipIds =
    new Set<string>();

  const evidenceIds =
    new Set<string>();

  const ordinals =
    new Set<number>();


  const normalized =
    members.map(
      (
        member,
        index,
      ): ParentMember => {
        const membershipId =
          requireNonBlank(
            member?.membershipId,
            `parentAssembly.verifiedMembers[${index}].membershipId`,
          );


        const evidenceId =
          requireNonBlank(
            member?.evidenceId,
            `parentAssembly.verifiedMembers[${index}].evidenceId`,
          );


        const integrityFingerprint =
          requireSha256(
            member?.integrityFingerprint,
            `parentAssembly.verifiedMembers[${index}].integrityFingerprint`,
          );


        const memberOrdinal =
          requirePositiveInteger(
            member?.memberOrdinal,
            `parentAssembly.verifiedMembers[${index}].memberOrdinal`,
          );


        if (
          membershipIds.has(
            membershipId,
          )
        ) {
          throw new Error(
            `Recovered reconstruction parent contains duplicate membership identity ${membershipId}.`,
          );
        }


        if (
          evidenceIds.has(
            evidenceId,
          )
        ) {
          throw new Error(
            `Recovered reconstruction parent contains duplicate evidence identity ${evidenceId}.`,
          );
        }


        if (
          ordinals.has(
            memberOrdinal,
          )
        ) {
          throw new Error(
            `Recovered reconstruction parent contains duplicate member ordinal ${memberOrdinal}.`,
          );
        }


        membershipIds.add(
          membershipId,
        );

        evidenceIds.add(
          evidenceId,
        );

        ordinals.add(
          memberOrdinal,
        );


        return {
          membershipId,

          evidenceId,

          integrityFingerprint,

          memberOrdinal,
        };
      },
    )
    .sort(
      (
        first,
        second,
      ) =>
        first.memberOrdinal -
          second.memberOrdinal ||
        first.evidenceId.localeCompare(
          second.evidenceId,
        ),
    );


  for (
    let index = 0;
    index < normalized.length;
    index += 1
  ) {
    const expectedOrdinal =
      index + 1;

    if (
      normalized[index].memberOrdinal !==
      expectedOrdinal
    ) {
      throw new Error(
        `Recovered reconstruction parent membership ordinals must be contiguous from 1; expected ${expectedOrdinal}.`,
      );
    }
  }


  return normalized;
}


/**
 * Q14ag24 pure FOUND-recovery equivalence verifier.
 *
 * This verifier is deliberately used only after:
 *
 * - an already-computed B07B pair has been selected;
 * - the pair has been resolved to one HISTORICAL_NOT_CURRENT
 *   candidate and one NEVER_ASSEMBLED candidate;
 * - Q14ag22B returned FOUND for the caller-owned child UUID;
 * - Q14ag18A loaded the immutable SEALED parent identified by
 *   the recovery snapshot.
 *
 * It proves exact one-for-one reconstruction equivalence from:
 *
 * - immutable H1 membership identity/fingerprints/order;
 * - immutable recovered H2 membership metadata;
 * - RETAINED sourceMembershipId provenance;
 * - the authorized historical and replacement evidence identities;
 * - the exact membership/reconstruction policy and reason request.
 *
 * The persisted REMOVED/ADDED identities do not need to be read by
 * this verifier because, for the one-for-one reconstruction contract,
 * the exact delta is derivable from immutable H1 versus immutable H2.
 *
 * This verifier does NOT:
 *
 * - discover or select a B07B pair;
 * - read Q14ag16C;
 * - read Q14ag18A itself;
 * - call Q14ag18B;
 * - invoke Q14h/Q14ag16A;
 * - query Supabase;
 * - invoke RPC;
 * - generate UUIDs;
 * - seal or assess H2;
 * - alter trust or Reservoir state;
 * - create API, cron, queue or scheduler behavior.
 */
export function verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence({
  organizationId: rawOrganizationId,
  childAssemblyId: rawChildAssemblyId,
  historicalCandidate,
  replacementCandidate,
  membershipPolicyVersion: rawMembershipPolicyVersion,
  reconstructionPolicyVersion: rawReconstructionPolicyVersion,
  reconstructionReason: rawReconstructionReason,
  parentAssembly,
  recovery,
}: VerifyHsppEvidenceAssemblyReconstructionRecoveryEquivalenceInput): VerifyHsppEvidenceAssemblyReconstructionRecoveryEquivalenceResult {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );


  const childAssemblyId =
    requireNonBlank(
      rawChildAssemblyId,
      "childAssemblyId",
    );


  const membershipPolicyVersion =
    requireNonBlank(
      rawMembershipPolicyVersion,
      "membershipPolicyVersion",
    );


  const reconstructionPolicyVersion =
    requireNonBlank(
      rawReconstructionPolicyVersion,
      "reconstructionPolicyVersion",
    );


  const reconstructionReason =
    requireNonBlank(
      rawReconstructionReason,
      "reconstructionReason",
    );


  const historical =
    validateCandidate(
      historicalCandidate,
      "HISTORICAL_NOT_CURRENT",
      organizationId,
      "historicalCandidate",
    );


  const replacement =
    validateCandidate(
      replacementCandidate,
      "NEVER_ASSEMBLED",
      organizationId,
      "replacementCandidate",
    );


  if (
    historical.evidenceId ===
    replacement.evidenceId
  ) {
    throw new Error(
      "Historical and replacement evidence identities must be distinct.",
    );
  }


  if (
    parentAssembly?.scanInput?.assemblyState !==
    "SEALED"
  ) {
    throw new Error(
      "Recovered reconstruction parent must be SEALED.",
    );
  }


  const parentOrganizationId =
    requireNonBlank(
      parentAssembly.scanInput.organizationId,
      "parentAssembly.scanInput.organizationId",
    );


  if (
    parentOrganizationId !==
    organizationId
  ) {
    throw new Error(
      "Recovered reconstruction parent organization does not match the expected organization.",
    );
  }


  const parentAssemblyId =
    requireNonBlank(
      parentAssembly.scanInput.assemblyId,
      "parentAssembly.scanInput.assemblyId",
    );


  const parentMembers =
    normalizeParentMembers(
      parentAssembly.verifiedMembers,
    );


  const historicalParentMembers =
    parentMembers.filter(
      (member) =>
        member.evidenceId ===
        historical.evidenceId,
    );


  if (
    historicalParentMembers.length !==
    1
  ) {
    throw new Error(
      "Selected HISTORICAL_NOT_CURRENT evidence must identify exactly one immutable H1 membership.",
    );
  }


  const historicalParentMember =
    historicalParentMembers[0];


  if (
    historicalParentMember.integrityFingerprint !==
    historical.integrityFingerprint
  ) {
    throw new Error(
      "Selected historical evidence fingerprint does not match its exact immutable H1 membership.",
    );
  }


  if (
    parentMembers.some(
      (member) =>
        member.evidenceId ===
        replacement.evidenceId,
    )
  ) {
    throw new Error(
      "Selected NEVER_ASSEMBLED replacement evidence is already present in H1.",
    );
  }


  if (
    recovery.organizationId !==
    organizationId
  ) {
    throw new Error(
      "Recovered reconstruction organization does not match the expected organization.",
    );
  }


  if (
    recovery.childAssemblyId !==
    childAssemblyId
  ) {
    throw new Error(
      "Recovered reconstruction child does not match the caller-owned child identity.",
    );
  }


  if (
    recovery.parentAssemblyId !==
    parentAssemblyId
  ) {
    throw new Error(
      "Recovered reconstruction parent does not match the immutable SEALED H1.",
    );
  }


  if (
    recovery.membershipPolicyVersion !==
    membershipPolicyVersion
  ) {
    throw new Error(
      "Recovered reconstruction membership policy does not match the selected B07B membership policy.",
    );
  }


  if (
    recovery.reconstructionPolicyVersion !==
    reconstructionPolicyVersion
  ) {
    throw new Error(
      "Recovered reconstruction policy does not match the exact reconstruction request.",
    );
  }


  if (
    recovery.reconstructionReason !==
    reconstructionReason
  ) {
    throw new Error(
      "Recovered reconstruction reason does not match the exact reconstruction request.",
    );
  }


  if (
    recovery.assemblyState !== "OPEN" &&
    recovery.assemblyState !== "SEALED"
  ) {
    throw new Error(
      "Recovered reconstruction child must remain OPEN or SEALED.",
    );
  }


  const expectedRetained =
    parentMembers.filter(
      (member) =>
        member.membershipId !==
        historicalParentMember.membershipId,
    );


  const expectedMemberCount =
    parentMembers.length;


  if (
    recovery.members.length !==
    expectedMemberCount ||
    recovery.persistedMemberCount !==
    expectedMemberCount
  ) {
    throw new Error(
      "Recovered H2 must preserve the one-for-one H1 member count.",
    );
  }


  if (
    recovery.retainedMemberCount !==
    expectedRetained.length
  ) {
    throw new Error(
      "Recovered H2 RETAINED member count does not match H1 minus the historical member.",
    );
  }


  if (
    recovery.originalMemberCount !==
    1
  ) {
    throw new Error(
      "Recovered one-for-one H2 must contain exactly one ORIGINAL member.",
    );
  }


  if (
    recovery.removedChangeCount !==
      1 ||
    recovery.addedChangeCount !==
      1
  ) {
    throw new Error(
      "Recovered one-for-one H2 must preserve exactly one REMOVED and one ADDED delta.",
    );
  }


  for (
    let index = 0;
    index < expectedRetained.length;
    index += 1
  ) {
    const expected =
      expectedRetained[index];

    const recovered =
      recovery.members[index];

    const expectedOrdinal =
      index + 1;


    if (
      recovered.memberOrdinal !==
      expectedOrdinal
    ) {
      throw new Error(
        `Recovered RETAINED H2 member order conflicts with immutable H1 order at ordinal ${expectedOrdinal}.`,
      );
    }


    if (
      recovered.membershipKind !==
      "RETAINED"
    ) {
      throw new Error(
        `Recovered H2 member ${expected.evidenceId} must be RETAINED.`,
      );
    }


    if (
      recovered.evidenceId !==
      expected.evidenceId
    ) {
      throw new Error(
        `Recovered RETAINED H2 evidence identity conflicts with immutable H1 order at ordinal ${expectedOrdinal}.`,
      );
    }


    if (
      recovered.sourceMembershipId !==
      expected.membershipId
    ) {
      throw new Error(
        `Recovered RETAINED H2 member ${expected.evidenceId} does not reference its exact immutable H1 membership.`,
      );
    }


    if (
      recovered.integrityFingerprint !==
      expected.integrityFingerprint
    ) {
      throw new Error(
        `Recovered RETAINED H2 evidence ${expected.evidenceId} changed its immutable fingerprint.`,
      );
    }
  }


  const recoveredReplacement =
    recovery.members[
      expectedRetained.length
    ];


  if (!recoveredReplacement) {
    throw new Error(
      "Recovered H2 is missing the authorized replacement member.",
    );
  }


  if (
    recoveredReplacement.memberOrdinal !==
    expectedMemberCount
  ) {
    throw new Error(
      "Recovered replacement must follow all RETAINED H1 members.",
    );
  }


  if (
    recoveredReplacement.membershipKind !==
    "ORIGINAL"
  ) {
    throw new Error(
      "Recovered replacement member must be ORIGINAL.",
    );
  }


  if (
    recoveredReplacement.sourceMembershipId !==
    null
  ) {
    throw new Error(
      "Recovered ORIGINAL replacement cannot claim an H1 source membership.",
    );
  }


  if (
    recoveredReplacement.evidenceId !==
    replacement.evidenceId
  ) {
    throw new Error(
      "Recovered ORIGINAL member is not the authorized NEVER_ASSEMBLED replacement.",
    );
  }


  if (
    recoveredReplacement.integrityFingerprint !==
    replacement.integrityFingerprint
  ) {
    throw new Error(
      "Recovered replacement fingerprint does not match the authorized immutable replacement fingerprint.",
    );
  }


  if (
    recovery.members.some(
      (member) =>
        member.evidenceId ===
        historical.evidenceId,
    )
  ) {
    throw new Error(
      "Recovered H2 still contains the historical evidence that should have been removed.",
    );
  }


  return {
    verifierVersion:
      HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_EQUIVALENCE_VERSION,

    state:
      "EXACT_RECOVERY",

    organizationId,

    parentAssemblyId,

    childAssemblyId,

    historicalEvidenceId:
      historical.evidenceId,

    replacementEvidenceId:
      replacement.evidenceId,

    membershipPolicyVersion,

    reconstructionPolicyVersion,

    reconstructionReason,

    assemblyState:
      recovery.assemblyState,

    memberCount:
      recovery.members.length,
  };
}
