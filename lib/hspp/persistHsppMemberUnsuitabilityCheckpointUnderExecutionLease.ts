export const HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_UNDER_EXECUTION_LEASE_RPC =
  "persist_hspp_member_unsuitability_checkpoint_under_lease" as const;

export const HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_UNDER_EXECUTION_LEASE_WRITER_VERSION =
  "hspp-member-unsuitability-checkpoint-under-execution-lease-v1" as const;

export type PersistHsppMemberUnsuitabilityCheckpointUnderExecutionLeaseInput = {
  supabase: any;

  organizationId: string;

  assemblyId: string;

  leaseToken: string;

  evidenceId: string;

  integrityFingerprint: string;

  observedAt: string;

  decidedAt: string;
};

type UnsuitabilityCheckpointRow = {
  checkpoint_id: unknown;

  organization_id: unknown;

  assembly_id: unknown;

  evidence_id: unknown;

  integrity_fingerprint: unknown;

  prior_positive_checkpoint_id: unknown;

  checkpoint_version: unknown;

  unsuitability_policy_version: unknown;

  unsuitability_reason: unknown;

  observed_at: unknown;

  decided_at: unknown;

  created_at: unknown;
};

export type PersistedHsppMemberUnsuitabilityCheckpoint = {
  writerVersion:
    typeof HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_UNDER_EXECUTION_LEASE_WRITER_VERSION;

  state:
    "MEMBER_UNSUITABILITY_CHECKPOINT_PERSISTED";

  checkpointId: string;

  organizationId: string;

  assemblyId: string;

  evidenceId: string;

  integrityFingerprint: string;

  priorPositiveCheckpointId: string;

  observedAt: string;

  decidedAt: string;

  createdAt: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FINGERPRINT_PATTERN =
  /^[a-f0-9]{64}$/;

function requireUuid(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    !normalized ||
    !UUID_PATTERN.test(normalized)
  ) {
    throw new Error(
      `${fieldName} must be a UUID.`,
    );
  }

  return normalized;
}

function requireFingerprint(
  value: unknown,
): string {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    !FINGERPRINT_PATTERN.test(
      normalized,
    )
  ) {
    throw new Error(
      "integrityFingerprint must be an exact lowercase SHA-256 hexadecimal fingerprint.",
    );
  }

  return normalized;
}

function requireTimestamp(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  const parsed =
    new Date(normalized);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid date-time string.`,
    );
  }

  return parsed.toISOString();
}

/**
 * Q14x lease-only persistence boundary for one already-determined
 * post-positive member-unsuitability fact.
 *
 * This wrapper does not evaluate unsuitability and does not reinterpret
 * an ordinary corroboration denial as post-positive unsuitability.
 *
 * PostgreSQL owns lease fencing, prior-Q14p resolution, immutable
 * constants and exact-retry conflict handling.
 */
export async function persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease({
  supabase,
  organizationId,
  assemblyId,
  leaseToken,
  evidenceId,
  integrityFingerprint,
  observedAt,
  decidedAt,
}: PersistHsppMemberUnsuitabilityCheckpointUnderExecutionLeaseInput): Promise<PersistedHsppMemberUnsuitabilityCheckpoint> {
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

  const normalizedEvidenceId =
    requireUuid(
      evidenceId,
      "evidenceId",
    );

  const normalizedFingerprint =
    requireFingerprint(
      integrityFingerprint,
    );

  const normalizedObservedAt =
    requireTimestamp(
      observedAt,
      "observedAt",
    );

  const normalizedDecidedAt =
    requireTimestamp(
      decidedAt,
      "decidedAt",
    );

  if (
    new Date(
      normalizedDecidedAt,
    ).getTime() <
    new Date(
      normalizedObservedAt,
    ).getTime()
  ) {
    throw new Error(
      "decidedAt must not precede observedAt.",
    );
  }

  const { data, error } =
    await supabase
      .rpc(
        HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_UNDER_EXECUTION_LEASE_RPC,
        {
          p_organization_id:
            normalizedOrganizationId,

          p_assembly_id:
            normalizedAssemblyId,

          p_lease_token:
            normalizedLeaseToken,

          p_evidence_id:
            normalizedEvidenceId,

          p_integrity_fingerprint:
            normalizedFingerprint,

          p_observed_at:
            normalizedObservedAt,

          p_decided_at:
            normalizedDecidedAt,
        },
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Atomic HSPP member-unsuitability checkpoint RPC returned no persisted result.",
    );
  }

  const row =
    data as UnsuitabilityCheckpointRow;

  const returnedCheckpointId =
    requireUuid(
      row.checkpoint_id,
      "checkpointId",
    );

  const returnedPriorPositiveCheckpointId =
    requireUuid(
      row.prior_positive_checkpoint_id,
      "priorPositiveCheckpointId",
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

  const returnedObservedAt =
    requireTimestamp(
      row.observed_at,
      "returnedObservedAt",
    );

  const returnedDecidedAt =
    requireTimestamp(
      row.decided_at,
      "returnedDecidedAt",
    );

  const returnedCreatedAt =
    requireTimestamp(
      row.created_at,
      "createdAt",
    );

  if (
    returnedOrganizationId.toLowerCase() !==
      normalizedOrganizationId.toLowerCase() ||
    returnedAssemblyId.toLowerCase() !==
      normalizedAssemblyId.toLowerCase() ||
    returnedEvidenceId.toLowerCase() !==
      normalizedEvidenceId.toLowerCase() ||
    row.integrity_fingerprint !==
      normalizedFingerprint ||
    row.checkpoint_version !==
      "hspp-assembly-member-unsuitability-checkpoint-v1" ||
    row.unsuitability_policy_version !==
      "hspp-post-positive-member-unsuitability-v1" ||
    row.unsuitability_reason !==
      "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION" ||
    returnedObservedAt !==
      normalizedObservedAt ||
    returnedDecidedAt !==
      normalizedDecidedAt
  ) {
    throw new Error(
      "Atomic HSPP member-unsuitability checkpoint RPC returned a conflicting persistence identity.",
    );
  }

  return {
    writerVersion:
      HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_UNDER_EXECUTION_LEASE_WRITER_VERSION,

    state:
      "MEMBER_UNSUITABILITY_CHECKPOINT_PERSISTED",

    checkpointId:
      returnedCheckpointId,

    organizationId:
      normalizedOrganizationId,

    assemblyId:
      normalizedAssemblyId,

    evidenceId:
      normalizedEvidenceId,

    integrityFingerprint:
      normalizedFingerprint,

    priorPositiveCheckpointId:
      returnedPriorPositiveCheckpointId,

    observedAt:
      normalizedObservedAt,

    decidedAt:
      normalizedDecidedAt,

    createdAt:
      returnedCreatedAt,
  };
}