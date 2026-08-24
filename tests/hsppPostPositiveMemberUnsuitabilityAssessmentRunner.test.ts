import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_ASSESSMENT_RUNNER_VERSION,
  runHsppPostPositiveMemberUnsuitabilityAssessment,
} from "../lib/hspp/runHsppPostPositiveMemberUnsuitabilityAssessment";

const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const ASSEMBLY_ID =
  "22222222-2222-4222-8222-222222222222";

const MEMBERSHIP_ID =
  "33333333-3333-4333-8333-333333333333";

const EVIDENCE_ID =
  "44444444-4444-4444-8444-444444444444";

const POSITIVE_CHECKPOINT_ID =
  "55555555-5555-4555-8555-555555555555";

const UNSUITABILITY_CHECKPOINT_ID =
  "66666666-6666-4666-8666-666666666666";

const LEASE_TOKEN =
  "77777777-7777-4777-8777-777777777777";

const FINGERPRINT =
  "a".repeat(64);

const OBSERVED_AT =
  "2026-08-24T11:00:00.000Z";

const DECIDED_AT =
  "2026-08-24T11:00:01.000Z";

const SUPABASE =
  {} as SupabaseClient;

function createWorkItem(
  overrides: Record<string, unknown> = {},
) {
  return {
    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    membershipId:
      MEMBERSHIP_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      FINGERPRINT,

    positiveAssessedAt:
      "2026-08-24T10:00:00.000Z",

    unsuitabilityCheckpointId:
      null,

    unsuitabilityObservedAt:
      null,

    unsuitabilityDecidedAt:
      null,

    workState:
      "REEVALUATION_REQUIRED",

    ...overrides,
  } as any;
}

type DecisionState =
  | "SUITABLE"
  | "INDETERMINATE"
  | "UNSUITABLE";

function createDecision(
  state: DecisionState,
) {
  const reason =
    state === "SUITABLE"
      ? "CURRENT_OPERATIONAL_USE_ALLOWED"
      : state === "UNSUITABLE"
        ? "CURRENT_INTEGRITY_NOT_VERIFIED"
        : "CURRENT_OPERATIONAL_NOT_ELIGIBLE";

  return {
    policyVersion:
      "hspp-post-positive-member-unsuitability-v1",

    state,

    reason,

    persistenceReason:
      state === "UNSUITABLE"
        ? "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION"
        : null,

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    membershipId:
      MEMBERSHIP_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      FINGERPRINT,

    positiveAssessedAt:
      "2026-08-24T10:00:00.000Z",

    observedAt:
      OBSERVED_AT,

    decidedAt:
      DECIDED_AT,

    operationalDecision: {
      allowed:
        state === "SUITABLE",

      reason:
        state === "SUITABLE"
          ? "operational_use_allowed"
          : "operational_not_eligible",

      policyVersion:
        "hspp-operational-use-policy-v1",
    },
  } as any;
}

type HarnessOptions = {
  acquireState?:
    "ACQUIRED" |
    "BUSY";

  decisionState?:
    DecisionState;

  priorPositiveCheckpointId?:
    string;

  evaluateError?:
    Error | null;

  persistError?:
    Error | null;

  releaseError?:
    Error | null;
};

