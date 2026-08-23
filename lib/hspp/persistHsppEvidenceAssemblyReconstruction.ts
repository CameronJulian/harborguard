import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_EVIDENCE_ASSEMBLY_VERSION,
} from "@/lib/hspp/persistHsppEvidenceAssembly";


export const HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_VERSION =
  "hspp-evidence-assembly-reconstruction-persistence-v1" as const;


export const HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_RPC =
  "persist_hspp_evidence_assembly_reconstruction" as const;


export type HsppEvidenceAssemblyReconstructionPersistenceMember = {
  evidenceId: string;

  integrityFingerprint: string;
};


export type PersistHsppEvidenceAssemblyReconstructionInput = {
  supabase: SupabaseClient;

  organizationId: string;

  parentAssemblyId: string;

  /**
   * Caller-owned immutable retry identity.
   *
   * This low-level persistence wrapper deliberately does not generate
   * the child identity. A higher-level reconstruction planner must own
   * that identity before invoking Q14h so an exact retry can reuse it.
   */
  childAssemblyId: string;

  assemblyVersion?: typeof HSPP_EVIDENCE_ASSEMBLY_VERSION;

  membershipPolicyVersion: string;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;

  /**
   * Final desired H2 evidence set only.
   *
   * The caller supplies immutable evidence identity + fingerprint.
   *
   * It does NOT supply membership kind, source membership identity or
   * REMOVED / ADDED reconstruction provenance. Q14h derives those
   * authoritative facts from the exact parent and requested child set.
   */
  members: HsppEvidenceAssemblyReconstructionPersistenceMember[];
};


export type PersistedHsppEvidenceAssemblyReconstruction = {
  persistenceVersion:
    typeof HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_VERSION;

  reconstructionId: string;

  organizationId: string;

  parentAssemblyId: string;

  childAssemblyId: string;

  assemblyVersion: typeof HSPP_EVIDENCE_ASSEMBLY_VERSION;

  membershipPolicyVersion: string;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;

  assemblyState: "OPEN";

  persistedMemberCount: number;

  retainedMemberCount: number;

  originalMemberCount: number;

  removedChangeCount: number;

  addedChangeCount: number;

  idempotentRecovery: boolean;

  members: HsppEvidenceAssemblyReconstructionPersistenceMember[];
};


type ReconstructionPersistenceRow = {
  reconstruction_id: unknown;

  organization_id: unknown;

  parent_assembly_id: unknown;

  child_assembly_id: unknown;

  assembly_version: unknown;

  membership_policy_version: unknown;

  reconstruction_policy_version: unknown;

  reconstruction_reason: unknown;

  assembly_state: unknown;

  persisted_member_count: unknown;

  retained_member_count: unknown;

  original_member_count: unknown;

  removed_change_count: unknown;

  added_change_count: unknown;

  idempotent_recovery: unknown;
};


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


function requireNonBlank(
  value: string,
  fieldName: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return normalized;
}


function requireReturnedString(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `Q14h reconstruction persistence returned invalid ${fieldName}.`,
    );
  }

  return value;
}


function requireNonNegativeInteger(
  value: unknown,
  fieldName: string,
): number {
  const numeric =
    Number(value);

  if (
    !Number.isInteger(numeric) ||
    numeric < 0
  ) {
    throw new Error(
      `Q14h reconstruction persistence returned invalid ${fieldName}.`,
    );
  }

  return numeric;
}


function requireBoolean(
  value: unknown,
  fieldName: string,
): boolean {
  if (typeof value !== "boolean") {
    throw new Error(
      `Q14h reconstruction persistence returned invalid ${fieldName}.`,
    );
  }

  return value;
}


/**
 * B7490-Q14AG16A low-level application wrapper for the existing Q14h
 * atomic reconstruction persistence authority.
 *
 * Responsibility:
 *
 * - validate the already-decided reconstruction persistence request;
 * - preserve the caller-owned child UUID exactly;
 * - send one final evidence-id / immutable-fingerprint member set;
 * - invoke Q14h exactly once; and
 * - validate the exact persisted reconstruction result.
 *
 * This wrapper deliberately does NOT:
 *
 * - read Q14ag14 historical reconstruction context;
 * - choose a historical parent;
 * - load a SEALED parent;
 * - select or evaluate replacement evidence;
 * - generate the child assembly identity;
 * - derive RETAINED versus ORIGINAL membership;
 * - derive source membership identity;
 * - derive REMOVED / ADDED delta provenance;
 * - seal or independently assess the child;
 * - change trust;
 * - grant Route Safety, Crowd Intelligence or ML authority;
 * - create API, cron, retry or scheduling behavior.
 *
 * Those remain separate lifecycle authorities.
 */
