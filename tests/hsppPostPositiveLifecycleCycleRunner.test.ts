import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_POST_POSITIVE_LIFECYCLE_CYCLE_RUNNER_VERSION,
  runHsppPostPositiveLifecycleCycle,
} from "../lib/hspp/runHsppPostPositiveLifecycleCycle";

const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const ASSEMBLY_ID_1 =
  "22222222-2222-4222-8222-222222222221";

const ASSEMBLY_ID_2 =
  "22222222-2222-4222-8222-222222222222";

const MEMBERSHIP_ID_1 =
  "33333333-3333-4333-8333-333333333331";

const MEMBERSHIP_ID_2 =
  "33333333-3333-4333-8333-333333333332";

const EVIDENCE_ID_1 =
  "44444444-4444-4444-8444-444444444441";

const EVIDENCE_ID_2 =
  "44444444-4444-4444-8444-444444444442";

const POSITIVE_ID_1 =
  "55555555-5555-4555-8555-555555555551";

const POSITIVE_ID_2 =
  "55555555-5555-4555-8555-555555555552";

const UNSUITABILITY_ID =
  "66666666-6666-4666-8666-666666666666";

const FINGERPRINT_1 =
  "a".repeat(64);

const FINGERPRINT_2 =
  "b".repeat(64);

const OBSERVED_AT =
  "2026-08-24T16:00:00.000Z";

const DECIDED_AT =
  "2026-08-24T16:00:01.000Z";

const SUPABASE =
  {} as SupabaseClient;

type WorkState =
  | "REEVALUATION_REQUIRED"
  | "CESSATION_REQUIRED";

function createWorkItem(
  state: WorkState,
  index: 1 | 2,
) {
  const first =
    index === 1;

  return {
    positiveCheckpointId:
      first
        ? POSITIVE_ID_1
        : POSITIVE_ID_2,

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      first
        ? ASSEMBLY_ID_1
        : ASSEMBLY_ID_2,

    membershipId:
      first
        ? MEMBERSHIP_ID_1
        : MEMBERSHIP_ID_2,

    evidenceId:
      first
        ? EVIDENCE_ID_1
        : EVIDENCE_ID_2,

    integrityFingerprint:
      first
        ? FINGERPRINT_1
        : FINGERPRINT_2,

    positiveAssessedAt:
      "2026-08-24T15:00:00.000Z",

    unsuitabilityCheckpointId:
      state ===
      "CESSATION_REQUIRED"
        ? UNSUITABILITY_ID
        : null,

    unsuitabilityObservedAt:
      state ===
      "CESSATION_REQUIRED"
        ? OBSERVED_AT
        : null,

    unsuitabilityDecidedAt:
      state ===
      "CESSATION_REQUIRED"
        ? DECIDED_AT
        : null,

    workState:
      state,
  } as any;
}

type HarnessOptions = {
  workItems?:
    any[];

  discoveryError?:
    Error | null;

  reevaluationErrorCheckpointId?:
    string | null;

  cessationErrorCheckpointId?:
    string | null;

  reevaluationBranch?:
    string;

  cessationBranch?:
    string;
};

