import test from "node:test";
import assert from "node:assert/strict";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_RESERVOIR_PAIR_MAX_LIMIT,
  HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,
  readHsppReservoirPairPage,
} from "../lib/hspp/readHsppReservoirPairPage";

import {
  compareAndSwapHsppReservoirPairScanState,
} from "../lib/hspp/compareAndSwapHsppReservoirPairScanState";

const organizationId =
  "11111111-1111-4111-8111-111111111111";

const evidence1 =
  "00000000-0000-4000-8000-000000000001";

const evidence2 =
  "00000000-0000-4000-8000-000000000002";

const evidence3 =
  "00000000-0000-4000-8000-000000000003";

const evidence4 =
  "00000000-0000-4000-8000-000000000004";

function makeSupabase(
  rpc:
    (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: unknown;
      error: null | {
        message: string;
      };
    }>,
): SupabaseClient {
  return {
    rpc,
  } as unknown as SupabaseClient;
}

test("pair page performs one bounded RPC and preserves exact scheduled order", async () => {
  const calls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> = [];

  const supabase =
    makeSupabase(
      async (
        name,
        args,
      ) => {
        calls.push({
          name,
          args,
        });

        return {
          error: null,

          data: [
            {
              scheduling_version:
                HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

              organization_id:
                organizationId,

              pair_ordinal: 1,

              first_evidence_id:
                evidence1,

              second_evidence_id:
                evidence2,

              cursor_expected_first_evidence_id:
                null,

              cursor_expected_second_evidence_id:
                null,

              cursor_proposed_first_evidence_id:
                evidence1,

              cursor_proposed_second_evidence_id:
                evidence3,
            },
            {
              scheduling_version:
                HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

              organization_id:
                organizationId,

              pair_ordinal: 2,

              first_evidence_id:
                evidence1,

              second_evidence_id:
                evidence3,

              cursor_expected_first_evidence_id:
                null,

              cursor_expected_second_evidence_id:
                null,

              cursor_proposed_first_evidence_id:
                evidence1,

              cursor_proposed_second_evidence_id:
                evidence3,
            },
          ],
        };
      },
    );

  const result =
    await readHsppReservoirPairPage({
      supabase,
      organizationId,
      limit: 2,
    });

  assert.equal(
    calls.length,
    1,
  );

  assert.equal(
    calls[0]?.name,
    "read_hspp_reservoir_pair_page",
  );

  assert.deepEqual(
    calls[0]?.args,
    {
      p_organization_id:
        organizationId,

      p_limit:
        2,
    },
  );

  assert.deepEqual(
    result.pairs,
    [
      {
        ordinal: 1,
        firstEvidenceId:
          evidence1,
        secondEvidenceId:
          evidence2,
      },
      {
        ordinal: 2,
        firstEvidenceId:
          evidence1,
        secondEvidenceId:
          evidence3,
      },
    ],
  );

  assert.equal(
    result.expectedCursor,
    null,
  );

  assert.deepEqual(
    result.proposedCursor,
    {
      firstEvidenceId:
        evidence1,

      secondEvidenceId:
        evidence3,
    },
  );
});

test("pair page supports an empty bounded scheduling page", async () => {
  const supabase =
    makeSupabase(
      async () => ({
        data: [],
        error: null,
      }),
    );

  const result =
    await readHsppReservoirPairPage({
      supabase,
      organizationId,
    });

  assert.equal(
    result.pairs.length,
    0,
  );

  assert.equal(
    result.expectedCursor,
    null,
  );

  assert.equal(
    result.proposedCursor,
    null,
  );
});

test("pair page rejects limits above one hundred before RPC", async () => {
  let rpcCount = 0;

  const supabase =
    makeSupabase(
      async () => {
        rpcCount += 1;

        return {
          data: [],
          error: null,
        };
      },
    );

  await assert.rejects(
    readHsppReservoirPairPage({
      supabase,
      organizationId,
      limit:
        HSPP_RESERVOIR_PAIR_MAX_LIMIT + 1,
    }),
    /between 1 and 100/,
  );

  assert.equal(
    rpcCount,
    0,
  );
});

test("pair page rejects non-canonical pair identities returned by the RPC", async () => {
  const supabase =
    makeSupabase(
      async () => ({
        error: null,

        data: [
          {
            scheduling_version:
              HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

            organization_id:
              organizationId,

            pair_ordinal: 1,

            first_evidence_id:
              evidence3,

            second_evidence_id:
              evidence2,

            cursor_expected_first_evidence_id:
              null,

            cursor_expected_second_evidence_id:
              null,

            cursor_proposed_first_evidence_id:
              evidence3,

            cursor_proposed_second_evidence_id:
              evidence2,
          },
        ],
      }),
    );

  await assert.rejects(
    readHsppReservoirPairPage({
      supabase,
      organizationId,
    }),
    /canonical/,
  );
});

