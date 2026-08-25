import type {
  SupabaseClient,
} from "@supabase/supabase-js";


export const
HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_VERSION =
  "hspp-post-positive-revalidation-candidate-scan-state-v1" as const;


export const
HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_CAS_VERSION =
  "hspp-post-positive-revalidation-candidate-scan-state-cas-v1" as const;


export const
HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_CAS_RPC =
  "compare_and_swap_hspp_revalidation_candidate_scan_state" as const;


const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


export type HsppPostPositiveRevalidationCandidateScanCursor = {
  observedAt:
    string;

  evidenceId:
    string;
};


export type HsppPostPositiveRevalidationCandidateScanStateCasState =
  | "ADVANCED"
  | "EXACT_RETRY"
  | "NO_CHANGE"
  | "STALE";


export type CompareAndSwapHsppPostPositiveRevalidationCandidateScanStateInput = {
  supabase:
    SupabaseClient;

  positiveCheckpointId:
    string;

  expectedCursor:
    | HsppPostPositiveRevalidationCandidateScanCursor
    | null;

  proposedCursor:
    HsppPostPositiveRevalidationCandidateScanCursor;
};


export type CompareAndSwapHsppPostPositiveRevalidationCandidateScanStateResult = {
  operationVersion:
    typeof HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_CAS_VERSION;

  stateVersion:
    typeof HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_VERSION;

  state:
    HsppPostPositiveRevalidationCandidateScanStateCasState;

  positiveCheckpointId:
    string;

  organizationId:
    string;

  subjectEvidenceId:
    string;

  subjectIntegrityFingerprint:
    string;

  currentCursor:
    | HsppPostPositiveRevalidationCandidateScanCursor
    | null;

  previousCursor:
    | HsppPostPositiveRevalidationCandidateScanCursor
    | null;

  createdAt:
    string | null;

  updatedAt:
    string | null;
};


type CandidateScanStateRpcRow = {
  cas_state?:
    unknown;

  state_version?:
    unknown;

  positive_checkpoint_id?:
    unknown;

  organization_id?:
    unknown;

  subject_evidence_id?:
    unknown;

  subject_integrity_fingerprint?:
    unknown;

  cursor_observed_at?:
    unknown;

  cursor_evidence_id?:
    unknown;

  previous_cursor_observed_at?:
    unknown;

  previous_cursor_evidence_id?:
    unknown;

  created_at?:
    unknown;

  updated_at?:
    unknown;
};


function requireNonBlank(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      label + " is required.",
    );
  }

  return value;
}


function requireUuid(
  value: unknown,
  label: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      label,
    );

  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(
      label + " must be a UUID.",
    );
  }

  return normalized;
}


function requireFingerprint(
  value: unknown,
  label: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      label,
    );

  if (!SHA256_PATTERN.test(normalized)) {
    throw new Error(
      label + " must be a lowercase SHA-256 fingerprint.",
    );
  }

  return normalized;
}


function requireTimestamp(
  value: unknown,
  label: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      label,
    );

  const parsed =
    Date.parse(
      normalized,
    );

  if (!Number.isFinite(parsed)) {
    throw new Error(
      label + " must be a valid timestamp.",
    );
  }

  return normalized;
}


function optionalTimestamp(
  value: unknown,
  label: string,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return requireTimestamp(
    value,
    label,
  );
}


function normalizeInputCursor(
  cursor:
    HsppPostPositiveRevalidationCandidateScanCursor,
  label: string,
): HsppPostPositiveRevalidationCandidateScanCursor {
  if (
    !cursor ||
    typeof cursor !== "object"
  ) {
    throw new Error(
      label + " is required.",
    );
  }

  return {
    observedAt:
      requireTimestamp(
        cursor.observedAt,
        label + ".observedAt",
      ),

    evidenceId:
      requireUuid(
        cursor.evidenceId,
        label + ".evidenceId",
      ),
  };
}


function readPersistedCursor(
  observedAt: unknown,
  evidenceId: unknown,
  label: string,
): HsppPostPositiveRevalidationCandidateScanCursor | null {
  const hasObservedAt =
    observedAt !== null &&
    observedAt !== undefined;

  const hasEvidenceId =
    evidenceId !== null &&
    evidenceId !== undefined;

  if (hasObservedAt !== hasEvidenceId) {
    throw new Error(
      label + " contains a partial cursor pair.",
    );
  }

  if (!hasObservedAt) {
    return null;
  }

  return {
    observedAt:
      requireTimestamp(
        observedAt,
        label + ".observedAt",
      ),

    evidenceId:
      requireUuid(
        evidenceId,
        label + ".evidenceId",
      ),
  };
}


function sameCursor(
  left:
    | HsppPostPositiveRevalidationCandidateScanCursor
    | null,
  right:
    | HsppPostPositiveRevalidationCandidateScanCursor
    | null,
): boolean {
  if (
    left === null ||
    right === null
  ) {
    return left === right;
  }

  return (
    left.observedAt ===
      right.observedAt &&
    left.evidenceId ===
      right.evidenceId
  );
}


