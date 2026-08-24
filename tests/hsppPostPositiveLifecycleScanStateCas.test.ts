import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_RPC,
  HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_VERSION,
  HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_VERSION,
  compareAndSwapHsppPostPositiveLifecycleScanState,
} from "../lib/hspp/compareAndSwapHsppPostPositiveLifecycleScanState";


const ORGANIZATION_ID =
  "organization-1";

const CURSOR_A = {
  positiveAssessedAt:
    "2026-08-23T10:00:00.000Z",

  positiveCheckpointId:
    "checkpoint-a",
};

const CURSOR_B = {
  positiveAssessedAt:
    "2026-08-23T11:00:00.000Z",

  positiveCheckpointId:
    "checkpoint-b",
};

const CURSOR_C = {
  positiveAssessedAt:
    "2026-08-23T12:00:00.000Z",

  positiveCheckpointId:
    "checkpoint-c",
};


type RpcCall = {
  name: string;

  args: Record<string, unknown>;
};


type MockResult = {
  data?: unknown;

  error?: Error | null;
};


function makeRow({
  state = "ADVANCED",

  current = CURSOR_B,

  previous = CURSOR_A,

  organizationId = ORGANIZATION_ID,

  stateVersion =
    HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_VERSION,

  createdAt =
    "2026-08-24T17:00:00.000Z",

  updatedAt =
    "2026-08-24T17:01:00.000Z",
}: {
  state?: string;

  current?:
    | typeof CURSOR_A
    | typeof CURSOR_B
    | typeof CURSOR_C
    | null;

  previous?:
    | typeof CURSOR_A
    | typeof CURSOR_B
    | typeof CURSOR_C
    | null;

  organizationId?: string;

  stateVersion?: string;

  createdAt?: string | null;

  updatedAt?: string | null;
} = {}) {
  return {
    cas_state:
      state,

    state_version:
      stateVersion,

    organization_id:
      organizationId,

    cursor_positive_assessed_at:
      current?.positiveAssessedAt ??
      null,

    cursor_positive_checkpoint_id:
      current?.positiveCheckpointId ??
      null,

    previous_cursor_positive_assessed_at:
      previous?.positiveAssessedAt ??
      null,

    previous_cursor_positive_checkpoint_id:
      previous?.positiveCheckpointId ??
      null,

    created_at:
      createdAt,

    updated_at:
      updatedAt,
  };
}


function createSupabase(
  result: MockResult = {
    data: [
      makeRow(),
    ],

    error: null,
  },
): {
  supabase: SupabaseClient;

  calls: RpcCall[];
} {
  const calls: RpcCall[] =
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
          result.data ??
          null,

        error:
          result.error ??
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
  "scan-state CAS exposes explicit versions and RPC identity",
  () => {
    assert.equal(
      HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_VERSION,
      "hspp-post-positive-lifecycle-scan-state-v1",
    );

    assert.equal(
      HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_VERSION,
      "hspp-post-positive-lifecycle-scan-state-cas-v1",
    );

    assert.equal(
      HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_RPC,
      "compare_and_swap_hspp_post_positive_lifecycle_scan_state",
    );
  },
);


test(
  "initial advancement passes null expected cursor and exact proposed cursor",
  async () => {
    const mock =
      createSupabase({
        data: [
          makeRow({
            state:
              "ADVANCED",

            current:
              CURSOR_B,

            previous:
              null,
          }),
        ],

        error:
          null,
      });

    const result =
      await compareAndSwapHsppPostPositiveLifecycleScanState({
        supabase:
          mock.supabase,

        organizationId:
          ORGANIZATION_ID,

        expectedCursor:
          null,

        proposedCursor:
          CURSOR_B,
      });

    assert.deepEqual(
      mock.calls,
      [
        {
          name:
            HSPP_POST_POSITIVE_LIFECYCLE_SCAN_STATE_CAS_RPC,

          args: {
            p_organization_id:
              ORGANIZATION_ID,

            p_expected_cursor_positive_assessed_at:
              null,

            p_expected_cursor_positive_checkpoint_id:
              null,

            p_proposed_cursor_positive_assessed_at:
              CURSOR_B.positiveAssessedAt,

            p_proposed_cursor_positive_checkpoint_id:
              CURSOR_B.positiveCheckpointId,
          },
        },
      ],
    );

    assert.equal(
      result.state,
      "ADVANCED",
    );

    assert.deepEqual(
      result.currentCursor,
      CURSOR_B,
    );

    assert.equal(
      result.previousCursor,
      null,
    );
  },
);