function createHarness(
  {
    workItems =
      [],

    discoveryError =
      null,

    reevaluationErrorCheckpointId =
      null,

    cessationErrorCheckpointId =
      null,

    reevaluationBranch =
      "SUITABLE",

    cessationBranch =
      "CESSATION_PERSISTED",
  }: HarnessOptions = {},
) {
  const events:
    string[] =
      [];

  const calls = {
    discovery:
      [] as any[],

    reevaluation:
      [] as any[],

    cessation:
      [] as any[],

    observed:
      [] as any[],

    decided:
      [] as any[],

    lease:
      [] as any[],
  };

  const dependencies = {
    async readWorkItems(
      input: any,
    ) {
      events.push(
        "discovery",
      );

      calls.discovery.push(
        input,
      );

      if (discoveryError) {
        throw discoveryError;
      }

      return {
        readerVersion:
          "test-reader-v1",

        organizationId:
          ORGANIZATION_ID,

        requestedLimit:
          input.limit ?? 100,

        workItems,
      };
    },

    async runReevaluation(
      input: any,
    ) {
      events.push(
        `reevaluation:${input.workItem.positiveCheckpointId}`,
      );

      calls.reevaluation.push(
        input,
      );

      if (
        input.workItem.positiveCheckpointId ===
        reevaluationErrorCheckpointId
      ) {
        throw new Error(
          "synthetic reevaluation failure",
        );
      }

      return {
        runnerVersion:
          "test-reevaluation-runner-v1",

        branch:
          reevaluationBranch,

        organizationId:
          input.workItem.organizationId,

        assemblyId:
          input.workItem.assemblyId,

        membershipId:
          input.workItem.membershipId,

        evidenceId:
          input.workItem.evidenceId,

        decision:
          null,

        checkpoint:
          null,

        busyUntil:
          reevaluationBranch ===
          "LEASE_BUSY"
            ? "2026-08-24T16:05:00.000Z"
            : null,

        leaseRelease:
          null,
      };
    },

    async runCessation(
      input: any,
    ) {
      events.push(
        `cessation:${input.workItem.positiveCheckpointId}`,
      );

      calls.cessation.push(
        input,
      );

      if (
        input.workItem.positiveCheckpointId ===
        cessationErrorCheckpointId
      ) {
        throw new Error(
          "synthetic cessation failure",
        );
      }

      return {
        runnerVersion:
          "test-cessation-runner-v1",

        branch:
          cessationBranch,

        organizationId:
          input.workItem.organizationId,

        assemblyId:
          input.workItem.assemblyId,

        membershipId:
          input.workItem.membershipId,

        evidenceId:
          input.workItem.evidenceId,

        cessation:
          null,

        busyUntil:
          cessationBranch ===
          "LEASE_BUSY"
            ? "2026-08-24T16:05:00.000Z"
            : null,

        leaseRelease:
          null,
      };
    },
  } as any;

  function createObservedAt(
    workItem: any,
  ) {
    events.push(
      `observed:${workItem.positiveCheckpointId}`,
    );

    calls.observed.push(
      workItem,
    );

    return OBSERVED_AT;
  }

  function createDecidedAt(
    workItem: any,
  ) {
    events.push(
      `decided:${workItem.positiveCheckpointId}`,
    );

    calls.decided.push(
      workItem,
    );

    return DECIDED_AT;
  }

  function createLeaseToken(
    workItem: any,
  ) {
    events.push(
      `lease:${workItem.positiveCheckpointId}`,
    );

    calls.lease.push(
      workItem,
    );

    return `lease-${workItem.positiveCheckpointId}`;
  }

  return {
    events,
    calls,
    dependencies,
    createObservedAt,
    createDecidedAt,
    createLeaseToken,
  };
}

function runWithHarness(
  harness: ReturnType<typeof createHarness>,
  overrides: Record<string, unknown> = {},
) {
  return runHsppPostPositiveLifecycleCycle(
    {
      supabase:
        SUPABASE,

      organizationId:
        ORGANIZATION_ID,

      limit:
        10,

      leaseSeconds:
        60,

      createObservedAt:
        harness.createObservedAt,

      createDecidedAt:
        harness.createDecidedAt,

      createLeaseToken:
        harness.createLeaseToken,

      ...overrides,
    } as any,

    harness.dependencies,
  );
}

