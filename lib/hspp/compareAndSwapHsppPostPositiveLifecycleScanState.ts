import type {
  SupabaseClient,
} from "@supabase/supabase-js";


export const
  HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_VERSION =
    "hspp-post-positive-lifecycle-scan-state-v1";


export const
  HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_VERSION =
    "hspp-post-positive-lifecycle-scan-state-cas-v1";


export const
  HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_RPC =
    "compare_and_swap_hspp_post_positive_lifecycle_scan_state";


export type HsppPostPositiveLifecycleScanCursor = {
  positiveAssessedAt: string;

  positiveCheckpointId: string;
};


export type HsppPostPositiveLifecycleScanStateCasState =
  | "ADVANCED"
  | "EXACT_RETRY"
  | "NO_CHANGE"
  | "STALE"
  | "CONTENDED";


export type CompareAndSwapHsppPostPositiveLifecycleScanStateInput = {
  supabase: SupabaseClient;

  organizationId: string;

  expectedCursor:
    | HsppPostPositiveLifecycleScanCursor
    | null;

  proposedCursor:
    HsppPostPositiveLifecycleScanCursor;
};


export type CompareAndSwapHsppPostPositiveLifecycleScanStateResult = {
  operationVersion:
    typeof HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_VERSION;

  stateVersion:
    typeof HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_VERSION;

  state:
    HsppPostPositiveLifecycleScanStateCasState;

  organizationId: string;

  currentCursor:
    | HsppPostPositiveLifecycleScanCursor
    | null;

  previousCursor:
    | HsppPostPositiveLifecycleScanCursor
    | null;

  createdAt:
    | string
    | null;

  updatedAt:
    | string
    | null;
};


type ScanStateCasRow = {
  cas_state?: unknown;

  state_version?: unknown;

  organization_id?: unknown;

  cursor_positive_assessed_at?: unknown;

  cursor_positive_checkpoint_id?: unknown;

  previous_cursor_positive_assessed_at?: unknown;

  previous_cursor_positive_checkpoint_id?: unknown;

  created_at?: unknown;

  updated_at?: unknown;
};


