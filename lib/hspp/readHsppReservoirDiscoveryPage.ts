import type { SupabaseClient } from "@supabase/supabase-js";

export const HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION =
  "hspp-reservoir-discovery-scheduling-v1" as const;

export const HSPP_RESERVOIR_DISCOVERY_PAGE_MAX_LIMIT = 100;

const RPC_NAME =
  "read_hspp_reservoir_discovery_page" as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export type HsppReservoirDiscoveryCursor = {
  observedAt: string;
  evidenceId: string;
};

export type HsppReservoirDiscoveryPageItem = {
  evidenceId: string;
  observedAt: string;
  position: number;
};

export type ReadHsppReservoirDiscoveryPageInput = {
  supabase: SupabaseClient;
  organizationId: string;
  limit: number;
};

export type ReadHsppReservoirDiscoveryPageResult = {
  schedulingVersion:
    typeof HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION;

  organizationId: string;

  requestedLimit: number;

  expectedCursor:
    HsppReservoirDiscoveryCursor | null;

  proposedCursor:
    HsppReservoirDiscoveryCursor | null;

  items: HsppReservoirDiscoveryPageItem[];
};

type RpcRow = {
  scheduling_version: unknown;

  cursor_expected_observed_at: unknown;
  cursor_expected_evidence_id: unknown;

  cursor_proposed_observed_at: unknown;
  cursor_proposed_evidence_id: unknown;

  candidate_evidence_id: unknown;
  candidate_observed_at: unknown;
  candidate_position: unknown;
};

function requireNonBlank(
  value: string,
  fieldName: string,
): string {
  const normalized = value.trim();

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
    !UUID_PATTERN.test(value.trim())
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
    new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`,
    );
  }

  return parsed.toISOString();
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

function normalizeLimit(
  limit: number,
): number {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit >
      HSPP_RESERVOIR_DISCOVERY_PAGE_MAX_LIMIT
  ) {
    throw new Error(
      `limit must be an integer between 1 and ${HSPP_RESERVOIR_DISCOVERY_PAGE_MAX_LIMIT}.`,
    );
  }

  return limit;
}

/**
 * Non-authoritative Reservoir discovery scheduling read.
 *
 * The database owns circular keyset selection. This wrapper only
 * validates the returned scheduling page.
 *
 * It performs no CAS and grants no HSPP semantic authority.
 */
export async function readHsppReservoirDiscoveryPage({
  supabase,
  organizationId,
  limit,
}: ReadHsppReservoirDiscoveryPageInput): Promise<ReadHsppReservoirDiscoveryPageResult> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  const normalizedLimit =
    normalizeLimit(
      limit,
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

        p_limit:
          normalizedLimit,
      },
    );

  if (error) {
    throw error;
  }

  if (
    data !== null &&
    data !== undefined &&
    !Array.isArray(data)
  ) {
    throw new Error(
      "Reservoir discovery page RPC returned a non-array result.",
    );
  }

  const rows =
    (data || []) as RpcRow[];

  if (
    rows.length >
    normalizedLimit
  ) {
    throw new Error(
      "Reservoir discovery page exceeded its requested limit.",
    );
  }

  if (rows.length === 0) {
    return {
      schedulingVersion:
        HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION,

      organizationId:
        normalizedOrganizationId,

      requestedLimit:
        normalizedLimit,

      expectedCursor:
        null,

      proposedCursor:
        null,

      items:
        [],
    };
  }

  const firstRow =
    rows[0];

  if (!firstRow) {
    throw new Error(
      "Non-empty Reservoir discovery page has no first row.",
    );
  }

  const expectedCursor =
    parseNullableCursor(
      firstRow.cursor_expected_observed_at,
      firstRow.cursor_expected_evidence_id,
      "expectedCursor",
    );

  const proposedCursor =
    parseNullableCursor(
      firstRow.cursor_proposed_observed_at,
      firstRow.cursor_proposed_evidence_id,
      "proposedCursor",
    );

  if (!proposedCursor) {
    throw new Error(
      "Non-empty Reservoir discovery page has no proposed cursor.",
    );
  }

  const seenEvidenceIds =
    new Set<string>();

  const items =
    rows.map(
      (
        row,
        index,
      ): HsppReservoirDiscoveryPageItem => {
        if (
          row.scheduling_version !==
          HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION
        ) {
          throw new Error(
            "Reservoir discovery page returned an unexpected scheduling version.",
          );
        }

        const rowExpectedCursor =
          parseNullableCursor(
            row.cursor_expected_observed_at,
            row.cursor_expected_evidence_id,
            "expectedCursor",
          );

        const rowProposedCursor =
          parseNullableCursor(
            row.cursor_proposed_observed_at,
            row.cursor_proposed_evidence_id,
            "proposedCursor",
          );

        if (
          !sameCursor(
            expectedCursor,
            rowExpectedCursor,
          )
        ) {
          throw new Error(
            "Reservoir discovery page returned inconsistent expected cursors.",
          );
        }

        if (
          !sameCursor(
            proposedCursor,
            rowProposedCursor,
          )
        ) {
          throw new Error(
            "Reservoir discovery page returned inconsistent proposed cursors.",
          );
        }

        const evidenceId =
          requireUuid(
            row.candidate_evidence_id,
            "candidateEvidenceId",
          );

        if (
          seenEvidenceIds.has(
            evidenceId,
          )
        ) {
          throw new Error(
            `Reservoir discovery page repeated evidence ${evidenceId}.`,
          );
        }

        seenEvidenceIds.add(
          evidenceId,
        );

        const position =
          Number(
            row.candidate_position,
          );

        if (
          !Number.isInteger(position) ||
          position !==
            index + 1
        ) {
          throw new Error(
            "Reservoir discovery page returned an invalid candidate position.",
          );
        }

        return {
          evidenceId,

          observedAt:
            requireTimestamp(
              row.candidate_observed_at,
              "candidateObservedAt",
            ),

          position,
        };
      },
    );


  const finalItem =
    items[
      items.length - 1
    ];

  if (
    finalItem.evidenceId !==
      proposedCursor.evidenceId ||
    finalItem.observedAt !==
      proposedCursor.observedAt
  ) {
    throw new Error(
      "Reservoir discovery proposed cursor is not the final raw page row.",
    );
  }

  return {
    schedulingVersion:
      HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION,

    organizationId:
      normalizedOrganizationId,

    requestedLimit:
      normalizedLimit,

    expectedCursor,

    proposedCursor,

    items,
  };
}