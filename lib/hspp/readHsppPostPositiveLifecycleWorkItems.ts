import type { SupabaseClient } from "@supabase/supabase-js";

export const HSPP_POST_POSITIVE_LIFECYCLE_WORK_READER_VERSION =
  "hspp-post-positive-lifecycle-work-reader-v1" as const;

export const HSPP_POST_POSITIVE_LIFECYCLE_WORK_RPC =
  "read_hspp_post_positive_lifecycle_work_items" as const;

export const HSPP_POST_POSITIVE_LIFECYCLE_WORK_MAX_LIMIT = 100;

export type HsppPostPositiveLifecycleWorkState =
  | "REEVALUATION_REQUIRED"
  | "CESSATION_REQUIRED";

export type HsppPostPositiveLifecycleWorkItem = {
  positiveCheckpointId: string;

  organizationId: string;

  assemblyId: string;

  membershipId: string;

  evidenceId: string;

  integrityFingerprint: string;

  positiveAssessedAt: string;

  unsuitabilityCheckpointId:
    | string
    | null;

  unsuitabilityObservedAt:
    | string
    | null;

  unsuitabilityDecidedAt:
    | string
    | null;

  workState:
    HsppPostPositiveLifecycleWorkState;
};

export type ReadHsppPostPositiveLifecycleWorkItemsInput = {
  supabase: SupabaseClient;

  organizationId: string;

  limit?: number;
};

export type ReadHsppPostPositiveLifecycleWorkItemsResult = {
  readerVersion:
    typeof HSPP_POST_POSITIVE_LIFECYCLE_WORK_READER_VERSION;

  organizationId: string;

  requestedLimit: number;

  workItems:
    HsppPostPositiveLifecycleWorkItem[];
};

type PostPositiveLifecycleWorkRow = {
  positive_checkpoint_id?: unknown;

  organization_id?: unknown;

  assembly_id?: unknown;

  membership_id?: unknown;

  evidence_id?: unknown;

  integrity_fingerprint?: unknown;

  positive_assessed_at?: unknown;

  unsuitability_checkpoint_id?: unknown;

  unsuitability_observed_at?: unknown;

  unsuitability_decided_at?: unknown;

  work_state?: unknown;
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

function requireTimestamp(
  value: unknown,
  fieldName: string,
): string {
  const raw =
    requireNonBlank(
      value,
      fieldName,
    );

  const parsed =
    new Date(raw);

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

function requireNullableNonBlank(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === null) {
    return null;
  }

  return requireNonBlank(
    value,
    fieldName,
  );
}

function requireNullableTimestamp(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === null) {
    return null;
  }

  return requireTimestamp(
    value,
    fieldName,
  );
}

function requireFingerprint(
  value: unknown,
): string {
  const fingerprint =
    requireNonBlank(
      value,
      "integrityFingerprint",
    );

  if (
    !/^[a-f0-9]{64}$/.test(
      fingerprint,
    )
  ) {
    throw new Error(
      "integrityFingerprint must be an exact lowercase SHA-256 hexadecimal fingerprint.",
    );
  }

  return fingerprint;
}

function normalizeLimit(
  limit: number | undefined,
): number {
  const normalized =
    limit ??
    HSPP_POST_POSITIVE_LIFECYCLE_WORK_MAX_LIMIT;

  if (
    !Number.isInteger(
      normalized,
    ) ||
    normalized < 1 ||
    normalized >
      HSPP_POST_POSITIVE_LIFECYCLE_WORK_MAX_LIMIT
  ) {
    throw new Error(
      `limit must be an integer between 1 and ${HSPP_POST_POSITIVE_LIFECYCLE_WORK_MAX_LIMIT}.`,
    );
  }

  return normalized;
}

function requireWorkState(
  value: unknown,
): HsppPostPositiveLifecycleWorkState {
  if (
    value !== "REEVALUATION_REQUIRED" &&
    value !== "CESSATION_REQUIRED"
  ) {
    throw new Error(
      "Post-positive lifecycle work returned an unsupported work state.",
    );
  }

  return value;
}

/**
 * Bounded read-only post-positive lifecycle work discovery.
 *
 * This reader does not:
 *
 * - decide that a member is unsuitable;
 * - invent a post-positive observation timestamp;
 * - acquire an execution lease;
 * - persist Q14v;
 * - persist Q14ab/Q14ac;
 * - alter effective membership;
 * - return evidence to the Reservoir;
 * - select replacement evidence;
 * - create or validate a descendant assembly.
 *
 * CESSATION_REQUIRED deliberately remains discoverable after Q14v so
 * a crash between Q14x and Q14ac can resume from persisted authority.
 */
