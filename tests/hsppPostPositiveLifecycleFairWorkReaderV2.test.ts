import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_POST_POSITIVE_LIFECYCLE_FAIR_WORK_READER_VERSION,
  HSPP_POST_POSITIVE_LIFECYCLE_FAIR_WORK_RPC,
  readHsppPostPositiveLifecycleFairWorkItemsV2,
} from "../lib/hspp/readHsppPostPositiveLifecycleFairWorkItemsV2";


const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const ASSEMBLY_ID =
  "22222222-2222-4222-8222-222222222222";

const MEMBERSHIP_ID =
  "33333333-3333-4333-8333-333333333333";

const EVIDENCE_ID =
  "44444444-4444-4444-8444-444444444444";

const FINGERPRINT =
  "a".repeat(
    64,
  );


type Cursor = {
  positiveAssessedAt: string;
  positiveCheckpointId: string;
};


const CURSOR_A: Cursor = {
  positiveAssessedAt:
    "2026-08-24T09:00:00.123456+00:00",

  positiveCheckpointId:
    "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
};


const CURSOR_B: Cursor = {
  positiveAssessedAt:
    "2026-08-24T09:01:00.234567+00:00",

  positiveCheckpointId:
    "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
};


const CURSOR_C: Cursor = {
  positiveAssessedAt:
    "2026-08-24T09:02:00.345678+00:00",

  positiveCheckpointId:
    "cccccccc-cccc-4ccc-8ccc-ccccccccccc3",
};


function makeRow({
  cursor,
  expectedCursor,
  workState,
}: {
  cursor: Cursor;

  expectedCursor:
    | Cursor
    | null;

  workState:
    | "REEVALUATION_REQUIRED"
    | "CESSATION_REQUIRED";
}) {
  const cessation =
    workState ===
    "CESSATION_REQUIRED";


  return {
    positive_checkpoint_id:
      cursor.positiveCheckpointId,

    organization_id:
      ORGANIZATION_ID,

    assembly_id:
      ASSEMBLY_ID,

    membership_id:
      MEMBERSHIP_ID,

    evidence_id:
      EVIDENCE_ID,

    integrity_fingerprint:
      FINGERPRINT,

    positive_assessed_at:
      cursor.positiveAssessedAt,

    unsuitability_checkpoint_id:
      cessation
        ? "dddddddd-dddd-4ddd-8ddd-dddddddddddd"
        : null,

    unsuitability_observed_at:
      cessation
        ? "2026-08-24T09:10:00.000000+00:00"
        : null,

    unsuitability_decided_at:
      cessation
        ? "2026-08-24T09:11:00.000000+00:00"
        : null,

    work_state:
      workState,

    cursor_expected_positive_assessed_at:
      expectedCursor
        ?.positiveAssessedAt ??
      null,

    cursor_expected_positive_checkpoint_id:
      expectedCursor
        ?.positiveCheckpointId ??
      null,

    cursor_proposed_positive_assessed_at:
      CURSOR_C.positiveAssessedAt as string | null,

    cursor_proposed_positive_checkpoint_id:
      CURSOR_C.positiveCheckpointId as string | null,
  };
}


function createSupabase(
  rows: any[],
) {
  const calls:
    Array<{
      name: string;
      args: unknown;
    }> =
      [];


  const supabase = {
    rpc:
      async (
        name: string,
        args: unknown,
      ) => {
        calls.push({
          name,
          args,
        });


        return {
          data:
            rows,

          error:
            null,
        };
      },
  } as unknown as SupabaseClient;


  return {
    supabase,
    calls,
  };
}


test(
  "V2 reader exposes a distinct version and non-overloaded RPC",
  () => {
    assert.equal(
      HSPP_POST_POSITIVE_LIFECYCLE_FAIR_WORK_READER_VERSION,
      "hspp-post-positive-lifecycle-fair-work-reader-v2",
    );


    assert.equal(
      HSPP_POST_POSITIVE_LIFECYCLE_FAIR_WORK_RPC,
      "read_hspp_post_positive_lifecycle_fair_work_items_v2",
    );
  },
);


test(
  "mixed all-state page preserves one cursor proposal to the final selected item",
  async () => {
    const first =
      makeRow({
        cursor:
          CURSOR_B,

        expectedCursor:
          CURSOR_A,

        workState:
          "REEVALUATION_REQUIRED",
      });


    const second =
      makeRow({
        cursor:
          CURSOR_C,

        expectedCursor:
          CURSOR_A,

        workState:
          "CESSATION_REQUIRED",
      });


    const harness =
      createSupabase([
        first,
        second,
      ]);


    const result =
      await readHsppPostPositiveLifecycleFairWorkItemsV2({
        supabase:
          harness.supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          2,
      });


    assert.equal(
      harness.calls.length,
      1,
    );


    assert.equal(
      harness.calls[0]
        ?.name,
      "read_hspp_post_positive_lifecycle_fair_work_items_v2",
    );


    assert.deepEqual(
      harness.calls[0]
        ?.args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_limit:
          2,
      },
    );


    assert.deepEqual(
      result.workItems.map(
        (workItem) =>
          workItem.workState,
      ),
      [
        "REEVALUATION_REQUIRED",
        "CESSATION_REQUIRED",
      ],
    );


    assert.deepEqual(
      result.cursorAdvance,
      {
        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_C,
      },
    );


    assert.equal(
      result.cursorAdvance
        ?.proposedCursor
        .positiveAssessedAt,
      "2026-08-24T09:02:00.345678+00:00",
    );
  },
);


