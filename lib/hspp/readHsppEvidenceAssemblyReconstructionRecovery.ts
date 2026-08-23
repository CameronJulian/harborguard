import type { SupabaseClient } from "@supabase/supabase-js";


export const HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_READER_VERSION =
  "hspp-evidence-assembly-reconstruction-recovery-reader-v1" as const;


const RECOVERY_RPC =
  "read_hspp_evidence_assembly_reconstruction_recovery" as const;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


export type HsppEvidenceAssemblyReconstructionRecoveryMember = {
  membershipId: string;

  evidenceId: string;

  integrityFingerprint: string;

  memberOrdinal: number;

  membershipKind:
    | "RETAINED"
    | "ORIGINAL";

  sourceMembershipId:
    | string
    | null;
};


export type HsppEvidenceAssemblyReconstructionRecoverySnapshot = {
  reconstructionId: string;

  organizationId: string;

  parentAssemblyId: string;

  childAssemblyId: string;

  assemblyVersion: string;

  membershipPolicyVersion: string;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;

  assemblyState:
    | "OPEN"
    | "SEALED";

  sealedAt:
    | string
    | null;

  persistedMemberCount: number;

  retainedMemberCount: number;

  originalMemberCount: number;

  removedChangeCount: number;

  addedChangeCount: number;

  members:
    HsppEvidenceAssemblyReconstructionRecoveryMember[];
};


export type ReadHsppEvidenceAssemblyReconstructionRecoveryResult =
  | {
      readerVersion:
        typeof HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_READER_VERSION;

      organizationId: string;

      childAssemblyId: string;

      state: "NOT_FOUND";

      reconstruction: null;
    }

  | {
      readerVersion:
        typeof HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_READER_VERSION;

      organizationId: string;

      childAssemblyId: string;

      state: "FOUND";

      reconstruction:
        HsppEvidenceAssemblyReconstructionRecoverySnapshot;
    };


export type ReadHsppEvidenceAssemblyReconstructionRecoveryInput = {
  /**
   * Service-role Supabase client.
   *
   * Q14ag22A revokes access from public/anon/authenticated.
   */
  supabase: SupabaseClient;

  organizationId: string;

  childAssemblyId: string;
};


type RecoveryRpcRow = {
  reconstruction_id: unknown;

  organization_id: unknown;

  parent_assembly_id: unknown;

  child_assembly_id: unknown;

  assembly_version: unknown;

  membership_policy_version: unknown;

  reconstruction_policy_version: unknown;

  reconstruction_reason: unknown;

  assembly_state: unknown;

  sealed_at: unknown;

  persisted_member_count: unknown;

  retained_member_count: unknown;

  original_member_count: unknown;

  removed_change_count: unknown;

  added_change_count: unknown;

  members: unknown;
};


type RecoveryMemberRow = {
  membership_id?: unknown;

  evidence_id?: unknown;

  evidence_integrity_fingerprint?: unknown;

  member_ordinal?: unknown;

  membership_kind?: unknown;

  source_membership_id?: unknown;
};


function requireObject(
  value: unknown,
  fieldName: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${fieldName} must be an object.`,
    );
  }

  return value as Record<string, unknown>;
}


function requireNonBlankString(
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
    requireNonBlankString(
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


function requireNonNegativeInteger(
  value: unknown,
  fieldName: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be a non-negative integer.`,
    );
  }

  return value;
}


function requirePositiveInteger(
  value: unknown,
  fieldName: string,
): number {
  const normalized =
    requireNonNegativeInteger(
      value,
      fieldName,
    );

  if (normalized < 1) {
    throw new Error(
      `${fieldName} must be a positive integer.`,
    );
  }

  return normalized;
}


function requireNullableNonBlankString(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === null) {
    return null;
  }

  return requireNonBlankString(
    value,
    fieldName,
  );
}


