import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION,
  type HsppAssemblyMembershipReason,
} from "@/lib/hspp/evaluateHsppAssemblyMembership";

export const HSPP_EVIDENCE_ASSEMBLY_PERSISTENCE_VERSION =
  "hspp-evidence-assembly-persistence-v1" as const;

export const HSPP_EVIDENCE_ASSEMBLY_VERSION =
  "hspp-evidence-assembly-v1" as const;

export const HSPP_EVIDENCE_ASSEMBLY_PERSISTENCE_RPC =
  "persist_hspp_evidence_assembly" as const;

export type HsppEvidenceAssemblyPersistenceMember = {
  evidenceId: string;
  integrityFingerprint: string;
};

export type HsppEvidenceAssemblyMembershipRelationPersistence = {
  firstEvidenceId: string;
  secondEvidenceId: string;

  membershipEligible: boolean;

  membershipPolicyVersion: typeof HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION;

  membershipReason: HsppAssemblyMembershipReason;

  distanceMeters: number | null;
  timeDeltaMs: number | null;
};

export type PersistHsppEvidenceAssemblyInput = {
  supabase: SupabaseClient;
  organizationId: string;

  membershipPolicyVersion?: typeof HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION;

  members: HsppEvidenceAssemblyPersistenceMember[];

  membershipRelation?: HsppEvidenceAssemblyMembershipRelationPersistence;
};

export type PersistedHsppEvidenceAssemblyMember = {
  evidenceId: string;
  integrityFingerprint: string;
  memberOrdinal: number;
};

