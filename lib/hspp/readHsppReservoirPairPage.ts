import type { SupabaseClient } from "@supabase/supabase-js";

export const HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION =
  "hspp-reservoir-pair-scheduling-v1" as const;

export const HSPP_RESERVOIR_PAIR_MAX_LIMIT = 100;

export type HsppReservoirPairCursor = {
  firstEvidenceId: string;
  secondEvidenceId: string;
};

export type HsppReservoirScheduledPair = {
  ordinal: number;
  firstEvidenceId: string;
  secondEvidenceId: string;
};

export type ReadHsppReservoirPairPageInput = {
  supabase: SupabaseClient;
  organizationId: string;
  limit?: number;
};

export type ReadHsppReservoirPairPageResult = {
  schedulingVersion: typeof HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION;
  organizationId: string;

  pairs: HsppReservoirScheduledPair[];

  expectedCursor: HsppReservoirPairCursor | null;
  proposedCursor: HsppReservoirPairCursor | null;
};

type RpcRow = Record<string, unknown>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireUuid(
  value: unknown,
  fieldName: string,
): string {
  if (typeof value !== "string") {
    throw new Error(`${fieldName} must be a UUID.`);
  }

  const normalized = value.trim().toLowerCase();

  if (!UUID_PATTERN.test(normalized)) {
    throw new Error(`${fieldName} must be a UUID.`);
  }

  return normalized;
}

function requireInteger(
  value: unknown,
  fieldName: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    throw new Error(`${fieldName} must be an integer.`);
  }

  return value;
}

function requireRpcRow(
  value: unknown,
  index: number,
): RpcRow {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `Reservoir pair page row ${index} is invalid.`,
    );
  }

  return value as RpcRow;
}