test(
  "existing cursor advancement preserves expected and proposed identities",
  async () => {
    const mock =
      createSupabase();

    const result =
      await compareAndSwapHsppPostPositiveLifecycleScanState({
        supabase:
          mock.supabase,

        organizationId:
          ORGANIZATION_ID,

        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_B,
      });

    assert.equal(
      mock.calls.length,
      1,
    );

    assert.deepEqual(
      mock.calls[0].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_expected_cursor_positive_assessed_at:
          CURSOR_A.positiveAssessedAt,

        p_expected_cursor_positive_checkpoint_id:
          CURSOR_A.positiveCheckpointId,

        p_proposed_cursor_positive_assessed_at:
          CURSOR_B.positiveAssessedAt,

        p_proposed_cursor_positive_checkpoint_id:
          CURSOR_B.positiveCheckpointId,
      },
    );

    assert.equal(
      result.state,
      "ADVANCED",
    );

    assert.deepEqual(
      result.previousCursor,
      CURSOR_A,
    );

    assert.deepEqual(
      result.currentCursor,
      CURSOR_B,
    );
  },
);


test(
  "exact retry is accepted without inventing a new cursor",
  async () => {
    const mock =
      createSupabase({
        data: [
          makeRow({
            state:
              "EXACT_RETRY",

            current:
              CURSOR_B,

            previous:
              CURSOR_A,
          }),
        ],

        error:
          null,
      });

    const result =
      await compareAndSwapHsppPostPositiveLifecycleScanState({
        supabase:
          mock.supabase,

        organizationId:
          ORGANIZATION_ID,

        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_B,
      });

    assert.equal(
      result.state,
      "EXACT_RETRY",
    );

    assert.deepEqual(
      result.currentCursor,
      CURSOR_B,
    );

    assert.deepEqual(
      result.previousCursor,
      CURSOR_A,
    );
  },
);


test(
  "NO_CHANGE requires expected proposed and persisted cursor to agree",
  async () => {
    const mock =
      createSupabase({
        data: [
          makeRow({
            state:
              "NO_CHANGE",

            current:
              CURSOR_B,

            previous:
              CURSOR_A,
          }),
        ],

        error:
          null,
      });

    const result =
      await compareAndSwapHsppPostPositiveLifecycleScanState({
        supabase:
          mock.supabase,

        organizationId:
          ORGANIZATION_ID,

        expectedCursor:
          CURSOR_B,

        proposedCursor:
          CURSOR_B,
      });

    assert.equal(
      result.state,
      "NO_CHANGE",
    );

    assert.deepEqual(
      result.currentCursor,
      CURSOR_B,
    );
  },
);


test(
  "stale writer receives persisted cursor without local reinterpretation",
  async () => {
    const mock =
      createSupabase({
        data: [
          makeRow({
            state:
              "STALE",

            current:
              CURSOR_C,

            previous:
              CURSOR_B,
          }),
        ],

        error:
          null,
      });

    const result =
      await compareAndSwapHsppPostPositiveLifecycleScanState({
        supabase:
          mock.supabase,

        organizationId:
          ORGANIZATION_ID,

        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_B,
      });

    assert.equal(
      result.state,
      "STALE",
    );

    assert.deepEqual(
      result.currentCursor,
      CURSOR_C,
    );

    assert.deepEqual(
      result.previousCursor,
      CURSOR_B,
    );
  },
);