function createHarness(
  {
    acquireState =
      "ACQUIRED",

    decisionState =
      "SUITABLE",

    priorPositiveCheckpointId =
      POSITIVE_CHECKPOINT_ID,

    evaluateError =
      null,

    persistError =
      null,

    releaseError =
      null,
  }: HarnessOptions = {},
) {
  const calls = {
    acquire:
      [] as any[],

    read:
      [] as any[],

    evaluate:
      [] as any[],

    persist:
      [] as any[],

    release:
      [] as any[],
  };

  const dependencies = {
    async acquireLease(
      input: any,
    ) {
      calls.acquire.push(
        input,
      );

      if (
        acquireState ===
        "BUSY"
      ) {
        return {
          state:
            "BUSY",

          leaseToken:
            null,

          expiresAt:
            "2026-08-24T11:05:00.000Z",

          acquiredAt:
            "2026-08-24T10:55:00.000Z",

          renewedAt:
            "2026-08-24T10:55:00.000Z",
        };
      }

      return {
        state:
          "ACQUIRED",

        leaseToken:
          LEASE_TOKEN,

        expiresAt:
          "2026-08-24T11:05:00.000Z",

        acquiredAt:
          "2026-08-24T11:00:00.000Z",

        renewedAt:
          "2026-08-24T11:00:00.000Z",
      };
    },

    async readEvidence(
      input: any,
    ) {
      calls.read.push(
        input,
      );

      return {
        found:
          false,

        evidence:
          null,

        verification:
          null,
      };
    },

    evaluate(
      input: any,
    ) {
      calls.evaluate.push(
        input,
      );

      if (evaluateError) {
        throw evaluateError;
      }

      return createDecision(
        decisionState,
      );
    },

    async persistUnsuitability(
      input: any,
    ) {
      calls.persist.push(
        input,
      );

      if (persistError) {
        throw persistError;
      }

      return {
        writerVersion:
          "hspp-member-unsuitability-checkpoint-under-execution-lease-v1",

        state:
          "MEMBER_UNSUITABILITY_CHECKPOINT_PERSISTED",

        checkpointId:
          UNSUITABILITY_CHECKPOINT_ID,

        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          ASSEMBLY_ID,

        evidenceId:
          EVIDENCE_ID,

        integrityFingerprint:
          FINGERPRINT,

        priorPositiveCheckpointId,

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,

        createdAt:
          "2026-08-24T11:00:02.000Z",
      };
    },

    async releaseLease(
      input: any,
    ) {
      calls.release.push(
        input,
      );

      if (releaseError) {
        throw releaseError;
      }

      return {
        state:
          "RELEASED",

        leaseToken:
          LEASE_TOKEN,
      };
    },
  } as any;

  return {
    calls,
    dependencies,
  };
}

function runWithHarness(
  dependencies: any,
  workItem: any = createWorkItem(),
) {
  return runHsppPostPositiveMemberUnsuitabilityAssessment(
    {
      supabase:
        SUPABASE,

      workItem,

      leaseToken:
        LEASE_TOKEN,

      leaseSeconds:
        60,

      observedAt:
        OBSERVED_AT,

      decidedAt:
        DECIDED_AT,
    },

    dependencies,
  );
}

test(
  "runner rejects CESSATION_REQUIRED before acquiring a lease",
  async () => {
    const harness =
      createHarness();

    await assert.rejects(
      () =>
        runWithHarness(
          harness.dependencies,

          createWorkItem({
            workState:
              "CESSATION_REQUIRED",

            unsuitabilityCheckpointId:
              UNSUITABILITY_CHECKPOINT_ID,

            unsuitabilityObservedAt:
              OBSERVED_AT,

            unsuitabilityDecidedAt:
              DECIDED_AT,
          }),
        ),
      /requires REEVALUATION_REQUIRED work/,
    );

    assert.equal(
      harness.calls.acquire.length,
      0,
    );

    assert.equal(
      harness.calls.read.length,
      0,
    );

    assert.equal(
      harness.calls.persist.length,
      0,
    );
  },
);

test(
  "BUSY lease performs no evidence read evaluation persistence or release",
  async () => {
    const harness =
      createHarness({
        acquireState:
          "BUSY",
      });

    const result =
      await runWithHarness(
        harness.dependencies,
      );

    assert.equal(
      result.runnerVersion,
      HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_ASSESSMENT_RUNNER_VERSION,
    );

    assert.equal(
      result.branch,
      "LEASE_BUSY",
    );

    assert.equal(
      result.busyUntil,
      "2026-08-24T11:05:00.000Z",
    );

    assert.equal(
      result.decision,
      null,
    );

    assert.equal(
      result.checkpoint,
      null,
    );

    assert.equal(
      result.leaseRelease,
      null,
    );

    assert.equal(
      harness.calls.acquire.length,
      1,
    );

    assert.equal(
      harness.calls.read.length,
      0,
    );

    assert.equal(
      harness.calls.evaluate.length,
      0,
    );

    assert.equal(
      harness.calls.persist.length,
      0,
    );

    assert.equal(
      harness.calls.release.length,
      0,
    );
  },
);

test(
  "SUITABLE reads exact evidence performs no Q14x write and releases lease",
  async () => {
    const harness =
      createHarness({
        decisionState:
          "SUITABLE",
      });

    const result =
      await runWithHarness(
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "SUITABLE",
    );

    assert.equal(
      result.checkpoint,
      null,
    );

    assert.equal(
      harness.calls.persist.length,
      0,
    );

    assert.deepEqual(
      harness.calls.read[0],
      {
        supabase:
          SUPABASE,

        organizationId:
          ORGANIZATION_ID,

        evidenceId:
          EVIDENCE_ID,
      },
    );

    assert.deepEqual(
      harness.calls.acquire[0],
      {
        supabase:
          SUPABASE,

        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          ASSEMBLY_ID,

        leaseToken:
          LEASE_TOKEN,

        leaseSeconds:
          60,
      },
    );

    assert.deepEqual(
      harness.calls.release[0],
      {
        supabase:
          SUPABASE,

        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          ASSEMBLY_ID,

        leaseToken:
          LEASE_TOKEN,
      },
    );

    assert.deepEqual(
      result.leaseRelease,
      {
        state:
          "RELEASED",

        error:
          null,
      },
    );
  },
);

