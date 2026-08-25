import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_POST_POSITIVE_LIFECYCLE_FAIR_WORK_READER_VERSION,
  HSPP_POST_POSITIVE_LIFECYCLE_FAIR_WORK_RPC,
  readHsppPostPositiveLifecycleFairWorkItems,
} from "../lib/hspp/readHsppPostPositiveLifecycleFairWorkItems";


const ORGANIZATION_ID =
  "organization-1";

const FINGERPRINT =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";


const CURSOR_A = {
  positiveAssessedAt:
    "2026-08-24T10:00:00.000000+00:00",

  positiveCheckpointId:
    "positive-a",
};


const CURSOR_B = {
  positiveAssessedAt:
    "2026-08-24T11:00:00.000000+00:00",

  positiveCheckpointId:
    "positive-b",
};


const CURSOR_C = {
  positiveAssessedAt:
    "2026-08-24T12:00:00.000000+00:00",

  positiveCheckpointId:
    "positive-c",
};


type Cursor = {
  positiveAssessedAt: string;

  positiveCheckpointId: string;
};


function makeRow({
  positiveCheckpointId,

  positiveAssessedAt,

  workState,

  expectedCursor,

  proposedCursor,
}: {
  positiveCheckpointId: string;

  positiveAssessedAt: string;

  workState:
    | "REEVALUATION_REQUIRED"
    | "CESSATION_REQUIRED";

  expectedCursor:
    | Cursor
    | null;

  proposedCursor:
    | Cursor
    | null;
}) {
  const cessation =
    workState ===
      "CESSATION_REQUIRED";

  return {
    positive_checkpoint_id:
      positiveCheckpointId,

    organization_id:
      ORGANIZATION_ID,

    assembly_id:
      "assembly-" +
      positiveCheckpointId,

    membership_id:
      "membership-" +
      positiveCheckpointId,

    evidence_id:
      "evidence-" +
      positiveCheckpointId,

    integrity_fingerprint:
      FINGERPRINT,

    positive_assessed_at:
      positiveAssessedAt,

    unsuitability_checkpoint_id:
      cessation
        ? "unsuitability-" +
          positiveCheckpointId
        : null,

    unsuitability_observed_at:
      cessation
        ? "2026-08-24T13:00:00.000Z"
        : null,

    unsuitability_decided_at:
      cessation
        ? "2026-08-24T13:00:01.000Z"
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
      proposedCursor
        ?.positiveAssessedAt ??
      null,

    cursor_proposed_positive_checkpoint_id:
      proposedCursor
        ?.positiveCheckpointId ??
      null,
  };
}