export async function readHsppPostPositiveLifecycleWorkItems({
  supabase,
  organizationId,
  limit,
}: ReadHsppPostPositiveLifecycleWorkItemsInput): Promise<ReadHsppPostPositiveLifecycleWorkItemsResult> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  const requestedLimit =
    normalizeLimit(
      limit,
    );

  const {
    data,
    error,
  } =
    await supabase.rpc(
      HSPP_POST_POSITIVE_LIFECYCLE_WORK_RPC,
      {
        p_organization_id:
          normalizedOrganizationId,

        p_limit:
          requestedLimit,
      },
    );

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "Post-positive lifecycle work RPC returned an invalid result.",
    );
  }

  const seenPositiveCheckpoints =
    new Set<string>();

  const workItems =
    (
      data as PostPositiveLifecycleWorkRow[]
    ).map(
      (
        row,
        rowIndex,
      ): HsppPostPositiveLifecycleWorkItem => {
        const positiveCheckpointId =
          requireNonBlank(
            row.positive_checkpoint_id,
            `row ${rowIndex}.positiveCheckpointId`,
          );

        if (
          seenPositiveCheckpoints.has(
            positiveCheckpointId,
          )
        ) {
          throw new Error(
            `Post-positive lifecycle work returned duplicate positive checkpoint ${positiveCheckpointId}.`,
          );
        }

        seenPositiveCheckpoints.add(
          positiveCheckpointId,
        );

        const persistedOrganizationId =
          requireNonBlank(
            row.organization_id,
            `row ${rowIndex}.organizationId`,
          );

        if (
          persistedOrganizationId !==
          normalizedOrganizationId
        ) {
          throw new Error(
            "Post-positive lifecycle work returned a row for the wrong organization.",
          );
        }

        const assemblyId =
          requireNonBlank(
            row.assembly_id,
            `row ${rowIndex}.assemblyId`,
          );

        const membershipId =
          requireNonBlank(
            row.membership_id,
            `row ${rowIndex}.membershipId`,
          );

        const evidenceId =
          requireNonBlank(
            row.evidence_id,
            `row ${rowIndex}.evidenceId`,
          );

        const integrityFingerprint =
          requireFingerprint(
            row.integrity_fingerprint,
          );

        const positiveAssessedAt =
          requireTimestamp(
            row.positive_assessed_at,
            `row ${rowIndex}.positiveAssessedAt`,
          );

        const unsuitabilityCheckpointId =
          requireNullableNonBlank(
            row.unsuitability_checkpoint_id,
            `row ${rowIndex}.unsuitabilityCheckpointId`,
          );

        const unsuitabilityObservedAt =
          requireNullableTimestamp(
            row.unsuitability_observed_at,
            `row ${rowIndex}.unsuitabilityObservedAt`,
          );

        const unsuitabilityDecidedAt =
          requireNullableTimestamp(
            row.unsuitability_decided_at,
            `row ${rowIndex}.unsuitabilityDecidedAt`,
          );

        const workState =
          requireWorkState(
            row.work_state,
          );

        const hasUnsuitabilityCheckpoint =
          unsuitabilityCheckpointId !==
          null;

        const hasUnsuitabilityObservedAt =
          unsuitabilityObservedAt !==
          null;

        const hasUnsuitabilityDecidedAt =
          unsuitabilityDecidedAt !==
          null;

        if (
          workState ===
          "REEVALUATION_REQUIRED"
        ) {
          if (
            hasUnsuitabilityCheckpoint ||
            hasUnsuitabilityObservedAt ||
            hasUnsuitabilityDecidedAt
          ) {
            throw new Error(
              "REEVALUATION_REQUIRED work must not expose persisted Q14v authority.",
            );
          }
        }

        if (
          workState ===
          "CESSATION_REQUIRED"
        ) {
          if (
            !hasUnsuitabilityCheckpoint ||
            !hasUnsuitabilityObservedAt ||
            !hasUnsuitabilityDecidedAt
          ) {
            throw new Error(
              "CESSATION_REQUIRED work requires complete persisted Q14v authority.",
            );
          }

          if (
            new Date(
              unsuitabilityObservedAt,
            ).getTime() <
            new Date(
              positiveAssessedAt,
            ).getTime()
          ) {
            throw new Error(
              "Persisted Q14v observation precedes the positive assessment.",
            );
          }

          if (
            new Date(
              unsuitabilityDecidedAt,
            ).getTime() <
            new Date(
              unsuitabilityObservedAt,
            ).getTime()
          ) {
            throw new Error(
              "Persisted Q14v decision precedes its observation.",
            );
          }
        }

        return {
          positiveCheckpointId,

          organizationId:
            persistedOrganizationId,

          assemblyId,

          membershipId,

          evidenceId,

          integrityFingerprint,

          positiveAssessedAt,

          unsuitabilityCheckpointId,

          unsuitabilityObservedAt,

          unsuitabilityDecidedAt,

          workState,
        };
      },
    );

  return {
    readerVersion:
      HSPP_POST_POSITIVE_LIFECYCLE_WORK_READER_VERSION,

    organizationId:
      normalizedOrganizationId,

    requestedLimit,

    workItems,
  };
}
