import type { SupabaseClient } from "@supabase/supabase-js";


export const HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READER_VERSION =
  "hspp-historical-reconstruction-context-reader-v1" as const;


export const HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READ_RPC =
  "read_hspp_historical_reconstruction_contexts" as const;


export type ReadHsppHistoricalReconstructionContextsInput = {
  /**
   * Q14ag14 is service-role-only.
   *
   * The caller must provide the trusted service-role Supabase client.
   */
  supabase: SupabaseClient;

  organizationId: string;

  evidenceIds: string[];
};


export type HsppHistoricalReconstructionContext = {
  evidenceId: string;

  historicalMembershipId: string;

  parentAssemblyId: string;

  evidenceIntegrityFingerprint: string;

  parentMemberOrdinal: number;

  cessationId: string;

  unsuitabilityCheckpointId: string;

  cessationVersion: string;

  cessationPolicyVersion: string;

  cessationReason: string;

  ceasedAt: string;
};


export type ReadHsppHistoricalReconstructionContextsResult = {
  readerVersion:
    typeof HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READER_VERSION;

  organizationId: string;

  /**
   * Trimmed, deterministically de-duplicated request identities.
   *
   * The original pre-normalization request remains bounded to 100,
   * matching Q14ag14's database boundary.
   */
  requestedEvidenceIds: string[];

  /**
   * Exact actionable Q14ag14 reconstruction-source contexts.
   *
   * Presence of one of these rows identifies an exact historical
   * membership and exact unreconstructed SEALED parent. It does not
   * itself decide that reconstruction should occur.
   */
  contexts: HsppHistoricalReconstructionContext[];

  /**
   * Requested evidence identities for which Q14ag14 returned no row.
   *
   * This is a valid lifecycle outcome. It can mean there is no exact
   * cessation-backed reconstruction source, the old parent already has
   * a successor, or history is ambiguous.
   *
   * Missing context must never be converted into guessed parentage.
   */
  noContextEvidenceIds: string[];
};


type HistoricalReconstructionContextRow = {
  evidence_id: unknown;

  historical_membership_id: unknown;

  parent_assembly_id: unknown;

  evidence_integrity_fingerprint: unknown;

  parent_member_ordinal: unknown;

  cessation_id: unknown;

  unsuitability_checkpoint_id: unknown;

  cessation_version: unknown;

  cessation_policy_version: unknown;

  cessation_reason: unknown;

  ceased_at: unknown;
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
      `${fieldName} is required.`,
    );
  }

  return value.trim();
}