function requireNonBlank(
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

  return normalized;
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
    Number.isNaN(
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


function requireExactCursorTimestamp(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName,
    );

  if (
    Number.isNaN(
      Date.parse(
        normalized,
      ),
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`,
    );
  }

  /*
   * Cursor assessedAt is immutable PostgreSQL identity.
   *
   * Do not round-trip it through JavaScript Date because PostgreSQL
   * timestamptz may contain microsecond precision while JavaScript
   * Date preserves only milliseconds.
   */
  return normalized;
}


function optionalTimestamp(
  value: unknown,
  fieldName: string,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return requireTimestamp(
    value,
    fieldName,
  );
}


function normalizeCursor(
  cursor:
    | HsppPostPositiveLifecycleScanCursor
    | null,
  fieldName: string,
): HsppPostPositiveLifecycleScanCursor | null {
  if (cursor === null) {
    return null;
  }

  return {
    positiveAssessedAt:
      requireExactCursorTimestamp(
        cursor.positiveAssessedAt,
        `${fieldName}.positiveAssessedAt`,
      ),

    positiveCheckpointId:
      requireNonBlank(
        cursor.positiveCheckpointId,
        `${fieldName}.positiveCheckpointId`,
      ),
  };
}


function readPersistedCursor(
  assessedAt: unknown,
  checkpointId: unknown,
  fieldName: string,
): HsppPostPositiveLifecycleScanCursor | null {
  const assessedAtMissing =
    assessedAt === null ||
    assessedAt === undefined;

  const checkpointIdMissing =
    checkpointId === null ||
    checkpointId === undefined;

  if (
    assessedAtMissing &&
    checkpointIdMissing
  ) {
    return null;
  }

  if (
    assessedAtMissing !==
    checkpointIdMissing
  ) {
    throw new Error(
      `${fieldName} returned a partial cursor pair.`,
    );
  }

  return {
    positiveAssessedAt:
      requireExactCursorTimestamp(
        assessedAt,
        `${fieldName}.positiveAssessedAt`,
      ),

    positiveCheckpointId:
      requireNonBlank(
        checkpointId,
        `${fieldName}.positiveCheckpointId`,
      ),
  };
}


function sameCursor(
  left:
    | HsppPostPositiveLifecycleScanCursor
    | null,
  right:
    | HsppPostPositiveLifecycleScanCursor
    | null,
): boolean {
  if (
    left === null ||
    right === null
  ) {
    return (
      left === null &&
      right === null
    );
  }

  return (
    left.positiveAssessedAt ===
      right.positiveAssessedAt &&
    left.positiveCheckpointId ===
      right.positiveCheckpointId
  );
}


/**
 * Compare-and-swap one organization-scoped post-positive fairness
 * cursor.
 *
 * This client owns no discovery, evaluation, lifecycle authority,
 * wall-clock cursor identity, retry loop or orchestration.
 *
 * PostgreSQL owns serialization, positive-checkpoint validation,
 * exact-retry recognition and stale-writer rejection.
 */
export async function
compareAndSwapHsppPostPositiveLifecycleScanState({
  supabase,

  organizationId,

  expectedCursor,

  proposedCursor,
}: CompareAndSwapHsppPostPositiveLifecycleScanStateInput): Promise<
  CompareAndSwapHsppPostPositiveLifecycleScanStateResult
> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  const normalizedExpectedCursor =
    normalizeCursor(
      expectedCursor,
      "expectedCursor",
    );

  const normalizedProposedCursor =
    normalizeCursor(
      proposedCursor,
      "proposedCursor",
    );

  if (
    normalizedProposedCursor === null
  ) {
    throw new Error(
      "proposedCursor is required.",
    );
  }


  const {
    data,
    error,
  } =
    await supabase.rpc(
      HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_RPC,
      {
        p_organization_id:
          normalizedOrganizationId,

        p_expected_cursor_positive_assessed_at:
          normalizedExpectedCursor
            ?.positiveAssessedAt ??
          null,

        p_expected_cursor_positive_checkpoint_id:
          normalizedExpectedCursor
            ?.positiveCheckpointId ??
          null,

        p_proposed_cursor_positive_assessed_at:
          normalizedProposedCursor
            .positiveAssessedAt,

        p_proposed_cursor_positive_checkpoint_id:
          normalizedProposedCursor
            .positiveCheckpointId,
      },
    );


  if (error) {
    throw error;
  }


  const rows =
    (data || []) as unknown as
      ScanStateCasRow[];


  if (rows.length !== 1) {
    throw new Error(
      "HSPP post-positive lifecycle scan-state CAS returned an invalid result.",
    );
  }


  const row =
    rows[0];


  const persistedOrganizationId =
    requireNonBlank(
      row.organization_id,
      "scanState.organizationId",
    );


  if (
    persistedOrganizationId !==
    normalizedOrganizationId
  ) {
    throw new Error(
      "HSPP post-positive lifecycle scan-state CAS returned the wrong organization.",
    );
  }


  const stateVersion =
    requireNonBlank(
      row.state_version,
      "scanState.stateVersion",
    );


  if (
    stateVersion !==
    HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_VERSION
  ) {
    throw new Error(
      "HSPP post-positive lifecycle scan-state CAS returned an unsupported state version.",
    );
  }


  const state =
    requireNonBlank(
      row.cas_state,
      "scanState.casState",
    );


  if (
    state !== "ADVANCED" &&
    state !== "EXACT_RETRY" &&
    state !== "NO_CHANGE" &&
    state !== "STALE" &&
    state !== "CONTENDED"
  ) {
    throw new Error(
      "HSPP post-positive lifecycle scan-state CAS returned an invalid state.",
    );
  }


  const currentCursor =
    readPersistedCursor(
      row.cursor_positive_assessed_at,
      row.cursor_positive_checkpoint_id,
      "scanState.currentCursor",
    );


  const previousCursor =
    readPersistedCursor(
      row.previous_cursor_positive_assessed_at,
      row.previous_cursor_positive_checkpoint_id,
      "scanState.previousCursor",
    );


  const createdAt =
    optionalTimestamp(
      row.created_at,
      "scanState.createdAt",
    );


  const updatedAt =
    optionalTimestamp(
      row.updated_at,
      "scanState.updatedAt",
    );


  if (
    state === "ADVANCED" ||
    state === "EXACT_RETRY"
  ) {
    if (
      !sameCursor(
        currentCursor,
        normalizedProposedCursor,
      )
    ) {
      throw new Error(
        "HSPP post-positive lifecycle scan-state CAS returned the wrong current cursor.",
      );
    }

    if (
      !sameCursor(
        previousCursor,
        normalizedExpectedCursor,
      )
    ) {
      throw new Error(
        "HSPP post-positive lifecycle scan-state CAS returned the wrong previous cursor.",
      );
    }

    if (
      createdAt === null ||
      updatedAt === null
    ) {
      throw new Error(
        "HSPP post-positive lifecycle scan-state CAS returned incomplete persistence timestamps.",
      );
    }
  }


  if (
    state === "NO_CHANGE"
  ) {
    if (
      !sameCursor(
        normalizedExpectedCursor,
        normalizedProposedCursor,
      ) ||
      !sameCursor(
        currentCursor,
        normalizedProposedCursor,
      )
    ) {
      throw new Error(
        "HSPP post-positive lifecycle scan-state CAS returned an invalid NO_CHANGE identity.",
      );
    }

    if (
      createdAt === null ||
      updatedAt === null
    ) {
      throw new Error(
        "HSPP post-positive lifecycle scan-state CAS returned incomplete persistence timestamps.",
      );
    }
  }


  if (
    state === "STALE" &&
    currentCursor !== null &&
    (
      createdAt === null ||
      updatedAt === null
    )
  ) {
    throw new Error(
      "HSPP post-positive lifecycle scan-state CAS returned incomplete persisted stale state.",
    );
  }


  /*
   * CONTENDED carries no persisted-state observation. Null cursor and
   * timestamp fields therefore mean "not observed", not "durably absent".
   */
  if (
    state === "CONTENDED" &&
    (
      currentCursor !== null ||
      previousCursor !== null ||
      createdAt !== null ||
      updatedAt !== null
    )
  ) {
    throw new Error(
      "HSPP post-positive lifecycle scan-state CAS returned persisted state for CONTENDED.",
    );
  }


  return {
    operationVersion:
      HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_VERSION,

    stateVersion:
      HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_VERSION,

    state,

    organizationId:
      persistedOrganizationId,

    currentCursor,

    previousCursor,

    createdAt,

    updatedAt,
  };
}
