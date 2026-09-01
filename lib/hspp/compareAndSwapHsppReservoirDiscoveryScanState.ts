import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION,
  type HsppReservoirDiscoveryCursor,
} from "@/lib/hspp/readHsppReservoirDiscoveryPage";

const RPC_NAME =
  "compare_and_swap_hspp_reservoir_discovery_scan_state" as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export type HsppReservoirDiscoveryScanCasState =
  | "CREATED"
  | "ADVANCED"
  | "NO_CHANGE"
  | "STALE";

export type CompareAndSwapHsppReservoirDiscoveryScanStateInput = {
  supabase: SupabaseClient;

  organizationId: string;

  expectedCursor:
    HsppReservoirDiscoveryCursor | null;

  proposedCursor:
    HsppReservoirDiscoveryCursor;
};

export type CompareAndSwapHsppReservoirDiscoveryScanStateResult = {
  casState:
    HsppReservoirDiscoveryScanCasState;

  schedulingVersion:
    typeof HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION;

  organizationId:
    string;

  cursor:
    HsppReservoirDiscoveryCursor | null;

  previousCursor:
    HsppReservoirDiscoveryCursor | null;

  createdAt:
    string | null;

  updatedAt:
    string | null;
};

type RpcRow = {
  cas_state: unknown;
  state_version: unknown;
  organization_id: unknown;

  cursor_observed_at: unknown;
  cursor_evidence_id: unknown;

  previous_cursor_observed_at: unknown;
  previous_cursor_evidence_id: unknown;

  created_at: unknown;
  updated_at: unknown;
};

function requireNonBlank(
  value: string,
  fieldName: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return normalized;
}

function requireUuid(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !UUID_PATTERN.test(
      value.trim(),
    )
  ) {
    throw new Error(
      `${fieldName} must be a UUID.`,
    );
  }

  return value.trim();
}

function requireTimestamp(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} must be a timestamp.`,
    );
  }

  const parsed =
    new Date(
      value,
    );

  if (
    !Number.isFinite(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`,
    );
  }

  return parsed.toISOString();
}

function parseNullableTimestamp(
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

function parseNullableCursor(
  observedAt: unknown,
  evidenceId: unknown,
  fieldName: string,
): HsppReservoirDiscoveryCursor | null {
  const observedMissing =
    observedAt === null ||
    observedAt === undefined;

  const evidenceMissing =
    evidenceId === null ||
    evidenceId === undefined;

  if (
    observedMissing &&
    evidenceMissing
  ) {
    return null;
  }

  if (
    observedMissing !==
    evidenceMissing
  ) {
    throw new Error(
      `${fieldName} must be a complete cursor pair.`,
    );
  }

  return {
    observedAt:
      requireTimestamp(
        observedAt,
        `${fieldName}.observedAt`,
      ),

    evidenceId:
      requireUuid(
        evidenceId,
        `${fieldName}.evidenceId`,
      ),
  };
}

function sameCursor(
  first: HsppReservoirDiscoveryCursor | null,
  second: HsppReservoirDiscoveryCursor | null,
): boolean {
  if (
    first === null ||
    second === null
  ) {
    return first === second;
  }

  return (
    first.observedAt ===
      second.observedAt &&
    first.evidenceId ===
      second.evidenceId
  );
}

function normalizeInputCursor(
  cursor: HsppReservoirDiscoveryCursor,
  fieldName: string,
): HsppReservoirDiscoveryCursor {
  return {
    observedAt:
      requireTimestamp(
        cursor.observedAt,
        `${fieldName}.observedAt`,
      ),

    evidenceId:
      requireUuid(
        cursor.evidenceId,
        `${fieldName}.evidenceId`,
      ),
  };
}

/**
 * Non-authoritative expected -> proposed Reservoir scheduling CAS.
 *
 * The database validates that the proposed cursor identifies the exact
 * organization-scoped immutable HSPP evidence row.
 */
export async function compareAndSwapHsppReservoirDiscoveryScanState({
  supabase,
  organizationId,
  expectedCursor,
  proposedCursor,
}: CompareAndSwapHsppReservoirDiscoveryScanStateInput): Promise<CompareAndSwapHsppReservoirDiscoveryScanStateResult> {
  const normalizedOrganizationId =
    requireUuid(
      requireNonBlank(
        organizationId,
        "organizationId",
      ),
      "organizationId",
    );

  const normalizedExpected =
    expectedCursor
      ? normalizeInputCursor(
          expectedCursor,
          "expectedCursor",
        )
      : null;

  const normalizedProposed =
    normalizeInputCursor(
      proposedCursor,
      "proposedCursor",
    );

  const {
    data,
    error,
  } =
    await supabase.rpc(
      RPC_NAME,
      {
        p_organization_id:
          normalizedOrganizationId,

        p_expected_cursor_observed_at:
          normalizedExpected
            ?.observedAt ??
          null,

        p_expected_cursor_evidence_id:
          normalizedExpected
            ?.evidenceId ??
          null,

        p_proposed_cursor_observed_at:
          normalizedProposed
            .observedAt,

        p_proposed_cursor_evidence_id:
          normalizedProposed
            .evidenceId,
      },
    );

  if (error) {
    throw error;
  }

  if (
    !Array.isArray(data) ||
    data.length !== 1
  ) {
    throw new Error(
      "Reservoir discovery cursor CAS must return exactly one row.",
    );
  }

  const row =
    data[0] as RpcRow;

  if (
    row.cas_state !== "CREATED" &&
    row.cas_state !== "ADVANCED" &&
    row.cas_state !== "NO_CHANGE" &&
    row.cas_state !== "STALE"
  ) {
    throw new Error(
      "Reservoir discovery cursor CAS returned an invalid state.",
    );
  }

  if (
    row.state_version !==
    HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION
  ) {
    throw new Error(
      "Reservoir discovery cursor CAS returned an unexpected scheduling version.",
    );
  }

  const returnedOrganizationId =
    requireUuid(
      row.organization_id,
      "organizationId",
    );

  if (
    returnedOrganizationId !==
    normalizedOrganizationId
  ) {
    throw new Error(
      "Reservoir discovery cursor CAS returned the wrong organization.",
    );
  }

  const cursor =
    parseNullableCursor(
      row.cursor_observed_at,
      row.cursor_evidence_id,
      "cursor",
    );

  const previousCursor =
    parseNullableCursor(
      row.previous_cursor_observed_at,
      row.previous_cursor_evidence_id,
      "previousCursor",
    );

  if (
    row.cas_state !== "STALE" &&
    !sameCursor(
      cursor,
      normalizedProposed,
    )
  ) {
    throw new Error(
      "Successful Reservoir discovery cursor CAS did not persist the proposed cursor.",
    );
  }

  return {
    casState:
      row.cas_state,

    schedulingVersion:
      HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION,

    organizationId:
      returnedOrganizationId,

    cursor,

    previousCursor,

    createdAt:
      parseNullableTimestamp(
        row.created_at,
        "createdAt",
      ),

    updatedAt:
      parseNullableTimestamp(
        row.updated_at,
        "updatedAt",
      ),
  };
}