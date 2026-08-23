import type {
  HsppHistoricalReconstructionContext,
} from "@/lib/hspp/readHsppHistoricalReconstructionContexts";

import type {
  HsppSealedAssemblyVerifiedMemberMetadata,
  ReadHsppSealedEvidenceAssemblyResult,
} from "@/lib/hspp/readHsppSealedEvidenceAssembly";

import type {
  HsppReservoirCandidate,
} from "@/lib/hspp/readHsppReservoirCandidates";


export const HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_MEMBER_PLANNER_VERSION =
  "hspp-evidence-assembly-reconstruction-member-planner-v1" as const;


export type HsppEvidenceAssemblyReconstructionPlannedMember = {
  evidenceId: string;

  integrityFingerprint: string;
};


export type PlanHsppEvidenceAssemblyReconstructionMembersInput = {
  /**
   * Exact Q14ag14 cessation-backed historical context.
   */
  historicalContext: HsppHistoricalReconstructionContext;

  /**
   * Already-read exact immutable SEALED parent.
   */
  parentAssembly: ReadHsppSealedEvidenceAssemblyResult;

  /**
   * Already-selected Reservoir candidate intended to replace the
   * ceased historical member.
   *
   * This planner does not discover or select the candidate itself.
   */
  replacementCandidate: HsppReservoirCandidate;
};


export type PlanHsppEvidenceAssemblyReconstructionMembersResult = {
  plannerVersion:
    typeof HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_MEMBER_PLANNER_VERSION;

  parentAssemblyId: string;

  historicalMembershipId: string;

  historicalEvidenceId: string;

  replacementEvidenceId: string;

  /**
   * Final desired H2 evidence/fingerprint set only.
   *
   * Database reconstruction authority remains responsible for
   * persisted provenance and final child-member ordinal assignment.
   */
  members: HsppEvidenceAssemblyReconstructionPlannedMember[];
};


type ValidatedParentMember = {
  membershipId: string;

  evidenceId: string;

  integrityFingerprint: string;

  memberOrdinal: number;
};


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


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