function requireCanonicalPair(
  firstEvidenceId: string,
  secondEvidenceId: string,
  fieldName: string,
): HsppReservoirPairCursor {
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

  return requireCanonicalPair(
    requireUuid(
      firstRaw,
      `${fieldName}.firstEvidenceId`,
    ),
    requireUuid(
      secondRaw,
      `${fieldName}.secondEvidenceId`,
    ),
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

/**
 * Read one bounded scheduling page of canonical raw HSPP
 * evidence-pair identities.
 *
 * Scheduling metadata is non-authoritative. This wrapper does
 * NOT decide operational use, Reservoir eligibility, assembly
 * membership, reconstruction, persistence, trust or downstream
 * authority.
 */
export async function readHsppReservoirPairPage(
  input: ReadHsppReservoirPairPageInput,
): Promise<ReadHsppReservoirPairPageResult> {
  const organizationId =
    requireUuid(
      input.organizationId,
      "organizationId",
    );

  const limit =
    input.limit ??
    HSPP_RESERVOIR_PAIR_MAX_LIMIT;

  requireInteger(
    limit,
    "limit",
  );

  if (
    limit < 1 ||
    limit > HSPP_RESERVOIR_PAIR_MAX_LIMIT
  ) {
    throw new Error(
      `limit must be between 1 and ${HSPP_RESERVOIR_PAIR_MAX_LIMIT}.`,
    );
  }

  const { data, error } =
    await input.supabase.rpc(
      "read_hspp_reservoir_pair_page",
      {
        p_organization_id: organizationId,
        p_limit: limit,
      },
    );

  if (error) {
    throw new Error(
      `Unable to read HSPP Reservoir pair scheduling page: ${error.message}`,
    );
  }

  if (
    data === null ||
    (
      Array.isArray(data) &&
      data.length === 0
    )
  ) {
    return {
      schedulingVersion:
        HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

      organizationId,

      pairs: [],

      expectedCursor: null,
      proposedCursor: null,
    };
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "Reservoir pair scheduling RPC did not return an array.",
    );
  }

  if (
    data.length > limit ||
    data.length >
      HSPP_RESERVOIR_PAIR_MAX_LIMIT
  ) {
    throw new Error(
      "Reservoir pair scheduling RPC exceeded its bounded page limit.",
    );
  }

  let expectedCursor:
    HsppReservoirPairCursor | null | undefined;

  let proposedCursor:
    HsppReservoirPairCursor | null | undefined;

  const seenPairs =
    new Set<string>();

  const pairs =
    data.map(
      (
        rawRow,
        index,
      ): HsppReservoirScheduledPair => {
        const row =
          requireRpcRow(
            rawRow,
            index,
          );

        if (
          row.scheduling_version !==
          HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION
        ) {
          throw new Error(
            `Reservoir pair page row ${index} has an unexpected scheduling version.`,
          );
        }

        const rowOrganizationId =
          requireUuid(
            row.organization_id,
            `rows[${index}].organizationId`,
          );

        if (
          rowOrganizationId !==
          organizationId
        ) {
          throw new Error(
            `Reservoir pair page row ${index} belongs to a different organization.`,
          );
        }

        const ordinal =
          requireInteger(
            row.pair_ordinal,
            `rows[${index}].pairOrdinal`,
          );

        if (ordinal !== index + 1) {
          throw new Error(
            "Reservoir pair scheduling ordinals must be contiguous and one-based.",
          );
        }

        const firstEvidenceId =
          requireUuid(
            row.first_evidence_id,
            `rows[${index}].firstEvidenceId`,
          );

        const secondEvidenceId =
          requireUuid(
            row.second_evidence_id,
            `rows[${index}].secondEvidenceId`,
          );

        requireCanonicalPair(
          firstEvidenceId,
          secondEvidenceId,
          `rows[${index}]`,
        );

        const pairKey =
          `${firstEvidenceId}:${secondEvidenceId}`;

        if (seenPairs.has(pairKey)) {
          throw new Error(
            "Reservoir pair scheduling page contains a duplicate pair identity.",
          );
        }

        seenPairs.add(pairKey);

        const rowExpectedCursor =
          readNullableCursor(
            row,
            "cursor_expected_first_evidence_id",
            "cursor_expected_second_evidence_id",
            `rows[${index}].expectedCursor`,
          );

        const rowProposedCursor =
          readNullableCursor(
            row,
            "cursor_proposed_first_evidence_id",
            "cursor_proposed_second_evidence_id",
            `rows[${index}].proposedCursor`,
          );

        if (!rowProposedCursor) {
          throw new Error(
            "Non-empty Reservoir pair scheduling page must expose a proposed cursor.",
          );
        }

        if (index === 0) {
          expectedCursor =
            rowExpectedCursor;

          proposedCursor =
            rowProposedCursor;
        } else {
          if (
            !sameCursor(
              expectedCursor ?? null,
              rowExpectedCursor,
            )
          ) {
            throw new Error(
              "Reservoir pair scheduling page exposes inconsistent expected cursors.",
            );
          }

          if (
            !sameCursor(
              proposedCursor ?? null,
              rowProposedCursor,
            )
          ) {
            throw new Error(
              "Reservoir pair scheduling page exposes inconsistent proposed cursors.",
            );
          }
        }

        return {
          ordinal,
          firstEvidenceId,
          secondEvidenceId,
        };
      },
    );

  if (!proposedCursor) {
    throw new Error(
      "Non-empty Reservoir pair scheduling page has no proposed cursor.",
    );
  }

  const finalPair =
    pairs[pairs.length - 1];

  if (
    !finalPair ||
    finalPair.firstEvidenceId !==
      proposedCursor.firstEvidenceId ||
    finalPair.secondEvidenceId !==
      proposedCursor.secondEvidenceId
  ) {
    throw new Error(
      "Reservoir pair scheduling proposed cursor must equal the final scheduled pair.",
    );
  }

  return {
    schedulingVersion:
      HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

    organizationId,

    pairs,

    expectedCursor:
      expectedCursor ?? null,

    proposedCursor,
  };
}