function requireIsoTimestamp(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    requireNonBlankString(
      value,
      fieldName,
    );

  const parsed =
    new Date(
      normalized,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`,
    );
  }

  return parsed.toISOString();
}


function validateMembers(
  value: unknown,
): HsppEvidenceAssemblyReconstructionRecoveryMember[] {
  if (!Array.isArray(value)) {
    throw new Error(
      "Recovery members must be an array.",
    );
  }


  if (value.length < 2) {
    throw new Error(
      "Recovered reconstruction must contain at least two immutable child members.",
    );
  }


  const membershipIds =
    new Set<string>();

  const evidenceIds =
    new Set<string>();

  const ordinals =
    new Set<number>();


  const normalized =
    value.map(
      (
        rawMember,
        index,
      ): HsppEvidenceAssemblyReconstructionRecoveryMember => {
        const member =
          requireObject(
            rawMember,
            `members[${index}]`,
          ) as RecoveryMemberRow;


        const membershipId =
          requireNonBlankString(
            member.membership_id,
            `members[${index}].membership_id`,
          );


        const evidenceId =
          requireNonBlankString(
            member.evidence_id,
            `members[${index}].evidence_id`,
          );


        const integrityFingerprint =
          requireSha256(
            member.evidence_integrity_fingerprint,
            `members[${index}].evidence_integrity_fingerprint`,
          );


        const memberOrdinal =
          requirePositiveInteger(
            member.member_ordinal,
            `members[${index}].member_ordinal`,
          );


        const membershipKind =
          requireNonBlankString(
            member.membership_kind,
            `members[${index}].membership_kind`,
          );


        if (
          membershipKind !== "RETAINED" &&
          membershipKind !== "ORIGINAL"
        ) {
          throw new Error(
            `members[${index}].membership_kind must be RETAINED or ORIGINAL.`,
          );
        }


        const sourceMembershipId =
          requireNullableNonBlankString(
            member.source_membership_id,
            `members[${index}].source_membership_id`,
          );


        if (
          membershipKind === "RETAINED" &&
          sourceMembershipId === null
        ) {
          throw new Error(
            `RETAINED recovery member ${evidenceId} must preserve sourceMembershipId.`,
          );
        }


        if (
          membershipKind === "ORIGINAL" &&
          sourceMembershipId !== null
        ) {
          throw new Error(
            `ORIGINAL recovery member ${evidenceId} cannot claim historical sourceMembershipId.`,
          );
        }


        if (
          membershipIds.has(
            membershipId,
          )
        ) {
          throw new Error(
            `Recovery snapshot contains duplicate membership identity ${membershipId}.`,
          );
        }


        if (
          evidenceIds.has(
            evidenceId,
          )
        ) {
          throw new Error(
            `Recovery snapshot contains duplicate evidence identity ${evidenceId}.`,
          );
        }


        if (
          ordinals.has(
            memberOrdinal,
          )
        ) {
          throw new Error(
            `Recovery snapshot contains duplicate member ordinal ${memberOrdinal}.`,
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

          membershipKind,

          sourceMembershipId,
        };
      },
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
        `Recovery members must be returned in contiguous ordinal order starting at 1; expected ordinal ${expectedOrdinal}.`,
      );
    }
  }


  return normalized;
}


function normalizeFoundRow(
  rawRow: unknown,
  expectedOrganizationId: string,
  expectedChildAssemblyId: string,
): HsppEvidenceAssemblyReconstructionRecoverySnapshot {
  const row =
    requireObject(
      rawRow,
      "recovery row",
    ) as RecoveryRpcRow;


  const reconstructionId =
    requireNonBlankString(
      row.reconstruction_id,
      "reconstruction_id",
    );


  const organizationId =
    requireNonBlankString(
      row.organization_id,
      "organization_id",
    );


  const parentAssemblyId =
    requireNonBlankString(
      row.parent_assembly_id,
      "parent_assembly_id",
    );


  const childAssemblyId =
    requireNonBlankString(
      row.child_assembly_id,
      "child_assembly_id",
    );


  if (
    organizationId !==
    expectedOrganizationId
  ) {
    throw new Error(
      "Recovered reconstruction organization does not match the requested organization.",
    );
  }


  if (
    childAssemblyId !==
    expectedChildAssemblyId
  ) {
    throw new Error(
      "Recovered reconstruction child does not match the requested child identity.",
    );
  }


  if (
    parentAssemblyId ===
    childAssemblyId
  ) {
    throw new Error(
      "Recovered reconstruction parent and child identities must be distinct.",
    );
  }


  const assemblyVersion =
    requireNonBlankString(
      row.assembly_version,
      "assembly_version",
    );


  const membershipPolicyVersion =
    requireNonBlankString(
      row.membership_policy_version,
      "membership_policy_version",
    );


  const reconstructionPolicyVersion =
    requireNonBlankString(
      row.reconstruction_policy_version,
      "reconstruction_policy_version",
    );


  const reconstructionReason =
    requireNonBlankString(
      row.reconstruction_reason,
      "reconstruction_reason",
    );


  const assemblyState =
    requireNonBlankString(
      row.assembly_state,
      "assembly_state",
    );


  if (
    assemblyState !== "OPEN" &&
    assemblyState !== "SEALED"
  ) {
    throw new Error(
      "Recovered reconstruction child state must be OPEN or SEALED.",
    );
  }


  let sealedAt:
    | string
    | null;


  if (assemblyState === "OPEN") {
    if (row.sealed_at !== null) {
      throw new Error(
        "Recovered OPEN reconstruction child cannot already have sealed_at.",
      );
    }

    sealedAt =
      null;
  }
  else {
    sealedAt =
      requireIsoTimestamp(
        row.sealed_at,
        "sealed_at",
      );
  }


  const persistedMemberCount =
    requireNonNegativeInteger(
      row.persisted_member_count,
      "persisted_member_count",
    );


  const retainedMemberCount =
    requireNonNegativeInteger(
      row.retained_member_count,
      "retained_member_count",
    );


  const originalMemberCount =
    requireNonNegativeInteger(
      row.original_member_count,
      "original_member_count",
    );


  const removedChangeCount =
    requireNonNegativeInteger(
      row.removed_change_count,
      "removed_change_count",
    );


  const addedChangeCount =
    requireNonNegativeInteger(
      row.added_change_count,
      "added_change_count",
    );


  const members =
    validateMembers(
      row.members,
    );


  if (
    persistedMemberCount !==
    members.length
  ) {
    throw new Error(
      "Recovered persisted member count does not match the immutable child membership snapshot.",
    );
  }


  if (
    retainedMemberCount +
      originalMemberCount !==
    persistedMemberCount
  ) {
    throw new Error(
      "Recovered RETAINED and ORIGINAL counts do not equal persisted member count.",
    );
  }


  const actualRetainedCount =
    members.filter(
      (member) =>
        member.membershipKind ===
        "RETAINED",
    ).length;


  const actualOriginalCount =
    members.filter(
      (member) =>
        member.membershipKind ===
        "ORIGINAL",
    ).length;


  if (
    actualRetainedCount !==
    retainedMemberCount
  ) {
    throw new Error(
      "Recovered RETAINED count does not match member metadata.",
    );
  }


  if (
    actualOriginalCount !==
    originalMemberCount
  ) {
    throw new Error(
      "Recovered ORIGINAL count does not match member metadata.",
    );
  }


  if (
    removedChangeCount +
      addedChangeCount <
    1
  ) {
    throw new Error(
      "Recovered reconstruction must preserve at least one immutable composition delta.",
    );
  }


  return {
    reconstructionId,

    organizationId,

    parentAssemblyId,

    childAssemblyId,

    assemblyVersion,

    membershipPolicyVersion,

    reconstructionPolicyVersion,

    reconstructionReason,

    assemblyState,

    sealedAt,

    persistedMemberCount,

    retainedMemberCount,

    originalMemberCount,

    removedChangeCount,

    addedChangeCount,

    members,
  };
}


/**
 * Q14ag22B typed child-keyed reconstruction recovery reader.
 *
 * Exactly one Q14ag22A RPC call is made.
 *
 * Zero rows are the valid NOT_FOUND state established by Q14ag22A.
 * One row is normalized and validated as a canonical persisted
 * reconstruction snapshot.
 *
 * Any malformed, duplicate, contradictory or unexpected persisted
 * state fails closed.
 *
 * This reader does NOT:
 *
 * - read Q14ag14 actionable historical context;
 * - select or evaluate replacement evidence;
 * - generate child UUIDs;
 * - invoke Q14h persistence;
 * - plan H2;
 * - seal or assess H2;
 * - alter trust or Reservoir state;
 * - route API/cron/scheduler execution.
 */
export async function readHsppEvidenceAssemblyReconstructionRecovery({
  supabase,
  organizationId: rawOrganizationId,
  childAssemblyId: rawChildAssemblyId,
}: ReadHsppEvidenceAssemblyReconstructionRecoveryInput): Promise<ReadHsppEvidenceAssemblyReconstructionRecoveryResult> {
  const organizationId =
    requireNonBlankString(
      rawOrganizationId,
      "organizationId",
    );


  const childAssemblyId =
    requireNonBlankString(
      rawChildAssemblyId,
      "childAssemblyId",
    );


  const {
    data,
    error,
  } =
    await supabase.rpc(
      RECOVERY_RPC,
      {
        p_organization_id:
          organizationId,

        p_child_assembly_id:
          childAssemblyId,
      },
    );


  if (error) {
    throw error;
  }


  if (!Array.isArray(data)) {
    throw new Error(
      "Q14ag22A recovery RPC must return an array.",
    );
  }


  if (data.length === 0) {
    return {
      readerVersion:
        HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_READER_VERSION,

      organizationId,

      childAssemblyId,

      state:
        "NOT_FOUND",

      reconstruction:
        null,
    };
  }


  if (data.length !== 1) {
    throw new Error(
      "Q14ag22A recovery RPC returned more than one reconstruction for the caller-owned child identity.",
    );
  }


  const reconstruction =
    normalizeFoundRow(
      data[0],
      organizationId,
      childAssemblyId,
    );


  return {
    readerVersion:
      HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_RECOVERY_READER_VERSION,

    organizationId,

    childAssemblyId,

    state:
      "FOUND",

    reconstruction,
  };
}