function validateParentMembers(
  members: HsppSealedAssemblyVerifiedMemberMetadata[],
): ValidatedParentMember[] {
  if (
    !Array.isArray(
      members,
    ) ||
    members.length < 2
  ) {
    throw new Error(
      "SEALED parent must expose at least two verified members for one-for-one reconstruction.",
    );
  }


  const membershipIds =
    new Set<string>();

  const evidenceIds =
    new Set<string>();

  const ordinals =
    new Set<number>();


  const validated =
    members.map(
      (
        member,
        index,
      ): ValidatedParentMember => {
        const membershipId =
          requireNonBlank(
            member?.membershipId,
            `parent verifiedMembers[${index}].membershipId`,
          );

        const evidenceId =
          requireNonBlank(
            member?.evidenceId,
            `parent verifiedMembers[${index}].evidenceId`,
          );

        const integrityFingerprint =
          requireSha256(
            member?.integrityFingerprint,
            `parent verifiedMembers[${index}].integrityFingerprint`,
          );

        const memberOrdinal =
          requirePositiveInteger(
            member?.memberOrdinal,
            `parent verifiedMembers[${index}].memberOrdinal`,
          );


        if (
          membershipIds.has(
            membershipId,
          )
        ) {
          throw new Error(
            `SEALED parent contains duplicate membership identity ${membershipId}.`,
          );
        }


        if (
          evidenceIds.has(
            evidenceId,
          )
        ) {
          throw new Error(
            `SEALED parent contains duplicate evidence identity ${evidenceId}.`,
          );
        }


        if (
          ordinals.has(
            memberOrdinal,
          )
        ) {
          throw new Error(
            `SEALED parent contains duplicate member ordinal ${memberOrdinal}.`,
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
    );


  return validated.sort(
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
}


/**
 * B7490-Q14AG18B pure H2 evidence-member planner.
 *
 * This boundary consumes three facts that have ALREADY been
 * independently established elsewhere:
 *
 * - one exact Q14ag14 historical reconstruction context;
 * - one exact B07D SEALED parent read;
 * - one already-selected B06B Reservoir replacement candidate.
 *
 * It verifies that the Q14ag14 historical membership identifies the
 * exact immutable B07D parent membership by:
 *
 * - membership row identity;
 * - evidence identity;
 * - immutable fingerprint;
 * - historical member ordinal.
 *
 * It then verifies that the replacement:
 *
 * - is lifecycle-classified NEVER_ASSEMBLED;
 * - has no current-effective assembly membership;
 * - remains Reservoir-eligible;
 * - has persisted evidence with the same identity; and
 * - has a lowercase immutable SHA-256 fingerprint.
 *
 * For one-for-one H1 -> H2 reconstruction it returns:
 *
 * - every unaffected parent member in exact parent order; followed by
 * - the one newly-added replacement member.
 *
 * It intentionally does NOT:
 *
 * - read any database state;
 * - call any RPC;
 * - discover or select replacement evidence;
 * - evaluate pair membership;
 * - generate a child assembly identity;
 * - persist a reconstruction;
 * - assign final child ordinals;
 * - derive persisted reconstruction provenance;
 * - seal or assess H2;
 * - mutate trust;
 * - create API, cron, retry, queue or scheduler behavior.
 */
export function planHsppEvidenceAssemblyReconstructionMembers({
  historicalContext,
  parentAssembly,
  replacementCandidate,
}: PlanHsppEvidenceAssemblyReconstructionMembersInput): PlanHsppEvidenceAssemblyReconstructionMembersResult {
  const historicalEvidenceId =
    requireNonBlank(
      historicalContext?.evidenceId,
      "historicalContext.evidenceId",
    );

  const historicalMembershipId =
    requireNonBlank(
      historicalContext?.historicalMembershipId,
      "historicalContext.historicalMembershipId",
    );

  const historicalParentAssemblyId =
    requireNonBlank(
      historicalContext?.parentAssemblyId,
      "historicalContext.parentAssemblyId",
    );

  const historicalFingerprint =
    requireSha256(
      historicalContext?.evidenceIntegrityFingerprint,
      "historicalContext.evidenceIntegrityFingerprint",
    );

  const historicalParentOrdinal =
    requirePositiveInteger(
      historicalContext?.parentMemberOrdinal,
      "historicalContext.parentMemberOrdinal",
    );


  if (
    !parentAssembly ||
    typeof parentAssembly !== "object" ||
    !parentAssembly.scanInput ||
    typeof parentAssembly.scanInput !== "object"
  ) {
    throw new Error(
      "parentAssembly.scanInput is required.",
    );
  }


  const parentAssemblyId =
    requireNonBlank(
      parentAssembly.scanInput.assemblyId,
      "parentAssembly.scanInput.assemblyId",
    );


  if (
    parentAssembly.scanInput.assemblyState !==
    "SEALED"
  ) {
    throw new Error(
      "H2 member planning requires an exact SEALED historical parent.",
    );
  }


  if (
    parentAssemblyId !==
    historicalParentAssemblyId
  ) {
    throw new Error(
      "Historical reconstruction context parent assembly does not match the supplied SEALED parent.",
    );
  }


  const parentMembers =
    validateParentMembers(
      parentAssembly.verifiedMembers,
    );


  const historicalMember =
    parentMembers.find(
      (member) =>
        member.membershipId ===
        historicalMembershipId,
    );


  if (!historicalMember) {
    throw new Error(
      `Historical membership ${historicalMembershipId} was not found in the exact SEALED parent.`,
    );
  }


  if (
    historicalMember.evidenceId !==
    historicalEvidenceId
  ) {
    throw new Error(
      "Historical reconstruction context evidence identity does not match its exact parent membership.",
    );
  }


  if (
    historicalMember.integrityFingerprint !==
    historicalFingerprint
  ) {
    throw new Error(
      "Historical reconstruction context fingerprint does not match its exact parent membership.",
    );
  }


  if (
    historicalMember.memberOrdinal !==
    historicalParentOrdinal
  ) {
    throw new Error(
      "Historical reconstruction context member ordinal does not match its exact parent membership.",
    );
  }


  if (
    !replacementCandidate ||
    typeof replacementCandidate !==
    "object"
  ) {
    throw new Error(
      "replacementCandidate is required.",
    );
  }


  const replacementEvidenceId =
    requireNonBlank(
      replacementCandidate.evidenceId,
      "replacementCandidate.evidenceId",
    );


  if (
    replacementEvidenceId ===
    historicalEvidenceId
  ) {
    throw new Error(
      "Replacement evidence must differ from the ceased historical evidence.",
    );
  }


  if (
    replacementCandidate.membershipClassification !==
    "NEVER_ASSEMBLED"
  ) {
    throw new Error(
      `Replacement evidence ${replacementEvidenceId} must be NEVER_ASSEMBLED before H2 planning.`,
    );
  }


  if (
    replacementCandidate.hasAssemblyMembership !==
    false
  ) {
    throw new Error(
      `Replacement evidence ${replacementEvidenceId} unexpectedly has current-effective assembly membership.`,
    );
  }


  if (
    replacementCandidate.reservoirDecision?.eligible !==
    true
  ) {
    throw new Error(
      `Replacement evidence ${replacementEvidenceId} is not Reservoir-eligible.`,
    );
  }


  const replacementEvidence =
    replacementCandidate.operationalRead?.evidence;


  if (!replacementEvidence) {
    throw new Error(
      `Replacement evidence ${replacementEvidenceId} has no persisted operational evidence.`,
    );
  }


  const persistedReplacementEvidenceId =
    requireNonBlank(
      replacementEvidence.id,
      "replacementCandidate.operationalRead.evidence.id",
    );


  if (
    persistedReplacementEvidenceId !==
    replacementEvidenceId
  ) {
    throw new Error(
      `Replacement evidence identity mismatch for ${replacementEvidenceId}.`,
    );
  }


  const replacementFingerprint =
    requireSha256(
      replacementEvidence.integrityFingerprint,
      "replacementCandidate.operationalRead.evidence.integrityFingerprint",
    );


  if (
    parentMembers.some(
      (member) =>
        member.evidenceId ===
        replacementEvidenceId,
    )
  ) {
    throw new Error(
      `Replacement evidence ${replacementEvidenceId} already exists in the historical parent.`,
    );
  }


  const retainedMembers =
    parentMembers.filter(
      (member) =>
        member.membershipId !==
        historicalMembershipId,
    );


  if (
    retainedMembers.length !==
    parentMembers.length - 1
  ) {
    throw new Error(
      "H2 planning must remove exactly one historical parent membership.",
    );
  }


  const members:
    HsppEvidenceAssemblyReconstructionPlannedMember[] =
    [
      ...retainedMembers.map(
        (member) => ({
          evidenceId:
            member.evidenceId,

          integrityFingerprint:
            member.integrityFingerprint,
        }),
      ),

      {
        evidenceId:
          replacementEvidenceId,

        integrityFingerprint:
          replacementFingerprint,
      },
    ];


  if (
    members.length !==
    parentMembers.length
  ) {
    throw new Error(
      "One-for-one H2 planning must preserve the parent member count.",
    );
  }


  const finalEvidenceIds =
    new Set(
      members.map(
        (member) =>
          member.evidenceId,
      ),
    );


  if (
    finalEvidenceIds.size !==
    members.length
  ) {
    throw new Error(
      "Planned H2 membership contains duplicate evidence identities.",
    );
  }


  if (
    finalEvidenceIds.has(
      historicalEvidenceId,
    )
  ) {
    throw new Error(
      "Planned H2 membership cannot retain the ceased historical evidence.",
    );
  }


  if (
    !finalEvidenceIds.has(
      replacementEvidenceId,
    )
  ) {
    throw new Error(
      "Planned H2 membership must contain the replacement evidence.",
    );
  }


  return {
    plannerVersion:
      HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_MEMBER_PLANNER_VERSION,

    parentAssemblyId,

    historicalMembershipId,

    historicalEvidenceId,

    replacementEvidenceId,

    members,
  };
}