function requireFingerprint(
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


function requireTimestamp(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName,
    );

  const parsed =
    Date.parse(
      normalized,
    );

  if (
    !Number.isFinite(
      parsed,
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`,
    );
  }

  return new Date(
    parsed,
  ).toISOString();
}


/**
 * B7490-Q14AG16C low-level application reader for the already-deployed
 * Q14ag14 historical reconstruction-context authority.
 *
 * Q14ag14 is intentionally narrower than HISTORICAL_NOT_CURRENT:
 *
 * - a returned row identifies an exact Q14ab cessation-backed immutable
 *   historical membership on an unreconstructed SEALED parent;
 * - a missing row is a VALID no-context result and must never cause this
 *   reader to invent or select historical parentage.
 *
 * This reader:
 *
 * - requires a trusted service-role Supabase client;
 * - bounds the raw request to the same 100-id Q14ag14 limit;
 * - trims and deterministically de-duplicates evidence identities;
 * - invokes Q14ag14 at most once;
 * - validates every returned row fail-closed;
 * - rejects duplicate or unexpected returned evidence identities; and
 * - explicitly preserves requested identities with no returned context.
 *
 * It deliberately does NOT:
 *
 * - decide that reconstruction should occur;
 * - select a parent independently of Q14ag14;
 * - load the SEALED parent;
 * - select or evaluate replacement evidence;
 * - generate a child assembly UUID;
 * - invoke Q14h;
 * - construct the final H2 member set;
 * - derive RETAINED / ORIGINAL membership;
 * - derive REMOVED / ADDED reconstruction provenance;
 * - seal or assess H2;
 * - alter trust or downstream authority;
 * - create API, cron, retry or scheduling behavior.
 */
export async function readHsppHistoricalReconstructionContexts({
  supabase,
  organizationId,
  evidenceIds,
}: ReadHsppHistoricalReconstructionContextsInput): Promise<ReadHsppHistoricalReconstructionContextsResult> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  if (
    !Array.isArray(
      evidenceIds,
    )
  ) {
    throw new Error(
      "evidenceIds must be an array.",
    );
  }

  /**
   * Preserve Q14ag14's exact outer request bound BEFORE de-duplication.
   *
   * 101 repeated identities remain an invalid request even though they
   * would collapse to one distinct identity.
   */
  if (
    evidenceIds.length > 100
  ) {
    throw new Error(
      "Historical reconstruction context reads accept at most 100 evidence ids.",
    );
  }

  const requestedEvidenceIds: string[] =
    [];

  const requestedSet =
    new Set<string>();

  for (
    let index = 0;
    index < evidenceIds.length;
    index += 1
  ) {
    const evidenceId =
      requireNonBlank(
        evidenceIds[index],
        `evidenceIds[${index}]`,
      );

    if (
      requestedSet.has(
        evidenceId,
      )
    ) {
      continue;
    }

    requestedSet.add(
      evidenceId,
    );

    requestedEvidenceIds.push(
      evidenceId,
    );
  }

  if (
    requestedEvidenceIds.length === 0
  ) {
    return {
      readerVersion:
        HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READER_VERSION,

      organizationId:
        normalizedOrganizationId,

      requestedEvidenceIds:
        [],

      contexts:
        [],

      noContextEvidenceIds:
        [],
    };
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READ_RPC,
      {
        p_organization_id:
          normalizedOrganizationId,

        p_evidence_ids:
          requestedEvidenceIds,
      },
    );

  if (error) {
    throw error;
  }

  if (
    !Array.isArray(
      data,
    )
  ) {
    throw new Error(
      "Q14ag14 historical reconstruction context read returned a non-array result.",
    );
  }

  const contextByEvidenceId =
    new Map<
      string,
      HsppHistoricalReconstructionContext
    >();

  for (
    let index = 0;
    index < data.length;
    index += 1
  ) {
    const row =
      data[index] as
        HistoricalReconstructionContextRow;

    const evidenceId =
      requireNonBlank(
        row.evidence_id,
        `rows[${index}].evidence_id`,
      );

    if (
      !requestedSet.has(
        evidenceId,
      )
    ) {
      throw new Error(
        `Q14ag14 returned unexpected evidence ${evidenceId}.`,
      );
    }

    if (
      contextByEvidenceId.has(
        evidenceId,
      )
    ) {
      throw new Error(
        `Q14ag14 returned duplicate evidence ${evidenceId}.`,
      );
    }

    const context:
      HsppHistoricalReconstructionContext =
      {
        evidenceId,

        historicalMembershipId:
          requireNonBlank(
            row.historical_membership_id,
            `rows[${index}].historical_membership_id`,
          ),

        parentAssemblyId:
          requireNonBlank(
            row.parent_assembly_id,
            `rows[${index}].parent_assembly_id`,
          ),

        evidenceIntegrityFingerprint:
          requireFingerprint(
            row.evidence_integrity_fingerprint,
            `rows[${index}].evidence_integrity_fingerprint`,
          ),

        parentMemberOrdinal:
          requirePositiveInteger(
            row.parent_member_ordinal,
            `rows[${index}].parent_member_ordinal`,
          ),

        cessationId:
          requireNonBlank(
            row.cessation_id,
            `rows[${index}].cessation_id`,
          ),

        unsuitabilityCheckpointId:
          requireNonBlank(
            row.unsuitability_checkpoint_id,
            `rows[${index}].unsuitability_checkpoint_id`,
          ),

        cessationVersion:
          requireNonBlank(
            row.cessation_version,
            `rows[${index}].cessation_version`,
          ),

        cessationPolicyVersion:
          requireNonBlank(
            row.cessation_policy_version,
            `rows[${index}].cessation_policy_version`,
          ),

        cessationReason:
          requireNonBlank(
            row.cessation_reason,
            `rows[${index}].cessation_reason`,
          ),

        ceasedAt:
          requireTimestamp(
            row.ceased_at,
            `rows[${index}].ceased_at`,
          ),
      };

    contextByEvidenceId.set(
      evidenceId,
      context,
    );
  }

  /**
   * Return contexts in normalized request order rather than relying on
   * database row order. Q14ag14 remains the sole parent/context authority;
   * this ordering is presentation only.
   */
  const contexts =
    requestedEvidenceIds.flatMap(
      (evidenceId) => {
        const context =
          contextByEvidenceId.get(
            evidenceId,
          );

        return context
          ? [context]
          : [];
      },
    );

  const noContextEvidenceIds =
    requestedEvidenceIds.filter(
      (evidenceId) =>
        !contextByEvidenceId.has(
          evidenceId,
        ),
    );

  return {
    readerVersion:
      HSPP_HISTORICAL_RECONSTRUCTION_CONTEXT_READER_VERSION,

    organizationId:
      normalizedOrganizationId,

    requestedEvidenceIds,

    contexts,

    noContextEvidenceIds,
  };
}