export async function persistHsppEvidenceAssemblyReconstruction(
  input: PersistHsppEvidenceAssemblyReconstructionInput,
): Promise<PersistedHsppEvidenceAssemblyReconstruction> {
  const organizationId =
    requireNonBlank(
      input.organizationId,
      "organizationId",
    );

  const parentAssemblyId =
    requireNonBlank(
      input.parentAssemblyId,
      "parentAssemblyId",
    );

  const childAssemblyId =
    requireNonBlank(
      input.childAssemblyId,
      "childAssemblyId",
    );

  if (
    parentAssemblyId ===
    childAssemblyId
  ) {
    throw new Error(
      "parentAssemblyId and childAssemblyId must be distinct.",
    );
  }

  const assemblyVersion =
    input.assemblyVersion ??
    HSPP_EVIDENCE_ASSEMBLY_VERSION;

  if (
    assemblyVersion !==
    HSPP_EVIDENCE_ASSEMBLY_VERSION
  ) {
    throw new Error(
      "Unsupported HSPP evidence assembly version.",
    );
  }

  const membershipPolicyVersion =
    requireNonBlank(
      input.membershipPolicyVersion,
      "membershipPolicyVersion",
    );

  const reconstructionPolicyVersion =
    requireNonBlank(
      input.reconstructionPolicyVersion,
      "reconstructionPolicyVersion",
    );

  const reconstructionReason =
    requireNonBlank(
      input.reconstructionReason,
      "reconstructionReason",
    );

  if (
    !Array.isArray(input.members) ||
    input.members.length < 2
  ) {
    throw new Error(
      "HSPP reconstruction requires at least two final child members.",
    );
  }

  const normalizedMembers =
    input.members.map(
      (
        member,
        index,
      ) => {
        const evidenceId =
          requireNonBlank(
            member.evidenceId,
            `members[${index}].evidenceId`,
          );

        const integrityFingerprint =
          requireNonBlank(
            member.integrityFingerprint,
            `members[${index}].integrityFingerprint`,
          );

        if (
          !SHA256_PATTERN.test(
            integrityFingerprint,
          )
        ) {
          throw new Error(
            `members[${index}].integrityFingerprint must be a lowercase SHA-256 fingerprint.`,
          );
        }

        return {
          evidenceId,
          integrityFingerprint,
        };
      },
    );

  const evidenceIds =
    new Set<string>();

  for (
    const member of
      normalizedMembers
  ) {
    if (
      evidenceIds.has(
        member.evidenceId,
      )
    ) {
      throw new Error(
        "HSPP reconstruction cannot contain duplicate evidence identities.",
      );
    }

    evidenceIds.add(
      member.evidenceId,
    );
  }

  const {
    data,
    error,
  } =
    await input.supabase.rpc(
      HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_RPC,
      {
        p_organization_id:
          organizationId,

        p_parent_assembly_id:
          parentAssemblyId,

        p_child_assembly_id:
          childAssemblyId,

        p_assembly_version:
          assemblyVersion,

        p_membership_policy_version:
          membershipPolicyVersion,

        p_reconstruction_policy_version:
          reconstructionPolicyVersion,

        p_reconstruction_reason:
          reconstructionReason,

        p_members:
          normalizedMembers.map(
            (member) => ({
              evidenceId:
                member.evidenceId,

              integrityFingerprint:
                member.integrityFingerprint,
            }),
          ),
      },
    );

  if (error) {
    throw error;
  }

  const rows =
    Array.isArray(data)
      ? data
      : data
        ? [data]
        : [];

  if (rows.length !== 1) {
    throw new Error(
      "Q14h reconstruction persistence must return exactly one result row.",
    );
  }

  const row =
    rows[0] as
      unknown as
      ReconstructionPersistenceRow;

  const reconstructionId =
    requireReturnedString(
      row.reconstruction_id,
      "reconstruction_id",
    );

  const returnedOrganizationId =
    requireReturnedString(
      row.organization_id,
      "organization_id",
    );

  const returnedParentAssemblyId =
    requireReturnedString(
      row.parent_assembly_id,
      "parent_assembly_id",
    );

  const returnedChildAssemblyId =
    requireReturnedString(
      row.child_assembly_id,
      "child_assembly_id",
    );

  const returnedAssemblyVersion =
    requireReturnedString(
      row.assembly_version,
      "assembly_version",
    );

  const returnedMembershipPolicyVersion =
    requireReturnedString(
      row.membership_policy_version,
      "membership_policy_version",
    );

  const returnedReconstructionPolicyVersion =
    requireReturnedString(
      row.reconstruction_policy_version,
      "reconstruction_policy_version",
    );

  const returnedReconstructionReason =
    requireReturnedString(
      row.reconstruction_reason,
      "reconstruction_reason",
    );

  const returnedAssemblyState =
    requireReturnedString(
      row.assembly_state,
      "assembly_state",
    );

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

  const idempotentRecovery =
    requireBoolean(
      row.idempotent_recovery,
      "idempotent_recovery",
    );

  if (
    returnedOrganizationId !==
      organizationId ||

    returnedParentAssemblyId !==
      parentAssemblyId ||

    returnedChildAssemblyId !==
      childAssemblyId ||

    returnedAssemblyVersion !==
      assemblyVersion ||

    returnedMembershipPolicyVersion !==
      membershipPolicyVersion ||

    returnedReconstructionPolicyVersion !==
      reconstructionPolicyVersion ||

    returnedReconstructionReason !==
      reconstructionReason ||

    returnedAssemblyState !==
      "OPEN" ||

    persistedMemberCount !==
      normalizedMembers.length ||

    retainedMemberCount +
      originalMemberCount !==
      persistedMemberCount ||

    removedChangeCount +
      addedChangeCount <
      1
  ) {
    throw new Error(
      "Q14h reconstruction persistence returned a result that conflicts with the exact request.",
    );
  }

  return {
    persistenceVersion:
      HSPP_EVIDENCE_ASSEMBLY_RECONSTRUCTION_PERSISTENCE_VERSION,

    reconstructionId,

    organizationId,

    parentAssemblyId,

    childAssemblyId,

    assemblyVersion:
      HSPP_EVIDENCE_ASSEMBLY_VERSION,

    membershipPolicyVersion,

    reconstructionPolicyVersion,

    reconstructionReason,

    assemblyState:
      "OPEN",

    persistedMemberCount,

    retainedMemberCount,

    originalMemberCount,

    removedChangeCount,

    addedChangeCount,

    idempotentRecovery,

    members:
      normalizedMembers,
  };
}