test("pair CAS performs one RPC with the exact expected and proposed pair cursors", async () => {
  const calls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> = [];

  const supabase =
    makeSupabase(
      async (
        name,
        args,
      ) => {
        calls.push({
          name,
          args,
        });

        return {
          error: null,

          data: [
            {
              status:
                "ADVANCED",

              state_version:
                HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

              organization_id:
                organizationId,

              cursor_first_evidence_id:
                evidence2,

              cursor_second_evidence_id:
                evidence4,

              previous_cursor_first_evidence_id:
                evidence1,

              previous_cursor_second_evidence_id:
                evidence3,

              created_at:
                "2026-09-01T07:00:00.000Z",

              updated_at:
                "2026-09-01T07:05:00.000Z",
            },
          ],
        };
      },
    );

  const result =
    await compareAndSwapHsppReservoirPairScanState({
      supabase,
      organizationId,

      expectedCursor: {
        firstEvidenceId:
          evidence1,

        secondEvidenceId:
          evidence3,
      },

      proposedCursor: {
        firstEvidenceId:
          evidence2,

        secondEvidenceId:
          evidence4,
      },
    });

  assert.equal(
    calls.length,
    1,
  );

  assert.equal(
    calls[0]?.name,
    "compare_and_swap_hspp_reservoir_pair_scan_state",
  );

  assert.deepEqual(
    calls[0]?.args,
    {
      p_organization_id:
        organizationId,

      p_expected_first_evidence_id:
        evidence1,

      p_expected_second_evidence_id:
        evidence3,

      p_proposed_first_evidence_id:
        evidence2,

      p_proposed_second_evidence_id:
        evidence4,
    },
  );

  assert.equal(
    result.status,
    "ADVANCED",
  );

  assert.deepEqual(
    result.currentCursor,
    {
      firstEvidenceId:
        evidence2,

      secondEvidenceId:
        evidence4,
    },
  );
});

test("pair CAS permits STALE scheduling contention without pretending the proposed cursor won", async () => {
  const supabase =
    makeSupabase(
      async () => ({
        error: null,

        data: [
          {
            status:
              "STALE",

            state_version:
              HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

            organization_id:
              organizationId,

            cursor_first_evidence_id:
              evidence2,

            cursor_second_evidence_id:
              evidence4,

            previous_cursor_first_evidence_id:
              evidence1,

            previous_cursor_second_evidence_id:
              evidence2,

            created_at:
              "2026-09-01T07:00:00.000Z",

            updated_at:
              "2026-09-01T07:05:00.000Z",
          },
        ],
      }),
    );

  const result =
    await compareAndSwapHsppReservoirPairScanState({
      supabase,
      organizationId,

      expectedCursor: {
        firstEvidenceId:
          evidence1,

        secondEvidenceId:
          evidence3,
      },

      proposedCursor: {
        firstEvidenceId:
          evidence3,

        secondEvidenceId:
          evidence4,
      },
    });

  assert.equal(
    result.status,
    "STALE",
  );

  assert.deepEqual(
    result.currentCursor,
    {
      firstEvidenceId:
        evidence2,

      secondEvidenceId:
        evidence4,
    },
  );
});

test("pair CAS fails closed when a successful result does not expose the proposed cursor", async () => {
  const supabase =
    makeSupabase(
      async () => ({
        error: null,

        data: [
          {
            status:
              "ADVANCED",

            state_version:
              HSPP_RESERVOIR_PAIR_SCHEDULING_VERSION,

            organization_id:
              organizationId,

            cursor_first_evidence_id:
              evidence1,

            cursor_second_evidence_id:
              evidence2,

            previous_cursor_first_evidence_id:
              null,

            previous_cursor_second_evidence_id:
              null,

            created_at:
              "2026-09-01T07:00:00.000Z",

            updated_at:
              "2026-09-01T07:05:00.000Z",
          },
        ],
      }),
    );

  await assert.rejects(
    compareAndSwapHsppReservoirPairScanState({
      supabase,
      organizationId,

      expectedCursor:
        null,

      proposedCursor: {
        firstEvidenceId:
          evidence3,

        secondEvidenceId:
          evidence4,
      },
    }),
    /proposed cursor as current/,
  );
});