test(
  "INDETERMINATE performs no Q14x write and releases lease",
  async () => {
    const harness =
      createHarness({
        decisionState:
          "INDETERMINATE",
      });

    const result =
      await runWithHarness(
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "INDETERMINATE",
    );

    assert.equal(
      result.checkpoint,
      null,
    );

    assert.equal(
      harness.calls.persist.length,
      0,
    );

    assert.equal(
      harness.calls.release.length,
      1,
    );
  },
);

test(
  "UNSUITABLE maps exact evaluator identity time and lease token into Q14x",
  async () => {
    const harness =
      createHarness({
        decisionState:
          "UNSUITABLE",
      });

    const result =
      await runWithHarness(
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "UNSUITABILITY_CHECKPOINT_PERSISTED",
    );

    assert.equal(
      harness.calls.persist.length,
      1,
    );

    assert.deepEqual(
      harness.calls.persist[0],
      {
        supabase:
          SUPABASE,

        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          ASSEMBLY_ID,

        leaseToken:
          LEASE_TOKEN,

        evidenceId:
          EVIDENCE_ID,

        integrityFingerprint:
          FINGERPRINT,

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      },
    );

    assert.equal(
      result.checkpoint?.checkpointId,
      UNSUITABILITY_CHECKPOINT_ID,
    );

    assert.equal(
      result.checkpoint?.priorPositiveCheckpointId,
      POSITIVE_CHECKPOINT_ID,
    );

    assert.equal(
      harness.calls.release.length,
      1,
    );
  },
);

test(
  "runner verifies Q14x resolved the same prior positive checkpoint as discovery",
  async () => {
    const harness =
      createHarness({
        decisionState:
          "UNSUITABLE",

        priorPositiveCheckpointId:
          "88888888-8888-4888-8888-888888888888",
      });

    await assert.rejects(
      () =>
        runWithHarness(
          harness.dependencies,
        ),
      /different prior positive checkpoint than discovery/,
    );

    assert.equal(
      harness.calls.persist.length,
      1,
    );

    assert.equal(
      harness.calls.release.length,
      1,
    );
  },
);

test(
  "evaluator failure still releases the acquired lease",
  async () => {
    const harness =
      createHarness({
        evaluateError:
          new Error(
            "synthetic evaluator failure",
          ),
      });

    await assert.rejects(
      () =>
        runWithHarness(
          harness.dependencies,
        ),
      /synthetic evaluator failure/,
    );

    assert.equal(
      harness.calls.persist.length,
      0,
    );

    assert.equal(
      harness.calls.release.length,
      1,
    );
  },
);

test(
  "Q14x failure still releases the acquired lease",
  async () => {
    const harness =
      createHarness({
        decisionState:
          "UNSUITABLE",

        persistError:
          new Error(
            "synthetic Q14x failure",
          ),
      });

    await assert.rejects(
      () =>
        runWithHarness(
          harness.dependencies,
        ),
      /synthetic Q14x failure/,
    );

    assert.equal(
      harness.calls.persist.length,
      1,
    );

    assert.equal(
      harness.calls.release.length,
      1,
    );
  },
);

test(
  "release failure does not erase an already-persisted Q14x result",
  async () => {
    const harness =
      createHarness({
        decisionState:
          "UNSUITABLE",

        releaseError:
          new Error(
            "synthetic release failure",
          ),
      });

    const result =
      await runWithHarness(
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "UNSUITABILITY_CHECKPOINT_PERSISTED",
    );

    assert.equal(
      result.checkpoint?.checkpointId,
      UNSUITABILITY_CHECKPOINT_ID,
    );

    assert.deepEqual(
      result.leaseRelease,
      {
        state:
          "ERROR",

        error:
          "synthetic release failure",
      },
    );

    assert.equal(
      harness.calls.persist.length,
      1,
    );

    assert.equal(
      harness.calls.release.length,
      1,
    );
  },
);