test(
  "cycle captures one bounded snapshot and processes mixed work sequentially",
  async () => {
    const reevaluation =
      createWorkItem(
        "REEVALUATION_REQUIRED",
        1,
      );

    const cessation =
      createWorkItem(
        "CESSATION_REQUIRED",
        2,
      );

    const harness =
      createHarness({
        workItems: [
          reevaluation,
          cessation,
        ],
      });

    const result =
      await runWithHarness(
        harness,
      );

    assert.equal(
      result.runnerVersion,
      HSPP_POST_POSITIVE_LIFECYCLE_CYCLE_RUNNER_VERSION,
    );

    assert.equal(
      harness.calls.discovery.length,
      1,
    );

    assert.deepEqual(
      harness.calls.discovery[0],
      {
        supabase:
          SUPABASE,

        organizationId:
          ORGANIZATION_ID,

        limit:
          10,
      },
    );

    assert.deepEqual(
      harness.events,
      [
        "discovery",
        `observed:${POSITIVE_ID_1}`,
        `decided:${POSITIVE_ID_1}`,
        `lease:${POSITIVE_ID_1}`,
        `reevaluation:${POSITIVE_ID_1}`,
        `lease:${POSITIVE_ID_2}`,
        `cessation:${POSITIVE_ID_2}`,
      ],
    );

    assert.equal(
      result.workResults.length,
      2,
    );

    assert.equal(
      result.workResults[0]?.branch,
      "REEVALUATION_RESULT",
    );

    assert.equal(
      result.workResults[1]?.branch,
      "CESSATION_RESULT",
    );

    assert.equal(
      harness.calls.observed.length,
      1,
    );

    assert.equal(
      harness.calls.decided.length,
      1,
    );

    assert.equal(
      harness.calls.lease.length,
      2,
    );

    assert.deepEqual(
      harness.calls.reevaluation[0],
      {
        supabase:
          SUPABASE,

        workItem:
          reevaluation,

        leaseToken:
          `lease-${POSITIVE_ID_1}`,

        leaseSeconds:
          60,

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      },
    );

    assert.deepEqual(
      harness.calls.cessation[0],
      {
        supabase:
          SUPABASE,

        workItem:
          cessation,

        leaseToken:
          `lease-${POSITIVE_ID_2}`,

        leaseSeconds:
          60,
      },
    );
  },
);

test(
  "discovery failure is cycle-fatal and no attempt factories or runners execute",
  async () => {
    const harness =
      createHarness({
        discoveryError:
          new Error(
            "synthetic discovery failure",
          ),
      });

    await assert.rejects(
      () =>
        runWithHarness(
          harness,
        ),
      /synthetic discovery failure/,
    );

    assert.equal(
      harness.calls.discovery.length,
      1,
    );

    assert.equal(
      harness.calls.observed.length,
      0,
    );

    assert.equal(
      harness.calls.decided.length,
      0,
    );

    assert.equal(
      harness.calls.lease.length,
      0,
    );

    assert.equal(
      harness.calls.reevaluation.length,
      0,
    );

    assert.equal(
      harness.calls.cessation.length,
      0,
    );
  },
);

test(
  "reevaluation failure is isolated and later cessation work continues without rediscovery",
  async () => {
    const harness =
      createHarness({
        workItems: [
          createWorkItem(
            "REEVALUATION_REQUIRED",
            1,
          ),

          createWorkItem(
            "CESSATION_REQUIRED",
            2,
          ),
        ],

        reevaluationErrorCheckpointId:
          POSITIVE_ID_1,
      });

    const result =
      await runWithHarness(
        harness,
      );

    assert.equal(
      harness.calls.discovery.length,
      1,
    );

    assert.equal(
      result.workResults[0]?.branch,
      "REEVALUATION_ERROR",
    );

    assert.equal(
      result.workResults[0]?.error,
      "synthetic reevaluation failure",
    );

    assert.equal(
      result.workResults[1]?.branch,
      "CESSATION_RESULT",
    );

    assert.equal(
      harness.calls.cessation.length,
      1,
    );
  },
);

test(
  "cessation failure is isolated and later reevaluation work continues",
  async () => {
    const harness =
      createHarness({
        workItems: [
          createWorkItem(
            "CESSATION_REQUIRED",
            1,
          ),

          createWorkItem(
            "REEVALUATION_REQUIRED",
            2,
          ),
        ],

        cessationErrorCheckpointId:
          POSITIVE_ID_1,
      });

    const result =
      await runWithHarness(
        harness,
      );

    assert.equal(
      result.workResults[0]?.branch,
      "CESSATION_ERROR",
    );

    assert.equal(
      result.workResults[0]?.error,
      "synthetic cessation failure",
    );

    assert.equal(
      result.workResults[1]?.branch,
      "REEVALUATION_RESULT",
    );

    assert.equal(
      harness.calls.reevaluation.length,
      1,
    );
  },
);