test(
  "stale writer is valid when no state row exists",
  async () => {
    const mock =
      createSupabase({
        data: [
          makeRow({
            state:
              "STALE",

            current:
              null,

            previous:
              null,

            createdAt:
              null,

            updatedAt:
              null,
          }),
        ],

        error:
          null,
      });

    const result =
      await compareAndSwapHsppPostPositiveLifecycleScanState({
        supabase:
          mock.supabase,

        organizationId:
          ORGANIZATION_ID,

        expectedCursor:
          CURSOR_A,

        proposedCursor:
          CURSOR_B,
      });

    assert.equal(
      result.state,
      "STALE",
    );

    assert.equal(
      result.currentCursor,
      null,
    );

    assert.equal(
      result.createdAt,
      null,
    );
  },
);


test(
  "blank organization is rejected before RPC",
  async () => {
    const mock =
      createSupabase();

    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveLifecycleScanState({
          supabase:
            mock.supabase,

          organizationId:
            "   ",

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_B,
        }),

      /organizationId is required/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "invalid proposed timestamp is rejected before RPC",
  async () => {
    const mock =
      createSupabase();

    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveLifecycleScanState({
          supabase:
            mock.supabase,

          organizationId:
            ORGANIZATION_ID,

          expectedCursor:
            CURSOR_A,

          proposedCursor: {
            positiveAssessedAt:
              "not-a-timestamp",

            positiveCheckpointId:
              CURSOR_B.positiveCheckpointId,
          },
        }),

      /proposedCursor\.positiveAssessedAt must be a valid timestamp/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "partial persisted cursor pair fails closed",
  async () => {
    const mock =
      createSupabase({
        data: [
          {
            ...makeRow(),

            cursor_positive_checkpoint_id:
              null,
          },
        ],

        error:
          null,
      });

    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveLifecycleScanState({
          supabase:
            mock.supabase,

          organizationId:
            ORGANIZATION_ID,

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_B,
        }),

      /partial cursor pair/,
    );
  },
);


test(
  "wrong organization and unsupported state version fail closed",
  async () => {
    const wrongOrganization =
      createSupabase({
        data: [
          makeRow({
            organizationId:
              "organization-2",
          }),
        ],

        error:
          null,
      });

    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveLifecycleScanState({
          supabase:
            wrongOrganization.supabase,

          organizationId:
            ORGANIZATION_ID,

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_B,
        }),

      /wrong organization/,
    );


    const wrongVersion =
      createSupabase({
        data: [
          makeRow({
            stateVersion:
              "unsupported-version",
          }),
        ],

        error:
          null,
      });

    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveLifecycleScanState({
          supabase:
            wrongVersion.supabase,

          organizationId:
            ORGANIZATION_ID,

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_B,
        }),

      /unsupported state version/,
    );
  },
);


test(
  "RPC error propagates exactly",
  async () => {
    const expectedError =
      new Error(
        "scan-state CAS failed",
      );

    const mock =
      createSupabase({
        data:
          null,

        error:
          expectedError,
      });

    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveLifecycleScanState({
          supabase:
            mock.supabase,

          organizationId:
            ORGANIZATION_ID,

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_B,
        }),

      (error) =>
        error === expectedError,
    );

    assert.equal(
      mock.calls.length,
      1,
    );
  },
);


test(
  "CAS requires exactly one result row",
  async () => {
    const mock =
      createSupabase({
        data: [],

        error:
          null,
      });

    await assert.rejects(
      () =>
        compareAndSwapHsppPostPositiveLifecycleScanState({
          supabase:
            mock.supabase,

          organizationId:
            ORGANIZATION_ID,

          expectedCursor:
            CURSOR_A,

          proposedCursor:
            CURSOR_B,
        }),

      /returned an invalid result/,
    );
  },
);
