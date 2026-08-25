export const HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_WITH_REVALIDATION_UNDER_EXECUTION_LEASE_RPC =
  "persist_hspp_member_revalidation_checkpoint_under_lease" as const;


export const HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_WITH_REVALIDATION_UNDER_EXECUTION_LEASE_WRITER_VERSION =
  "hspp-member-unsuitability-checkpoint-with-revalidation-under-execution-lease-v1" as const;


export const HSPP_MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_VERSION =
  "hspp-assembly-member-unsuitability-checkpoint-v2" as const;


export const HSPP_MEMBER_UNSUITABILITY_REVALIDATION_POLICY_VERSION =
  "hspp-post-positive-member-unsuitability-v2" as const;


export const HSPP_MEMBER_UNSUITABILITY_REVALIDATION_REASON =
  "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION" as const;


export type PersistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLeaseInput = {
  supabase:
    any;

  organizationId:
    string;

  assemblyId:
    string;

  leaseToken:
    string;

  evidenceId:
    string;

  integrityFingerprint:
    string;

  revalidationEvidenceId:
    string;

  revalidationIntegrityFingerprint:
    string;

  observedAt:
    string;

  decidedAt:
    string;
};


type RevalidationUnsuitabilityCheckpointRow = {
  checkpoint_id:
    unknown;

  organization_id:
    unknown;

  assembly_id:
    unknown;

  evidence_id:
    unknown;

  integrity_fingerprint:
    unknown;

  revalidation_evidence_id:
    unknown;

  revalidation_integrity_fingerprint:
    unknown;

  prior_positive_checkpoint_id:
    unknown;

  checkpoint_version:
    unknown;

  unsuitability_policy_version:
    unknown;

  unsuitability_reason:
    unknown;

  observed_at:
    unknown;

  decided_at:
    unknown;

  created_at:
    unknown;
};


export type PersistedHsppMemberUnsuitabilityCheckpointWithRevalidation = {
  writerVersion:
    typeof HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_WITH_REVALIDATION_UNDER_EXECUTION_LEASE_WRITER_VERSION;

  state:
    "MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED";

  checkpointId:
    string;

  organizationId:
    string;

  assemblyId:
    string;

  evidenceId:
    string;

  integrityFingerprint:
    string;

  revalidationEvidenceId:
    string;

  revalidationIntegrityFingerprint:
    string;

  priorPositiveCheckpointId:
    string;

  checkpointVersion:
    typeof HSPP_MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_VERSION;

  unsuitabilityPolicyVersion:
    typeof HSPP_MEMBER_UNSUITABILITY_REVALIDATION_POLICY_VERSION;

  unsuitabilityReason:
    typeof HSPP_MEMBER_UNSUITABILITY_REVALIDATION_REASON;

  observedAt:
    string;

  decidedAt:
    string;

  createdAt:
    string;
};


const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


const FINGERPRINT_PATTERN =
  /^[a-f0-9]{64}$/;


function requireUuid(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new Error(
      `${fieldName} must be a UUID.`,
    );
  }

  const normalized =
    value.trim();

  if (
    !UUID_PATTERN.test(
      normalized,
    )
  ) {
    throw new Error(
      `${fieldName} must be a UUID.`,
    );
  }

  return normalized;
}


function requireFingerprint(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new Error(
      `${fieldName} must be an exact lowercase SHA-256 hexadecimal fingerprint.`,
    );
  }

  const normalized =
    value.trim();

  if (
    !FINGERPRINT_PATTERN.test(
      normalized,
    )
  ) {
    throw new Error(
      `${fieldName} must be an exact lowercase SHA-256 hexadecimal fingerprint.`,
    );
  }

  return normalized;
}


function requireTimestamp(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string"
  ) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`,
    );
  }

  const normalized =
    value.trim();

  if (
    normalized.length === 0 ||
    !Number.isFinite(
      new Date(
        normalized,
      ).getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`,
    );
  }

  return normalized;
}


/**
 * TypeScript boundary for dormant Q14x-v2 persistence.
 *
 * PostgreSQL remains authoritative for:
 *
 * - active execution-lease fencing;
 * - unique prior-positive Q14p resolution;
 * - exact immutable C identity;
 * - exact immutable R1 identity;
 * - exact R1 -> C lineage;
 * - canonical R1 derivation identity;
 * - post-positive chronology;
 * - checkpoint-v2 / policy-v2 constants;
 * - exact immutable retry recovery/conflict detection.
 *
 * This wrapper does not acquire/release a lease, discover/evaluate R1,
 * create cessation, return evidence to Reservoir or reconstruct H2.
 */