function requireState(
  value: unknown,
): HsppPostPositiveRevalidationCandidateScanStateCasState {
  if (
    value !== "ADVANCED" &&
    value !== "EXACT_RETRY" &&
    value !== "NO_CHANGE" &&
    value !== "STALE"
  ) {
    throw new Error(
      "R1 candidate scan-state CAS returned an unsupported state.",
    );
  }

  return value;
}


export async function
compareAndSwapHsppPostPositiveRevalidationCandidateScanState({
  supabase,
  positiveCheckpointId:
    rawPositiveCheckpointId,
  expectedCursor:
    rawExpectedCursor,
  proposedCursor:
    rawProposedCursor,
}: CompareAndSwapHsppPostPositiveRevalidationCandidateScanStateInput): Promise<CompareAndSwapHsppPostPositiveRevalidationCandidateScanStateResult> {

  const positiveCheckpointId =
    requireUuid(
      rawPositiveCheckpointId,
      "positiveCheckpointId",
    );


  const expectedCursor =
    rawExpectedCursor === null
      ? null
      : normalizeInputCursor(
          rawExpectedCursor,
          "expectedCursor",
        );


  const proposedCursor =
    normalizeInputCursor(
      rawProposedCursor,
      "proposedCursor",
    );


  const {
    data,
    error,
  } =
    await supabase
      .rpc(
        HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_CAS_RPC,
        {
          p_positive_checkpoint_id:
            positiveCheckpointId,

          p_expected_cursor_observed_at:
            expectedCursor?.observedAt ??
            null,

          p_expected_cursor_evidence_id:
            expectedCursor?.evidenceId ??
            null,

          p_proposed_cursor_observed_at:
            proposedCursor.observedAt,

          p_proposed_cursor_evidence_id:
            proposedCursor.evidenceId,
        },
      )
      .maybeSingle();


  if (error) {
    throw error;
  }


  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error(
      "R1 candidate scan-state CAS returned an invalid result.",
    );
  }


  const row =
    data as CandidateScanStateRpcRow;


  const state =
    requireState(
      row.cas_state,
    );


  if (
    row.state_version !==
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_VERSION
  ) {
    throw new Error(
      "R1 candidate scan-state CAS returned an unsupported state version.",
    );
  }


  const returnedPositiveCheckpointId =
    requireUuid(
      row.positive_checkpoint_id,
      "scanState.positiveCheckpointId",
    );

  if (
    returnedPositiveCheckpointId !==
      positiveCheckpointId
  ) {
    throw new Error(
      "R1 candidate scan-state CAS returned the wrong positive checkpoint.",
    );
  }


  const organizationId =
    requireUuid(
      row.organization_id,
      "scanState.organizationId",
    );


  const subjectEvidenceId =
    requireUuid(
      row.subject_evidence_id,
      "scanState.subjectEvidenceId",
    );


  const subjectIntegrityFingerprint =
    requireFingerprint(
      row.subject_integrity_fingerprint,
      "scanState.subjectIntegrityFingerprint",
    );


  const currentCursor =
    readPersistedCursor(
      row.cursor_observed_at,
      row.cursor_evidence_id,
      "scanState.currentCursor",
    );


  const previousCursor =
    readPersistedCursor(
      row.previous_cursor_observed_at,
      row.previous_cursor_evidence_id,
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
    (createdAt === null) !==
      (updatedAt === null)
  ) {
    throw new Error(
      "R1 candidate scan-state timestamps must both exist or both be null.",
    );
  }


  if (
    state !== "STALE" &&
    (
      createdAt === null ||
      updatedAt === null
    )
  ) {
    throw new Error(
      "Persisted R1 candidate scan-state timestamps are required.",
    );
  }


  if (
    state === "ADVANCED" ||
    state === "EXACT_RETRY"
  ) {
    if (
      !sameCursor(
        currentCursor,
        proposedCursor,
      ) ||
      !sameCursor(
        previousCursor,
        expectedCursor,
      )
    ) {
      throw new Error(
        "R1 candidate scan-state CAS returned conflicting advancement identity.",
      );
    }
  }


  if (state === "NO_CHANGE") {
    if (
      !sameCursor(
        currentCursor,
        expectedCursor,
      ) ||
      !sameCursor(
        currentCursor,
        proposedCursor,
      )
    ) {
      throw new Error(
        "R1 candidate scan-state CAS returned conflicting no-change identity.",
      );
    }
  }


  return {
    operationVersion:
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_CAS_VERSION,

    stateVersion:
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_SCAN_STATE_VERSION,

    state,

    positiveCheckpointId:
      returnedPositiveCheckpointId,

    organizationId,

    subjectEvidenceId,

    subjectIntegrityFingerprint,

    currentCursor,

    previousCursor,

    createdAt,

    updatedAt,
  };
}