test(
  "cessation-only page advances the shared all-state cursor",
  async () => {
    const row =
      makeRow({
        cursor:
          CURSOR_C,

        expectedCursor:
          CURSOR_A,

        workState:
          "CESSATION_REQUIRED",
      });


    const harness =
      createSupabase([
        row,
      ]);


    const result =
      await readHsppPostPositiveLifecycleFairWorkItemsV2({
        supabase:
          harness.supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          1,
      });


    assert.equal(
      result.workItems[0]
        ?.workState,
      "CESSATION_REQUIRED",
    );


    assert.deepEqual(
      result.cursorAdvance,
      {
        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_C,
      },
    );
  },
);


test(
  "first non-empty all-state page may advance from a null durable cursor",
  async () => {
    const row =
      makeRow({
        cursor:
          CURSOR_C,

        expectedCursor:
          null,

        workState:
          "CESSATION_REQUIRED",
      });


    const harness =
      createSupabase([
        row,
      ]);


    const result =
      await readHsppPostPositiveLifecycleFairWorkItemsV2({
        supabase:
          harness.supabase,

        organizationId:
          ORGANIZATION_ID,
      });


    assert.equal(
      result.cursorAdvance
        ?.expectedCursor,
      null,
    );


    assert.deepEqual(
      result.cursorAdvance
        ?.proposedCursor,
      CURSOR_C,
    );
  },
);


test(
  "empty V2 discovery has no cursor advancement",
  async () => {
    const harness =
      createSupabase(
        [],
      );


    const result =
      await readHsppPostPositiveLifecycleFairWorkItemsV2({
        supabase:
          harness.supabase,

        organizationId:
          ORGANIZATION_ID,
      });


    assert.deepEqual(
      result.workItems,
      [],
    );


    assert.equal(
      result.cursorAdvance,
      null,
    );
  },
);


test(
  "non-empty all-state page without proposed cursor fails closed",
  async () => {
    const row =
      makeRow({
        cursor:
          CURSOR_C,

        expectedCursor:
          null,

        workState:
          "CESSATION_REQUIRED",
      });


    row.cursor_proposed_positive_assessed_at =
      null;

    row.cursor_proposed_positive_checkpoint_id =
      null;


    const harness =
      createSupabase([
        row,
      ]);


    await assert.rejects(
      () =>
        readHsppPostPositiveLifecycleFairWorkItemsV2({
          supabase:
            harness.supabase,

          organizationId:
            ORGANIZATION_ID,
        }),

      /non-empty fair lifecycle work requires a cursor-advance proposal/i,
    );
  },
);


test(
  "partial expected cursor fails closed",
  async () => {
    const row =
      makeRow({
        cursor:
          CURSOR_C,

        expectedCursor:
          CURSOR_A,

        workState:
          "REEVALUATION_REQUIRED",
      });


    row.cursor_expected_positive_checkpoint_id =
      null;


    const harness =
      createSupabase([
        row,
      ]);


    await assert.rejects(
      () =>
        readHsppPostPositiveLifecycleFairWorkItemsV2({
          supabase:
            harness.supabase,

          organizationId:
            ORGANIZATION_ID,
        }),

      /expected cursor returned a partial pair/i,
    );
  },
);


test(
  "rows with inconsistent all-state cursor snapshots fail closed",
  async () => {
    const first =
      makeRow({
        cursor:
          CURSOR_B,

        expectedCursor:
          CURSOR_A,

        workState:
          "CESSATION_REQUIRED",
      });


    const second =
      makeRow({
        cursor:
          CURSOR_C,

        expectedCursor:
          CURSOR_A,

        workState:
          "REEVALUATION_REQUIRED",
      });


    first.cursor_proposed_positive_assessed_at =
      CURSOR_B.positiveAssessedAt;

    first.cursor_proposed_positive_checkpoint_id =
      CURSOR_B.positiveCheckpointId;


    const harness =
      createSupabase([
        first,
        second,
      ]);


    await assert.rejects(
      () =>
        readHsppPostPositiveLifecycleFairWorkItemsV2({
          supabase:
            harness.supabase,

          organizationId:
            ORGANIZATION_ID,
        }),

      /inconsistent cursor metadata/i,
    );
  },
);


test(
  "proposed cursor must identify the final selected item regardless of work state",
  async () => {
    const first =
      makeRow({
        cursor:
          CURSOR_B,

        expectedCursor:
          CURSOR_A,

        workState:
          "CESSATION_REQUIRED",
      });


    const second =
      makeRow({
        cursor:
          CURSOR_C,

        expectedCursor:
          CURSOR_A,

        workState:
          "REEVALUATION_REQUIRED",
      });


    first.cursor_proposed_positive_assessed_at =
      CURSOR_B.positiveAssessedAt;

    first.cursor_proposed_positive_checkpoint_id =
      CURSOR_B.positiveCheckpointId;

    second.cursor_proposed_positive_assessed_at =
      CURSOR_B.positiveAssessedAt;

    second.cursor_proposed_positive_checkpoint_id =
      CURSOR_B.positiveCheckpointId;


    const harness =
      createSupabase([
        first,
        second,
      ]);


    await assert.rejects(
      () =>
        readHsppPostPositiveLifecycleFairWorkItemsV2({
          supabase:
            harness.supabase,

          organizationId:
            ORGANIZATION_ID,
        }),

      /does not identify the final selected work item/i,
    );
  },
);