test(
  "blank reevaluation observation identity becomes one isolated item error",
  async () => {
    const cessation =
      createWorkItem(
        "CESSATION_REQUIRED",
        2,
      );

    const harness =
      createHarness({
        workItems: [
          createWorkItem(
            "REEVALUATION_REQUIRED",
            1,
          ),
          cessation,
        ],
      });

    const result =
      await runWithHarness(
        harness,
        {
          createObservedAt() {
            return "   ";
          },
        },
      );

    assert.equal(
      result.workResults[0]?.branch,
      "REEVALUATION_ERROR",
    );

    assert.match(
      result.workResults[0]?.error || "",
      /createObservedAt result must be a non-empty string/,
    );

    assert.equal(
      harness.calls.reevaluation.length,
      0,
    );

    assert.equal(
      harness.calls.cessation.length,
      1,
    );
  },
);

test(
  "LEASE_BUSY from reevaluation runner remains a successful cycle dispatch result",
  async () => {
    const harness =
      createHarness({
        workItems: [
          createWorkItem(
            "REEVALUATION_REQUIRED",
            1,
          ),
        ],

        reevaluationBranch:
          "LEASE_BUSY",
      });

    const result =
      await runWithHarness(
        harness,
      );

    assert.equal(
      result.workResults[0]?.branch,
      "REEVALUATION_RESULT",
    );

    assert.equal(
      result.workResults[0]?.assessment?.branch,
      "LEASE_BUSY",
    );

    assert.equal(
      result.workResults[0]?.error,
      null,
    );
  },
);

test(
  "LEASE_BUSY from cessation runner remains a successful cycle dispatch result",
  async () => {
    const harness =
      createHarness({
        workItems: [
          createWorkItem(
            "CESSATION_REQUIRED",
            1,
          ),
        ],

        cessationBranch:
          "LEASE_BUSY",
      });

    const result =
      await runWithHarness(
        harness,
      );

    assert.equal(
      result.workResults[0]?.branch,
      "CESSATION_RESULT",
    );

    assert.equal(
      result.workResults[0]?.cessation?.branch,
      "LEASE_BUSY",
    );

    assert.equal(
      result.workResults[0]?.error,
      null,
    );
  },
);

test(
  "empty discovery returns an empty result without calling attempt factories",
  async () => {
    const harness =
      createHarness({
        workItems:
          [],
      });

    const result =
      await runWithHarness(
        harness,
      );

    assert.equal(
      harness.calls.discovery.length,
      1,
    );

    assert.deepEqual(
      result.workResults,
      [],
    );

    assert.equal(
      harness.calls.observed.length,
      0,
    );

    assert.equal(
      harness.calls.decided.length,
      0,
    );

    assert.equal(
      harness.calls.lease.length,
      0,
    );
  },
);

test(
  "cycle rejects missing factories before lifecycle discovery",
  async () => {
    const harness =
      createHarness({
        workItems: [
          createWorkItem(
            "REEVALUATION_REQUIRED",
            1,
          ),
        ],
      });

    await assert.rejects(
      () =>
        runWithHarness(
          harness,
          {
            createDecidedAt:
              null,
          },
        ),
      /createDecidedAt must be a function/,
    );

    assert.equal(
      harness.calls.discovery.length,
      0,
    );
  },
);



/* ============================================================
 * FAIR CURSOR ADVANCEMENT TEST HARNESS
 * ============================================================ */

const TEST_CURSOR_ADVANCE = {
  expectedCursor:
    null,

  proposedCursor: {
    positiveAssessedAt:
      "2026-08-24T15:00:00.123456+00:00",

    positiveCheckpointId:
      POSITIVE_ID_1,
  },
};


type CursorHarnessOptions = {
  cursorAdvance?:
    any | null;

  cursorState?:
    string;

  cursorError?:
    Error | null;
};


