import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,
  type HsppReservoirPairCursor,
} from "./readHsppReservoirPairPage";

export const HSPP_RESERVOIR_PAIR_CAS_VERSION =
  "hspp-reservoir-pair-scheduling-v1" as const;

export type HsppReservoirPairCasStatus =
  | "CREATED"
  | "STALE"
  | "NO_CHANGE"
  | "ADVANCED";

export type CompareAndSwapHsppReservoirPairScanStateInput = {
  supabase: SupabaseClient;

  organizationId: string;

  expectedCursor: HsppReservoirPairCursor | null;

  proposedCursor: HsppReservoirPairCursor;
};

export type CompareAndSwapHsppReservoirPairScanStateResult = {
  status: HsppReservoirPairCasStatus;

  stateVersion:
    typeof HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION;

  organizationId: string;

  currentCursor:
    HsppReservoirPairCursor | null;

  previousCursor:
    HsppReservoirPairCursor | null;

  createdAt: string | null;
  updatedAt: string | null;
};

type RpcRow = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CAS_STATUSES =
  new Set<HsppReservoirPairCasStatus>([
    "CREATED",
    "STALE",
    "NO_CHANGE",
    "ADVANCED",
  ]);

function requireUuid(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a UUID.`);
  }

  const normalized =
    value.trim().toLowerCase();

  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must be a UUID.`);
  }

  return normalized;
}

function requireCanonicalCursor(
  value: HsppReservoirPairCursor,
  fieldName: string,
): HsppReservoirPairCursor {
  const firstEvidenceId =
    requireUuid(
      value?.firstEvidenceId,
      `${fieldName}.firstEvidenceId`,
    );

  const secondEvidenceId =
    requireUuid(
      value?.secondEvidenceId,
      `${fieldName}.secondEvidenceId`,
    );

  if (!(firstEvidenceId < secondEvidenceId)) {
    throw new Error(
      `${fieldName} must contain a canonical firstEvidenceId < secondEvidenceId pair.`,
    );
  }

  return {
    firstEvidenceId,
    secondEvidenceId,
  };
}

function readNullableCursor(
  row: RpcRow,
  firstField: string,
  secondField: string,
  fieldName: string,
): HsppReservoirPairCursor | null {
  const firstRaw = row[firstField];
  const secondRaw = row[secondField];

  if (
    firstRaw === null &&
    secondRaw === null
  ) {
    return null;
  }

  if (
    firstRaw === null ||
    secondRaw === null
  ) {
    throw new Error(
      `${fieldName} must be fully null or fully populated.`,
    );
  }

  return requireCanonicalCursor(
    {
      firstEvidenceId:
        requireUuid(
          firstRaw,
          `${fieldName}.firstEvidenceId`,
        ),

      secondEvidenceId:
        requireUuid(
          secondRaw,
          `${fieldName}.secondEvidenceId`,
        ),
    },
    fieldName,
  );
}

function sameCursor(
  left: HsppReservoirPairCursor | null,
  right: HsppReservoirPairCursor | null,
): boolean {
  if (!left || !right) {
    return left === right;
  }

  return (
    left.firstEvidenceId ===
      right.firstEvidenceId &&
    left.secondEvidenceId ===
      right.secondEvidenceId
  );
}

function readTimestamp(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value !== "string" ||
    !Number.isFinite(
      Date.parse(value),
    )
  ) {
    throw new Error(
      `${fieldName} must be an ISO timestamp or null.`,
    );
  }

  return value;
}

/**
 * Optimistic CAS for Reservoir pair scheduling state only.
 *
 * Cursor movement grants no operational, Reservoir,
 * membership, assembly, reconstruction, trust or downstream
 * authority.
 */
export async function compareAndSwapHsppReservoirPairScanState(
  input: CompareAndSwapHsppReservoirPairScanStateInput,
): Promise<CompareAndSwapHsppReservoirPairScanStateResult> {
  const organizationId =
    requireUuid(
      input.organizationId,
      "organizationId",
    );

  const expectedCursor =
    input.expectedCursor
      ? requireCanonicalCursor(
          input.expectedCursor,
          "expectedCursor",
        )
      : null;

  const proposedCursor =
    requireCanonicalCursor(
      input.proposedCursor,
      "proposedCursor",
    );

  const { data, error } =
    await input.supabase.rpc(
      "compare_and_swap_hspp_reservoir_pair_scan_state",
      {
        p_organization_id:
          organizationId,

        p_expected_first_evidence_id:
          expectedCursor?.firstEvidenceId ??
          null,

        p_expected_second_evidence_id:
          expectedCursor?.secondEvidenceId ??
          null,

        p_proposed_first_evidence_id:
          proposedCursor.firstEvidenceId,

        p_proposed_second_evidence_id:
          proposedCursor.secondEvidenceId,
      },
    );

  if (error) {
    throw new Error(
      `Unable to compare-and-swap HSPP Reservoir pair scheduling state: ${error.message}`,
    );
  }

  if (
    !Array.isArray(data) ||
    data.length !== 1
  ) {
    throw new Error(
      "Reservoir pair scheduling CAS RPC must return exactly one row.",
    );
  }

  const rawRow =
    data[0];

  if (
    !rawRow ||
    typeof rawRow !== "object" ||
    Array.isArray(rawRow)
  ) {
    throw new Error(
      "Reservoir pair scheduling CAS returned an invalid row.",
    );
  }

  const row =
    rawRow as RpcRow;

  const status =
    row.status;

  if (
    typeof status !== "string" ||
    !CAS_STATUSES.has(
      status as HsppReservoirPairCasStatus,
    )
  ) {
    throw new Error(
      "Reservoir pair scheduling CAS returned an invalid status.",
    );
  }

  if (
    row.state_version !==
    HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION
  ) {
    throw new Error(
      "Reservoir pair scheduling CAS returned an unexpected state version.",
    );
  }

  const rowOrganizationId =
    requireUuid(
      row.organization_id,
      "result.organizationId",
    );

  if (
    rowOrganizationId !==
    organizationId
  ) {
    throw new Error(
      "Reservoir pair scheduling CAS returned a different organization.",
    );
  }

  const currentCursor =
    readNullableCursor(
      row,
      "cursor_first_evidence_id",
      "cursor_second_evidence_id",
      "result.currentCursor",
    );

  const previousCursor =
    readNullableCursor(
      row,
      "previous_cursor_first_evidence_id",
      "previous_cursor_second_evidence_id",
      "result.previousCursor",
    );

  const normalizedStatus =
    status as HsppReservoirPairCasStatus;

  if (
    normalizedStatus !== "STALE" &&
    !sameCursor(
      currentCursor,
      proposedCursor,
    )
  ) {
    throw new Error(
      "Successful Reservoir pair scheduling CAS must expose the proposed cursor as current.",
    );
  }

  const createdAt =
    readTimestamp(
      row.created_at,
      "result.createdAt",
    );

  const updatedAt =
    readTimestamp(
      row.updated_at,
      "result.updatedAt",
    );

  if (
    normalizedStatus !== "STALE" &&
    (
      !createdAt ||
      !updatedAt
    )
  ) {
    throw new Error(
      "Successful Reservoir pair scheduling CAS must expose timestamps.",
    );
  }

  return {
    status:
      normalizedStatus,

    stateVersion:
      HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

    organizationId,

    currentCursor,
    previousCursor,

    createdAt,
    updatedAt,
  };
}