function createSupabase(
  rows: unknown[],
) {
  const calls:
    Array<{
      name: string;

      args: Record<string, unknown>;
    }> =
      [];

  const supabase = {
    async rpc(
      name: string,
      args: Record<string, unknown>,
    ) {
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
  "fair reader exposes a distinct version and RPC",
  () => {
    assert.equal(
      HSPP_POST_POSITIVE_LIFECYCLE_FAIR_WORK_READER_VERSION,
      "hspp-post-positive-lifecycle-fair-work-reader-v1",
    );

    assert.equal(
      HSPP_POST_POSITIVE_LIFECYCLE_FAIR_WORK_RPC,
      "read_hspp_post_positive_lifecycle_fair_work_items",
    );
  },
);


test(
  "fair reader preserves cessation-first mixed page and one cursor proposal",
  async () => {
    const rows =
      [
        makeRow({
          positiveCheckpointId:
            "positive-cessation",

          positiveAssessedAt:
            "2026-08-24T09:00:00.000000+00:00",

          workState:
            "CESSATION_REQUIRED",

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_C,
        }),

        makeRow({
          positiveCheckpointId:
            CURSOR_B.positiveCheckpointId,

          positiveAssessedAt:
            CURSOR_B.positiveAssessedAt,

          workState:
            "REEVALUATION_REQUIRED",

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_C,
        }),

        makeRow({
          positiveCheckpointId:
            CURSOR_C.positiveCheckpointId,

          positiveAssessedAt:
            CURSOR_C.positiveAssessedAt,

          workState:
            "REEVALUATION_REQUIRED",

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_C,
        }),
      ];

    const fixture =
      createSupabase(
        rows,
      );

    const result =
      await readHsppPostPositiveLifecycleFairWorkItems({
        supabase:
          fixture.supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          3,
      });

    assert.equal(
      fixture.calls.length,
      1,
    );

    assert.deepEqual(
      fixture.calls[0],
      {
        name:
          HSPP_POST_POSITIVE_LIFECYCLE_FAIR_WORK_RPC,

        args: {
          p_organization_id:
            ORGANIZATION_ID,

          p_limit:
            3,
        },
      },
    );

    assert.deepEqual(
      result.workItems.map(
        (workItem) =>
          workItem.workState,
      ),
      [
        "CESSATION_REQUIRED",
        "REEVALUATION_REQUIRED",
        "REEVALUATION_REQUIRED",
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
  },
);


test(
  "first reevaluation page may advance from a null durable cursor",
  async () => {
    const fixture =
      createSupabase([
        makeRow({
          positiveCheckpointId:
            CURSOR_B.positiveCheckpointId,

          positiveAssessedAt:
            CURSOR_B.positiveAssessedAt,

          workState:
            "REEVALUATION_REQUIRED",

          expectedCursor:
            null,

          proposedCursor:
            CURSOR_B,
        }),
      ]);

    const result =
      await readHsppPostPositiveLifecycleFairWorkItems({
        supabase:
          fixture.supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          1,
      });

    assert.deepEqual(
      result.cursorAdvance,
      {
        expectedCursor:
          null,

        proposedCursor:
          CURSOR_B,
      },
    );
  },
);


test(
  "cessation-only page does not expose reevaluation cursor advancement",
  async () => {
    const fixture =
      createSupabase([
        makeRow({
          positiveCheckpointId:
            "positive-cessation",

          positiveAssessedAt:
            "2026-08-24T09:00:00.000000+00:00",

          workState:
            "CESSATION_REQUIRED",

          expectedCursor:
            null,

          proposedCursor:
            null,
        }),
      ]);

    const result =
      await readHsppPostPositiveLifecycleFairWorkItems({
        supabase:
          fixture.supabase,

        organizationId:
          ORGANIZATION_ID,

        limit:
          1,
      });

    assert.equal(
      result.cursorAdvance,
      null,
    );
  },
);


test(
  "empty fair discovery has no cursor advancement",
  async () => {
    const fixture =
      createSupabase(
        [],
      );

    const result =
      await readHsppPostPositiveLifecycleFairWorkItems({
        supabase:
          fixture.supabase,

        organizationId:
          ORGANIZATION_ID,
      });

    assert.equal(
      result.workItems.length,
      0,
    );

    assert.equal(
      result.cursorAdvance,
      null,
    );
  },
);


test(
  "partial expected cursor fails closed",
  async () => {
    const row =
      makeRow({
        positiveCheckpointId:
          CURSOR_B.positiveCheckpointId,

        positiveAssessedAt:
          CURSOR_B.positiveAssessedAt,

        workState:
          "REEVALUATION_REQUIRED",

        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_B,
      });

    row.cursor_expected_positive_checkpoint_id =
      null;

    const fixture =
      createSupabase([
        row,
      ]);

    await assert.rejects(
      () =>
        readHsppPostPositiveLifecycleFairWorkItems({
          supabase:
            fixture.supabase,

          organizationId:
            ORGANIZATION_ID,
        }),

      /expected cursor returned a partial pair/,
    );
  },
);


test(
  "rows with inconsistent cursor snapshots fail closed",
  async () => {
    const fixture =
      createSupabase([
        makeRow({
          positiveCheckpointId:
            CURSOR_B.positiveCheckpointId,

          positiveAssessedAt:
            CURSOR_B.positiveAssessedAt,

          workState:
            "REEVALUATION_REQUIRED",

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_C,
        }),

        makeRow({
          positiveCheckpointId:
            CURSOR_C.positiveCheckpointId,

          positiveAssessedAt:
            CURSOR_C.positiveAssessedAt,

          workState:
            "REEVALUATION_REQUIRED",

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_B,
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppPostPositiveLifecycleFairWorkItems({
          supabase:
            fixture.supabase,

          organizationId:
            ORGANIZATION_ID,
        }),

      /inconsistent cursor metadata/,
    );
  },
);


test(
  "reevaluation work without cursor proposal fails closed",
  async () => {
    const fixture =
      createSupabase([
        makeRow({
          positiveCheckpointId:
            CURSOR_B.positiveCheckpointId,

          positiveAssessedAt:
            CURSOR_B.positiveAssessedAt,

          workState:
            "REEVALUATION_REQUIRED",

          expectedCursor:
            null,

          proposedCursor:
            null,
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppPostPositiveLifecycleFairWorkItems({
          supabase:
            fixture.supabase,

          organizationId:
            ORGANIZATION_ID,
        }),

      /reevaluation work requires a cursor-advance proposal/,
    );
  },
);


test(
  "proposed cursor must identify the last selected reevaluation item",
  async () => {
    const fixture =
      createSupabase([
        makeRow({
          positiveCheckpointId:
            CURSOR_B.positiveCheckpointId,

          positiveAssessedAt:
            CURSOR_B.positiveAssessedAt,

          workState:
            "REEVALUATION_REQUIRED",

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_C,
        }),
      ]);

    await assert.rejects(
      () =>
        readHsppPostPositiveLifecycleFairWorkItems({
          supabase:
            fixture.supabase,

          organizationId:
            ORGANIZATION_ID,
        }),

      /does not identify the last selected reevaluation work item/,
    );
  },
);
