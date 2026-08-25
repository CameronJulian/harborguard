import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_POST_POSITIVE_LIFECYCLE_CYCLE_RUNNER_V3_VERSION,
  runHsppPostPositiveLifecycleCycleV3,
} from "../lib/hspp/runHsppPostPositiveLifecycleCycleV3";

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
      "NO_CANDIDATES",

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
    createDecidedAt,
    createLeaseToken,
  };
}

function runWithHarness(
  harness: ReturnType<typeof createHarness>,
  overrides: Record<string, unknown> = {},
) {
  return runHsppPostPositiveLifecycleCycleV3(
    {
      supabase:
        SUPABASE,

      organizationId:
        ORGANIZATION_ID,

      limit:
        10,

      leaseSeconds:
        60,

      createDecidedAt:
        harness.createDecidedAt,

      createLeaseToken:
        harness.createLeaseToken,

      ...overrides,
    } as any,

    harness.dependencies,
  );
}


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





function authorityAssessment(
  branch: string,
  marker: string,
) {
  return {
    runnerVersion:
      "hspp-post-positive-revalidation-unsuitability-assessment-runner-v2",

    branch,
    marker,

    selection:
      null,

    checkpoint:
      null,

    cursorAdvance:
      null,

    busyUntil:
      null,

    leaseRelease:
      null,
  } as any;
}


function useAuthorityResult(
  harness: ReturnType<typeof createHarness>,
  assessment: any,
) {
  harness.dependencies.runReevaluation =
    async (input: any) => {
      harness.events.push(
        "reevaluation:" +
          input.workItem.positiveCheckpointId,
      );

      harness.calls.reevaluation.push(
        input,
      );

      return assessment;
    };
}


test(
  "V3 dispatch owns decidedAt and leaseToken but not observedAt",
  async () => {
    const workItem =
      createWorkItem(
        "REEVALUATION_REQUIRED",
        1,
      );

    const harness =
      createHarness({
        workItems: [
          workItem,
        ],
      });

    const assessment =
      authorityAssessment(
        "NO_CANDIDATES",
        "no-candidates",
      );

    useAuthorityResult(
      harness,
      assessment,
    );

    const result =
      await runWithHarness(
        harness,
      );

    assert.equal(
      result.runnerVersion,
      HSPP_POST_POSITIVE_LIFECYCLE_CYCLE_RUNNER_V3_VERSION,
    );

    assert.deepEqual(
      harness.events,
      [
        "discovery",
        "decided:" + POSITIVE_ID_1,
        "lease:" + POSITIVE_ID_1,
        "reevaluation:" + POSITIVE_ID_1,
      ],
    );

    assert.equal(
      harness.calls.observed.length,
      0,
    );

    assert.equal(
      harness.calls.decided.length,
      1,
    );

    assert.equal(
      harness.calls.lease.length,
      1,
    );

    assert.deepEqual(
      harness.calls.reevaluation[0],
      {
        supabase:
          SUPABASE,

        workItem,

        leaseToken:
          "lease-" + POSITIVE_ID_1,

        leaseSeconds:
          60,

        decidedAt:
          DECIDED_AT,
      },
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        harness.calls.reevaluation[0],
        "observedAt",
      ),
      false,
    );

    assert.equal(
      Object.prototype.hasOwnProperty.call(
        harness.calls.reevaluation[0],
        "limit",
      ),
      false,
    );

    assert.equal(
      result.workResults[0]?.branch,
      "REEVALUATION_RESULT",
    );

    assert.strictEqual(
      result.workResults[0]?.assessment,
      assessment,
    );
  },
);


for (
  const branch
  of [
    "NO_CANDIDATES",
    "NO_QUALIFYING_REVALIDATION",
  ]
) {
  test(
    "V3 preserves Authority V2 " +
      branch +
      " verbatim",
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

      const assessment =
        authorityAssessment(
          branch,
          branch,
        );

      useAuthorityResult(
        harness,
        assessment,
      );

      const result =
        await runWithHarness(
          harness,
        );

      assert.equal(
        result.workResults[0]?.branch,
        "REEVALUATION_RESULT",
      );

      assert.strictEqual(
        result.workResults[0]?.assessment,
        assessment,
      );

      assert.equal(
        result.workResults[0]?.assessment?.branch,
        branch,
      );
    },
  );
}


test(
  "V3 preserves Q14x-v2 checkpoint success verbatim",
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

    const assessment =
      authorityAssessment(
        "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED",
        "q14x-v2",
      );

    assessment.checkpoint = {
      state:
        "MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED",

      checkpointId:
        "77777777-7777-4777-8777-777777777777",
    };

    useAuthorityResult(
      harness,
      assessment,
    );

    const result =
      await runWithHarness(
        harness,
      );

    assert.equal(
      result.workResults[0]?.branch,
      "REEVALUATION_RESULT",
    );

    assert.strictEqual(
      result.workResults[0]?.assessment,
      assessment,
    );

    assert.equal(
      result.workResults[0]?.assessment?.branch,
      "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED",
    );
  },
);


test(
  "V3 LEASE_BUSY remains successful dispatch",
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

    const assessment =
      authorityAssessment(
        "LEASE_BUSY",
        "busy",
      );

    assessment.busyUntil =
      "2026-08-25T18:30:00.000Z";

    useAuthorityResult(
      harness,
      assessment,
    );

    const result =
      await runWithHarness(
        harness,
      );

    assert.equal(
      result.workResults[0]?.branch,
      "REEVALUATION_RESULT",
    );

    assert.strictEqual(
      result.workResults[0]?.assessment,
      assessment,
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
  "V3 Authority error is isolated and later cessation proceeds",
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
      });

    harness.dependencies.runReevaluation =
      async (input: any) => {
        harness.events.push(
          "reevaluation:" +
            input.workItem.positiveCheckpointId,
        );

        harness.calls.reevaluation.push(
          input,
        );

        throw new Error(
          "synthetic Authority V2 failure",
        );
      };

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
      "synthetic Authority V2 failure",
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
  "V3 requires decidedAt and leaseToken factories before discovery",
  async () => {
    const first =
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
          first,
          {
            createDecidedAt:
              null,
          },
        ),
      /createDecidedAt must be a function/,
    );

    assert.equal(
      first.calls.discovery.length,
      0,
    );

    const second =
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
          second,
          {
            createLeaseToken:
              null,
          },
        ),
      /createLeaseToken must be a function/,
    );

    assert.equal(
      second.calls.discovery.length,
      0,
    );
  },
);


test(
  "V3 isolated Authority error does not pin fair cursor",
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
      result.workResults[0]?.branch,
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