export async function persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease({
  supabase,
  organizationId,
  assemblyId,
  leaseToken,
  evidenceId,
  integrityFingerprint,
  revalidationEvidenceId,
  revalidationIntegrityFingerprint,
  observedAt,
  decidedAt,
}: PersistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLeaseInput): Promise<PersistedHsppMemberUnsuitabilityCheckpointWithRevalidation> {
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
      "integrityFingerprint",
    );

  const normalizedRevalidationEvidenceId =
    requireUuid(
      revalidationEvidenceId,
      "revalidationEvidenceId",
    );

  const normalizedRevalidationFingerprint =
    requireFingerprint(
      revalidationIntegrityFingerprint,
      "revalidationIntegrityFingerprint",
    );

  if (
    normalizedRevalidationEvidenceId.toLowerCase() ===
    normalizedEvidenceId.toLowerCase()
  ) {
    throw new Error(
      "revalidationEvidenceId must be distinct from historical evidenceId.",
    );
  }

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


  const {
    data,
    error,
  } =
    await supabase
      .rpc(
        HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_WITH_REVALIDATION_UNDER_EXECUTION_LEASE_RPC,
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

          p_revalidation_evidence_id:
            normalizedRevalidationEvidenceId,

          p_revalidation_integrity_fingerprint:
            normalizedRevalidationFingerprint,

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
      "Atomic R1-based HSPP member-unsuitability checkpoint RPC returned no persisted result.",
    );
  }


  const row =
    data as RevalidationUnsuitabilityCheckpointRow;


  const returnedCheckpointId =
    requireUuid(
      row.checkpoint_id,
      "checkpointId",
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
      "returnedIntegrityFingerprint",
    );

  const returnedRevalidationEvidenceId =
    requireUuid(
      row.revalidation_evidence_id,
      "returnedRevalidationEvidenceId",
    );

  const returnedRevalidationFingerprint =
    requireFingerprint(
      row.revalidation_integrity_fingerprint,
      "returnedRevalidationIntegrityFingerprint",
    );

  const returnedPriorPositiveCheckpointId =
    requireUuid(
      row.prior_positive_checkpoint_id,
      "priorPositiveCheckpointId",
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
    returnedFingerprint !==
      normalizedFingerprint ||
    returnedRevalidationEvidenceId.toLowerCase() !==
      normalizedRevalidationEvidenceId.toLowerCase() ||
    returnedRevalidationFingerprint !==
      normalizedRevalidationFingerprint ||
    row.checkpoint_version !==
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_VERSION ||
    row.unsuitability_policy_version !==
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_POLICY_VERSION ||
    row.unsuitability_reason !==
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_REASON ||
    returnedObservedAt !==
      normalizedObservedAt ||
    returnedDecidedAt !==
      normalizedDecidedAt
  ) {
    throw new Error(
      "Atomic R1-based HSPP member-unsuitability checkpoint RPC returned a conflicting persistence identity.",
    );
  }


  return {
    writerVersion:
      HSPP_MEMBER_UNSUITABILITY_CHECKPOINT_WITH_REVALIDATION_UNDER_EXECUTION_LEASE_WRITER_VERSION,

    state:
      "MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED",

    checkpointId:
      returnedCheckpointId,

    organizationId:
      returnedOrganizationId,

    assemblyId:
      returnedAssemblyId,

    evidenceId:
      returnedEvidenceId,

    integrityFingerprint:
      returnedFingerprint,

    revalidationEvidenceId:
      returnedRevalidationEvidenceId,

    revalidationIntegrityFingerprint:
      returnedRevalidationFingerprint,

    priorPositiveCheckpointId:
      returnedPriorPositiveCheckpointId,

    checkpointVersion:
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_VERSION,

    unsuitabilityPolicyVersion:
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_POLICY_VERSION,

    unsuitabilityReason:
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_REASON,

    observedAt:
      returnedObservedAt,

    decidedAt:
      returnedDecidedAt,

    createdAt:
      returnedCreatedAt,
  };
}