function attachCursorHarness(
  harness:
    ReturnType<typeof createHarness>,

  {
    cursorAdvance =
      TEST_CURSOR_ADVANCE,

    cursorState =
      "ADVANCED",

    cursorError =
      null,
  }: CursorHarnessOptions = {},
) {
  const originalReadWorkItems =
    harness.dependencies.readWorkItems;


  const cursorCalls:
    any[] =
      [];


  harness.dependencies.readWorkItems =
    async (
      input: any,
    ) => {
      const discovery =
        await originalReadWorkItems(
          input,
        );


      return {
        ...discovery,

        readerVersion:
          "hspp-post-positive-lifecycle-fair-work-reader-v2",

        cursorAdvance,
      };
    };


  harness.dependencies.advanceCursor =
    async (
      input: any,
    ) => {
      harness.events.push(
        "cursor",
      );


      cursorCalls.push(
        input,
      );


      if (cursorError) {
        throw cursorError;
      }


      return {
        operationVersion:
          "hspp-post-positive-lifecycle-scan-state-cas-v1",

        stateVersion:
          "hspp-post-positive-lifecycle-scan-state-v1",

        state:
          cursorState,

        organizationId:
          input.organizationId,

        currentCursor:
          cursorState ===
          "STALE"
            ? (
                cursorAdvance
                  ?.expectedCursor ??
                null
              )
            : input.proposedCursor,

        previousCursor:
          input.expectedCursor,

        createdAt:
          "2026-08-24T16:00:00.000Z",

        updatedAt:
          "2026-08-24T16:00:01.000Z",
      };
    };


  return {
    harness,
    cursorCalls,
    cursorAdvance,
  };
}


test(
  "fair page advances its captured cursor exactly once after all work attempts",
  async () => {
    const reevaluation =
      createWorkItem(
        "REEVALUATION_REQUIRED",
        1,
      );


    const cessation =
      createWorkItem(
        "CESSATION_REQUIRED",
        2,
      );


    const cursorHarness =
      attachCursorHarness(
        createHarness({
          workItems: [
            reevaluation,
            cessation,
          ],
        }),
      );


    const result =
      await runWithHarness(
        cursorHarness.harness,
      );


    assert.equal(
      cursorHarness.cursorCalls.length,
      1,
    );


    assert.deepEqual(
      cursorHarness.cursorCalls[0],
      {
        supabase:
          SUPABASE,

        organizationId:
          ORGANIZATION_ID,

        expectedCursor:
          TEST_CURSOR_ADVANCE.expectedCursor,

        proposedCursor:
          TEST_CURSOR_ADVANCE.proposedCursor,
      },
    );


    assert.equal(
      cursorHarness.harness.events[
        cursorHarness.harness.events.length - 1
      ],
      "cursor",
    );


    assert.equal(
      result.cursorAdvanceResult.branch,
      "CURSOR_ADVANCE_RESULT",
    );


    assert.deepEqual(
      result.cursorAdvanceResult.request,
      TEST_CURSOR_ADVANCE,
    );


    assert.equal(
      result.cursorAdvanceResult.result
        ?.state,
      "ADVANCED",
    );


    assert.equal(
      result.workResults.length,
      2,
    );
  },
);


test(
  "isolated reevaluation error does not pin the captured fair cursor",
  async () => {
    const cursorHarness =
      attachCursorHarness(
        createHarness({
          workItems: [
            createWorkItem(
              "REEVALUATION_REQUIRED",
              1,
            ),
          ],

          reevaluationErrorCheckpointId:
            POSITIVE_ID_1,
        }),
      );


    const result =
      await runWithHarness(
        cursorHarness.harness,
      );


    assert.equal(
      result.workResults[0]
        ?.branch,
      "REEVALUATION_ERROR",
    );


    assert.equal(
      cursorHarness.cursorCalls.length,
      1,
    );


    assert.equal(
      result.cursorAdvanceResult.branch,
      "CURSOR_ADVANCE_RESULT",
    );
  },
);