export type PersistedHsppEvidenceAssembly = {
  persistenceVersion: typeof HSPP_EVIDENCE_ASSEMBLY_PERSISTENCE_VERSION;

  assemblyVersion: typeof HSPP_EVIDENCE_ASSEMBLY_VERSION;

  membershipPolicyVersion: typeof HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION;

  organizationId: string;
  assemblyId: string;
  assemblyState: "OPEN";

  members: PersistedHsppEvidenceAssemblyMember[];

  membershipRelation: HsppEvidenceAssemblyMembershipRelationPersistence | null;
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function requireNonBlank(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

/**
 * B7490-07C1 atomic evidence-assembly persistence boundary.
 *
 * Application code performs one PostgreSQL RPC call. The database
 * function creates the OPEN assembly and all initial immutable
 * membership rows inside one transactional statement.
 *
 * It does NOT:
 *
 * - decide whether evidence records belong together;
 * - rescan or reinterpret evidence;
 * - seal the assembly;
 * - create an assembly decision;
 * - modify evidence trust;
 * - apply HSPP assessments;
 * - establish physical-world truth;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility.
 */
export async function persistHsppEvidenceAssembly(
  input: PersistHsppEvidenceAssemblyInput,
): Promise<PersistedHsppEvidenceAssembly> {
  const organizationId = requireNonBlank(
    input.organizationId,
    "organizationId",
  );

  const membershipPolicyVersion =
    input.membershipPolicyVersion ?? HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION;

  if (membershipPolicyVersion !== HSPP_ASSEMBLY_MEMBERSHIP_POLICY_VERSION) {
    throw new Error("Unsupported HSPP assembly membership policy version.");
  }

  if (!Array.isArray(input.members) || input.members.length < 2) {
    throw new Error("HSPP evidence assembly requires at least two members.");
  }

  const normalizedMembers = input.members.map((member, index) => {
    const evidenceId = requireNonBlank(
      member.evidenceId,
      `members[${index}].evidenceId`,
    );

    const integrityFingerprint = requireNonBlank(
      member.integrityFingerprint,
      `members[${index}].integrityFingerprint`,
    );

    if (!SHA256_PATTERN.test(integrityFingerprint)) {
      throw new Error(
        `members[${index}].integrityFingerprint must be a lowercase SHA-256 fingerprint.`,
      );
    }

    return {
      evidenceId,
      integrityFingerprint,
      memberOrdinal: index + 1,
    };
  });

  const evidenceIds = new Set<string>();

  for (const member of normalizedMembers) {
    if (evidenceIds.has(member.evidenceId)) {
      throw new Error(
        "HSPP evidence assembly cannot contain duplicate evidence identities.",
      );
    }

    evidenceIds.add(member.evidenceId);
  }

  const normalizedMembershipRelation = input.membershipRelation
    ? (() => {
        const firstEvidenceId = requireNonBlank(
          input.membershipRelation.firstEvidenceId,
          "membershipRelation.firstEvidenceId",
        );

        const secondEvidenceId = requireNonBlank(
          input.membershipRelation.secondEvidenceId,
          "membershipRelation.secondEvidenceId",
        );

        if (firstEvidenceId === secondEvidenceId) {
          throw new Error(
            "HSPP assembly membership relation requires two distinct evidence identities.",
          );
        }

        if (
          !evidenceIds.has(firstEvidenceId) ||
          !evidenceIds.has(secondEvidenceId)
        ) {
          throw new Error(
            "HSPP assembly membership relation must reference persisted assembly members.",
          );
        }

        if (normalizedMembers.length !== 2) {
          throw new Error(
            "B7490-07K5 membership-relation persistence currently requires exactly two assembly members.",
          );
        }

        if (input.membershipRelation.membershipEligible !== true) {
          throw new Error(
            "Persisted HSPP assembly membership relation must be membership eligible.",
          );
        }

        if (
          input.membershipRelation.membershipPolicyVersion !==
          membershipPolicyVersion
        ) {
          throw new Error(
            "HSPP assembly membership relation policy version does not match the assembly policy version.",
          );
        }

        if (input.membershipRelation.membershipReason !== "ELIGIBLE") {
          throw new Error(
            "Eligible HSPP assembly membership relation must preserve reason ELIGIBLE.",
          );
        }

        const distanceMeters = input.membershipRelation.distanceMeters;

        if (
          distanceMeters !== null &&
          (!Number.isFinite(distanceMeters) || distanceMeters < 0)
        ) {
          throw new Error(
            "membershipRelation.distanceMeters must be null or a non-negative finite number.",
          );
        }

        const timeDeltaMs = input.membershipRelation.timeDeltaMs;

        if (
          timeDeltaMs !== null &&
          (!Number.isFinite(timeDeltaMs) || timeDeltaMs < 0)
        ) {
          throw new Error(
            "membershipRelation.timeDeltaMs must be null or a non-negative finite number.",
          );
        }

        return {
          firstEvidenceId,
          secondEvidenceId,

          membershipEligible: true as const,

          membershipPolicyVersion:
            input.membershipRelation.membershipPolicyVersion,

          membershipReason: input.membershipRelation.membershipReason,

          distanceMeters,
          timeDeltaMs,
        };
      })()
    : null;

  const { data, error } = await input.supabase.rpc(
    HSPP_EVIDENCE_ASSEMBLY_PERSISTENCE_RPC,
    {
      p_organization_id: organizationId,

      p_assembly_version: HSPP_EVIDENCE_ASSEMBLY_VERSION,

      p_membership_policy_version: membershipPolicyVersion,

      p_members: normalizedMembers.map((member) => ({
        evidenceId: member.evidenceId,

        integrityFingerprint: member.integrityFingerprint,
      })),

      p_membership_relation: normalizedMembershipRelation
        ? {
            firstEvidenceId: normalizedMembershipRelation.firstEvidenceId,

            secondEvidenceId: normalizedMembershipRelation.secondEvidenceId,

            membershipEligible: normalizedMembershipRelation.membershipEligible,

            membershipPolicyVersion:
              normalizedMembershipRelation.membershipPolicyVersion,

            membershipReason: normalizedMembershipRelation.membershipReason,

            distanceMeters: normalizedMembershipRelation.distanceMeters,

            timeDeltaMs: normalizedMembershipRelation.timeDeltaMs,
          }
        : null,
    },
  );

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] ?? null) : data;

  if (
    !row ||
    typeof row.assembly_id !== "string" ||
    row.organization_id !== organizationId ||
    row.assembly_version !== HSPP_EVIDENCE_ASSEMBLY_VERSION ||
    row.membership_policy_version !== membershipPolicyVersion ||
    row.assembly_state !== "OPEN" ||
    Number(row.persisted_member_count) !== normalizedMembers.length ||
    Number(row.persisted_membership_relation_count) !==
      (normalizedMembershipRelation ? 1 : 0)
  ) {
    throw new Error(
      "Atomic HSPP evidence assembly persistence returned an invalid result.",
    );
  }

  return {
    persistenceVersion: HSPP_EVIDENCE_ASSEMBLY_PERSISTENCE_VERSION,

    assemblyVersion: HSPP_EVIDENCE_ASSEMBLY_VERSION,

    membershipPolicyVersion,

    organizationId,

    assemblyId: row.assembly_id,

    assemblyState: "OPEN",

    members: normalizedMembers,

    membershipRelation: normalizedMembershipRelation,
  };
}
