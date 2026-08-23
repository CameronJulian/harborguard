export const HSPP_ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_UNDER_EXECUTION_LEASE_RPC =
  "persist_hspp_assembly_member_effective_cessation_under_lease" as const;

export const HSPP_ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_UNDER_EXECUTION_LEASE_WRITER_VERSION =
  "hspp-assembly-member-effective-cessation-under-execution-lease-v1" as const;

export type PersistHsppAssemblyMemberEffectiveCessationUnderExecutionLeaseInput = {
  supabase: any;

  organizationId: string;

  assemblyId: string;

  leaseToken: string;

  unsuitabilityCheckpointId: string;
};

type EffectiveCessationRow = {
  cessation_id: unknown;

  organization_id: unknown;

  assembly_id: unknown;

  evidence_id: unknown;

  integrity_fingerprint: unknown;

  historical_membership_id: unknown;

  unsuitability_checkpoint_id: unknown;

  cessation_version: unknown;

  cessation_policy_version: unknown;

  cessation_reason: unknown;

  ceased_at: unknown;

  created_at: unknown;
};

export type PersistedHsppAssemblyMemberEffectiveCessation = {
  writerVersion:
    typeof HSPP_ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_UNDER_EXECUTION_LEASE_WRITER_VERSION;

  state:
    "ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_PERSISTED";

  cessationId: string;

  organizationId: string;

  assemblyId: string;

  evidenceId: string;

  integrityFingerprint: string;

  historicalMembershipId: string;

  unsuitabilityCheckpointId: string;

  cessationVersion:
    "hspp-assembly-member-effective-cessation-v1";

  cessationPolicyVersion:
    "hspp-post-positive-effective-membership-cessation-v1";

  cessationReason:
    "POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP";

  ceasedAt: string;

  createdAt: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;

function requireUuid(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    !UUID_PATTERN.test(value.trim())
  ) {
    throw new Error(
      `${label} must be a UUID.`,
    );
  }

  return value.trim().toLowerCase();
}

function requireFingerprint(
  value: unknown,
): string {
  if (
    typeof value !== "string" ||
    !SHA256_PATTERN.test(value)
  ) {
    throw new Error(
      "Returned integrity fingerprint must be an exact lowercase SHA-256 hexadecimal fingerprint.",
    );
  }

  return value;
}

function requireTimestamp(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${label} must be a timestamp string.`,
    );
  }

  const timestamp =
    new Date(
      value,
    );

  if (Number.isNaN(timestamp.getTime())) {
    throw new Error(
      `${label} must be a valid timestamp.`,
    );
  }

  return timestamp.toISOString();
}

/**
 * B7490-14AC1 application boundary.
 *
 * This wrapper deliberately accepts only the surrounding organization /
 * historical assembly scope, one active execution-lease token and the exact
 * Q14v unsuitability-checkpoint id.
 *
 * Evidence identity, fingerprint, historical membership and ceasedAt are
 * database-owned Q14ab derivations and are therefore never caller inputs.
 *
 * This function is intentionally dormant until a later post-positive runtime
 * evaluator owns the lifecycle transition. It does not wire Reservoir or Q14h.
 */
export async function persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease({
  supabase,
  organizationId,
  assemblyId,
  leaseToken,
  unsuitabilityCheckpointId,
}: PersistHsppAssemblyMemberEffectiveCessationUnderExecutionLeaseInput): Promise<PersistedHsppAssemblyMemberEffectiveCessation> {
  const normalizedOrganizationId =
    requireUuid(
      organizationId,
      "organizationId",
    );

  const normalizedAssemblyId =
    requireUuid(
      assemblyId,
      "assemblyId",
    );

  const normalizedLeaseToken =
    requireUuid(
      leaseToken,
      "leaseToken",
    );

  const normalizedUnsuitabilityCheckpointId =
    requireUuid(
      unsuitabilityCheckpointId,
      "unsuitabilityCheckpointId",
    );

  const { data, error } =
    await supabase
      .rpc(
        HSPP_ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_UNDER_EXECUTION_LEASE_RPC,
        {
          p_organization_id:
            normalizedOrganizationId,

          p_assembly_id:
            normalizedAssemblyId,

          p_lease_token:
            normalizedLeaseToken,

          p_unsuitability_checkpoint_id:
            normalizedUnsuitabilityCheckpointId,
        },
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Atomic HSPP effective-membership cessation RPC returned no persisted result.",
    );
  }

  const row =
    data as EffectiveCessationRow;

  const returnedCessationId =
    requireUuid(
      row.cessation_id,
      "returnedCessationId",
    );

  const returnedOrganizationId =
    requireUuid(
      row.organization_id,
      "returnedOrganizationId",
    );

  const returnedAssemblyId =
    requireUuid(
      row.assembly_id,
      "returnedAssemblyId",
    );

  const returnedEvidenceId =
    requireUuid(
      row.evidence_id,
      "returnedEvidenceId",
    );

  const returnedFingerprint =
    requireFingerprint(
      row.integrity_fingerprint,
    );

  const returnedHistoricalMembershipId =
    requireUuid(
      row.historical_membership_id,
      "returnedHistoricalMembershipId",
    );

  const returnedUnsuitabilityCheckpointId =
    requireUuid(
      row.unsuitability_checkpoint_id,
      "returnedUnsuitabilityCheckpointId",
    );

  const returnedCeasedAt =
    requireTimestamp(
      row.ceased_at,
      "returnedCeasedAt",
    );

  const returnedCreatedAt =
    requireTimestamp(
      row.created_at,
      "returnedCreatedAt",
    );

  if (
    returnedOrganizationId !==
      normalizedOrganizationId ||
    returnedAssemblyId !==
      normalizedAssemblyId ||
    returnedUnsuitabilityCheckpointId !==
      normalizedUnsuitabilityCheckpointId ||
    row.cessation_version !==
      "hspp-assembly-member-effective-cessation-v1" ||
    row.cessation_policy_version !==
      "hspp-post-positive-effective-membership-cessation-v1" ||
    row.cessation_reason !==
      "POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP"
  ) {
    throw new Error(
      "Atomic HSPP effective-membership cessation RPC returned a conflicting persistence identity.",
    );
  }

  return {
    writerVersion:
      HSPP_ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_UNDER_EXECUTION_LEASE_WRITER_VERSION,

    state:
      "ASSEMBLY_MEMBER_EFFECTIVE_CESSATION_PERSISTED",

    cessationId:
      returnedCessationId,

    organizationId:
      normalizedOrganizationId,

    assemblyId:
      normalizedAssemblyId,

    evidenceId:
      returnedEvidenceId,

    integrityFingerprint:
      returnedFingerprint,

    historicalMembershipId:
      returnedHistoricalMembershipId,

    unsuitabilityCheckpointId:
      normalizedUnsuitabilityCheckpointId,

    cessationVersion:
      "hspp-assembly-member-effective-cessation-v1",

    cessationPolicyVersion:
      "hspp-post-positive-effective-membership-cessation-v1",

    cessationReason:
      "POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP",

    ceasedAt:
      returnedCeasedAt,

    createdAt:
      returnedCreatedAt,
  };
}