test(
  "LEASE_BUSY does not pin the captured fair cursor",
  async () => {
    const cursorHarness =
      attachCursorHarness(
        createHarness({
          workItems: [
            createWorkItem(
              "REEVALUATION_REQUIRED",
              1,
            ),
          ],

          reevaluationBranch:
            "LEASE_BUSY",
        }),
      );


    const result =
      await runWithHarness(
        cursorHarness.harness,
      );


    assert.equal(
      result.workResults[0]
        ?.assessment
        ?.branch,
      "LEASE_BUSY",
    );


    assert.equal(
      cursorHarness.cursorCalls.length,
      1,
    );


    assert.equal(
      result.cursorAdvanceResult.branch,
      "CURSOR_ADVANCE_RESULT",
    );
  },
);


test(
  "STALE cursor CAS is scheduling contention rather than cycle failure",
  async () => {
    const cursorHarness =
      attachCursorHarness(
        createHarness({
          workItems: [
            createWorkItem(
              "REEVALUATION_REQUIRED",
              1,
            ),
          ],
        }),

        {
          cursorState:
            "STALE",
        },
      );


    const result =
      await runWithHarness(
        cursorHarness.harness,
      );


    assert.equal(
      cursorHarness.cursorCalls.length,
      1,
    );


    assert.equal(
      result.cursorAdvanceResult.branch,
      "CURSOR_ADVANCE_RESULT",
    );


    assert.equal(
      result.cursorAdvanceResult.result
        ?.state,
      "STALE",
    );


    assert.equal(
      result.cursorAdvanceResult.error,
      null,
    );
  },
);


test(
  "cursor transport error is isolated after durable work results",
  async () => {
    const cursorHarness =
      attachCursorHarness(
        createHarness({
          workItems: [
            createWorkItem(
              "REEVALUATION_REQUIRED",
              1,
            ),
          ],
        }),

        {
          cursorError:
            new Error(
              "synthetic cursor transport failure",
            ),
        },
      );


    const result =
      await runWithHarness(
        cursorHarness.harness,
      );


    assert.equal(
      result.workResults.length,
      1,
    );


    assert.equal(
      result.workResults[0]
        ?.branch,
      "REEVALUATION_RESULT",
    );


    assert.equal(
      result.cursorAdvanceResult.branch,
      "CURSOR_ADVANCE_ERROR",
    );


    assert.equal(
      result.cursorAdvanceResult.result,
      null,
    );


    assert.match(
      result.cursorAdvanceResult.error ||
        "",
      /synthetic cursor transport failure/,
    );


    assert.equal(
      cursorHarness.cursorCalls.length,
      1,
    );
  },
);


test(
  "empty fair page with no cursor performs no CAS",
  async () => {
    const cursorHarness =
      attachCursorHarness(
        createHarness({
          workItems:
            [],
        }),

        {
          cursorAdvance:
            null,
        },
      );


    const result =
      await runWithHarness(
        cursorHarness.harness,
      );


    assert.equal(
      cursorHarness.cursorCalls.length,
      0,
    );


    assert.equal(
      result.cursorAdvanceResult.branch,
      "CURSOR_ADVANCE_NOT_REQUIRED",
    );
  },
);


test(
  "cessation-only fair page advances the shared all-state cursor",
  async () => {
    const cessationCursorAdvance = {
      expectedCursor:
        TEST_CURSOR_ADVANCE.expectedCursor,

      proposedCursor: {
        positiveAssessedAt:
          "2026-08-24T15:01:00.654321+00:00",

        positiveCheckpointId:
          POSITIVE_ID_2,
      },
    };


    const cursorHarness =
      attachCursorHarness(
        createHarness({
          workItems: [
            createWorkItem(
              "CESSATION_REQUIRED",
              2,
            ),
          ],
        }),

        {
          cursorAdvance:
            cessationCursorAdvance,
        },
      );


    const result =
      await runWithHarness(
        cursorHarness.harness,
      );


    assert.equal(
      cursorHarness.cursorCalls.length,
      1,
    );


    assert.deepEqual(
      cursorHarness.cursorCalls[0]
        ?.proposedCursor,
      cessationCursorAdvance.proposedCursor,
    );


    assert.equal(
      result.cursorAdvanceResult.branch,
      "CURSOR_ADVANCE_RESULT",
    );
  },
);
