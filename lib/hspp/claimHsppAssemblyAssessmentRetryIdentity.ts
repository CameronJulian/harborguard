import type { SupabaseClient } from "@supabase/supabase-js";

export const HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_VERSION =
  "hspp-assembly-assessment-retry-identity-v1" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_VERSION =
  "hspp-assembly-assessment-retry-identity-claim-v1" as const;

export const HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_RPC =
  "claim_hspp_assembly_assessment_retry_identity" as const;

type RetryIdentityRow = {
  organization_id: string;

  assembly_id: string;

  retry_identity_version: string;

  assessed_at: string;

  created_at: string;
};

export type ClaimHsppAssemblyAssessmentRetryIdentityInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;

  /**
   * Caller-owned proposed deterministic Q12 retry identity.
   *
   * The database may return an earlier persisted assessedAt when another
   * caller already claimed the immutable identity for this assembly.
   */
  proposedAssessedAt: string;
};

export type ClaimedHsppAssemblyAssessmentRetryIdentity = {
  claimVersion: typeof HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_VERSION;

  retryIdentityVersion: typeof HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_VERSION;

  organizationId: string;

  assemblyId: string;

  /**
   * Canonical persisted retry identity.
   *
   * This value may differ from proposedAssessedAt when the identity was
   * already claimed by an earlier caller.
   */
  assessedAt: string;

  /**
   * Persistence provenance for the identity row only.
   *
   * This is not assessedAt and does not represent Q12 completion.
   */
  createdAt: string;
};

function requireNonBlank(value: unknown, fieldName: string): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} is required.`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function requireTimestamp(value: unknown, fieldName: string): string {
  const normalized = requireNonBlank(value, fieldName);

  if (Number.isNaN(Date.parse(normalized))) {
    throw new Error(`${fieldName} must be a valid timestamp.`);
  }

  return normalized;
}

/**
 * B7490-07Q13d2 atomic retry-identity claim-or-recover boundary.
 *
 * The caller proposes one assessedAt. The database decides whether that
 * proposal becomes canonical:
 *
 * - no persisted identity -> persist the caller proposal;
 * - persisted identity exists -> return the persisted canonical value.
 *
 * This function deliberately does NOT require the returned assessedAt to
 * equal proposedAssessedAt.
 *
 * It does not generate time, perform recovery discovery, run Q12, infer
 * Q12 completion, mutate evidence, or alter assembly lifecycle state.
 */
export async function claimHsppAssemblyAssessmentRetryIdentity({
  supabase,
  organizationId,
  assemblyId,
  proposedAssessedAt,
}: ClaimHsppAssemblyAssessmentRetryIdentityInput): Promise<ClaimedHsppAssemblyAssessmentRetryIdentity> {
  const normalizedOrganizationId = requireNonBlank(
    organizationId,
    "organizationId",
  );

  const normalizedAssemblyId = requireNonBlank(assemblyId, "assemblyId");

  const normalizedProposedAssessedAt = requireTimestamp(
    proposedAssessedAt,
    "proposedAssessedAt",
  );

  const { data, error } = await supabase.rpc(
    HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_RPC,
    {
      p_organization_id: normalizedOrganizationId,

      p_assembly_id: normalizedAssemblyId,

      p_proposed_assessed_at: normalizedProposedAssessedAt,
    },
  );

  if (error) {
    throw error;
  }

  const rows = (data || []) as unknown as RetryIdentityRow[];

  if (rows.length !== 1) {
    throw new Error(
      "Atomic HSPP assembly assessment retry-identity claim returned an invalid result.",
    );
  }

  const row = rows[0];

  const persistedOrganizationId = requireNonBlank(
    row.organization_id,
    "retryIdentity.organizationId",
  );

  const persistedAssemblyId = requireNonBlank(
    row.assembly_id,
    "retryIdentity.assemblyId",
  );

  const retryIdentityVersion = requireNonBlank(
    row.retry_identity_version,
    "retryIdentity.retryIdentityVersion",
  );

  const assessedAt = requireTimestamp(
    row.assessed_at,
    "retryIdentity.assessedAt",
  );

  const createdAt = requireTimestamp(row.created_at, "retryIdentity.createdAt");

  if (persistedOrganizationId !== normalizedOrganizationId) {
    throw new Error(
      "Atomic HSPP retry-identity claim returned the wrong organization.",
    );
  }

  if (persistedAssemblyId !== normalizedAssemblyId) {
    throw new Error(
      "Atomic HSPP retry-identity claim returned the wrong assembly.",
    );
  }

  if (
    retryIdentityVersion !== HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_VERSION
  ) {
    throw new Error(
      "Atomic HSPP retry-identity claim returned an unsupported identity version.",
    );
  }

  return {
    claimVersion: HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_VERSION,

    retryIdentityVersion: HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_VERSION,

    organizationId: persistedOrganizationId,

    assemblyId: persistedAssemblyId,

    assessedAt,

    createdAt,
  };
}
