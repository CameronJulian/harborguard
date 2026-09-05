import assert from "node:assert/strict";
import test from "node:test";

import {
  runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2,
} from "../lib/hspp/runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2";


const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const ASSEMBLY_ID =
  "22222222-2222-4222-8222-222222222222";

const MEMBERSHIP_ID =
  "33333333-3333-4333-8333-333333333333";

const LEASE_TOKEN =
  "44444444-4444-4444-8444-444444444444";

const EVIDENCE_ID =
  "55555555-5555-4555-8555-555555555555";

const POSITIVE_CHECKPOINT_ID =
  "66666666-6666-4666-8666-666666666666";

const CHECKPOINT_ID =
  "77777777-7777-4777-8777-777777777777";

const R1_ID =
  "88888888-8888-4888-8888-888888888888";

const OLD_CURSOR_ID =
  "99999999-9999-4999-8999-999999999999";

const SUBJECT_FINGERPRINT =
  "a".repeat(64);

const R1_FINGERPRINT =
  "b".repeat(64);

const POSITIVE_AT =
  "2026-08-25T00:00:00Z";

const R1_AT =
  "2026-08-25T01:00:00Z";

const DECIDED_AT =
  "2026-08-25T02:00:00Z";

const LEASE_EXPIRES_AT =
  "2026-08-25T03:00:00Z";

const OLD_CURSOR_AT =
  "2026-08-25T00:30:00Z";


const EXPECTED_CURSOR =
  {
    observedAt:
      OLD_CURSOR_AT,

    evidenceId:
      OLD_CURSOR_ID,
  };


const PROPOSED_CURSOR =
  {
    observedAt:
      R1_AT,

    evidenceId:
      R1_ID,
  };


function workItem() {
  return {
    workState:
      "REEVALUATION_REQUIRED",

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    membershipId:
      MEMBERSHIP_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      SUBJECT_FINGERPRINT,

    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    positiveAssessedAt:
      POSITIVE_AT,

    unsuitabilityCheckpointId:
      null,

    unsuitabilityObservedAt:
      null,

    unsuitabilityDecidedAt:
      null,
  } as any;
}


function input() {
  return {
    supabase:
      {} as any,

    workItem:
      workItem(),

    leaseToken:
      LEASE_TOKEN,

    leaseSeconds:
      120,

    decidedAt:
      DECIDED_AT,

    limit:
      25,
  };
}


function acquired() {
  return {
    state:
      "ACQUIRED",

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    leaseToken:
      LEASE_TOKEN,

    expiresAt:
      LEASE_EXPIRES_AT,
  } as any;
}


function busy() {
  return {
    state:
      "BUSY",

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    leaseToken:
      null,

    expiresAt:
      LEASE_EXPIRES_AT,
  } as any;
}


function released() {
  return {
    state:
      "RELEASED",

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    leaseToken:
      LEASE_TOKEN,
  } as any;
}


function selection(
  status:
    | "NO_CANDIDATES"
    | "NO_QUALIFYING_REVALIDATION"
    | "QUALIFYING_REVALIDATION_FOUND",
  overrides: Record<string, unknown> = {},
) {
  const qualifying =
    status ===
    "QUALIFYING_REVALIDATION_FOUND";

  const hasCandidates =
    status !==
    "NO_CANDIDATES";

  return {
    runnerVersion:
      "hspp-post-positive-revalidation-selection-runner-v2",

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      SUBJECT_FINGERPRINT,

    candidateCount:
      hasCandidates
        ? 1
        : 0,

    evaluatedCount:
      hasCandidates
        ? 1
        : 0,

    status,

    selectedBasis:
      qualifying
        ? {
            revalidationEvidenceId:
              R1_ID,

            revalidationIntegrityFingerprint:
              R1_FINGERPRINT,

            observedAt:
              R1_AT,

            policyVersion:
              "hspp-post-positive-member-unsuitability-v2",

            persistenceReason:
              "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION",
          }
        : null,

    expectedCursor:
      EXPECTED_CURSOR,

    proposedCursor:
      hasCandidates
        ? PROPOSED_CURSOR
        : null,

    ...overrides,
  } as any;
}


function checkpoint(
  overrides: Record<string, unknown> = {},
) {
  return {
    writerVersion:
      "hspp-member-unsuitability-checkpoint-with-revalidation-under-execution-lease-v1",

    state:
      "MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED",

    checkpointId:
      CHECKPOINT_ID,

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      SUBJECT_FINGERPRINT,

    revalidationEvidenceId:
      R1_ID,

    revalidationIntegrityFingerprint:
      R1_FINGERPRINT,

    priorPositiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    checkpointVersion:
      "hspp-assembly-member-unsuitability-checkpoint-v2",

    unsuitabilityPolicyVersion:
      "hspp-post-positive-member-unsuitability-v2",

    unsuitabilityReason:
      "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION",

    observedAt:
      R1_AT,

    decidedAt:
      DECIDED_AT,

    createdAt:
      "2026-08-25T02:00:01Z",

    ...overrides,
  } as any;
}


function makeHarness(
  options: Record<string, any> = {},
) {
  const calls =
    {
      acquire:
        0,

      release:
        0,

      selection:
        0,

      persistence:
        0,

      cas:
        0,
    };

  const capture:
    Record<string, any> =
      {};

  const dependencies =
    {
      acquireLease:
        async (
          value: any,
        ) => {
          calls.acquire +=
            1;

          capture.acquire =
            value;

          return (
            options.lease ??
            acquired()
          );
        },

      releaseLease:
        async (
          value: any,
        ) => {
          calls.release +=
            1;

          capture.release =
            value;

          if (options.releaseError) {
            throw new Error(
              options.releaseError,
            );
          }

          return released();
        },

      selectRevalidation:
        async (
          value: any,
        ) => {
          calls.selection +=
            1;

          capture.selection =
            value;

          if (options.selectionError) {
            throw new Error(
              options.selectionError,
            );
          }

          return (
            options.selection ??
            selection(
              "NO_CANDIDATES",
            )
          );
        },

      persistUnsuitability:
        async (
          value: any,
        ) => {
          calls.persistence +=
            1;

          capture.persistence =
            value;

          if (options.persistenceError) {
            throw new Error(
              options.persistenceError,
            );
          }

          return (
            options.checkpoint ??
            checkpoint()
          );
        },

      advanceCandidateCursor:
        async (
          value: any,
        ) => {
          calls.cas +=
            1;

          capture.cas =
            value;

          if (options.casError) {
            throw new Error(
              options.casError,
            );
          }

          return {
            operationVersion:
              "hspp-post-positive-revalidation-candidate-scan-state-cas-v1",

            state:
              options.casState ??
              "ADVANCED",

            positiveCheckpointId:
              POSITIVE_CHECKPOINT_ID,
          } as any;
        },
    };

  return {
    calls,
    capture,
    dependencies:
      dependencies as any,
  };
}


test(
  "BUSY short-circuits before Selection V2 Q14x candidate CAS and release",
  async () => {
    const harness =
      makeHarness({
        lease:
          busy(),
      });

    const result =
      await runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2(
        input(),
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "LEASE_BUSY",
    );

    assert.equal(
      result.cursorAdvance,
      null,
    );

    assert.equal(
      harness.calls.acquire,
      1,
    );

    assert.equal(
      harness.calls.selection,
      0,
    );

    assert.equal(
      harness.calls.persistence,
      0,
    );

    assert.equal(
      harness.calls.cas,
      0,
    );

    assert.equal(
      harness.calls.release,
      0,
    );
  },
);


test(
  "NO_CANDIDATES performs no Q14x and no candidate cursor CAS",
  async () => {
    const harness =
      makeHarness({
        selection:
          selection(
            "NO_CANDIDATES",
          ),
      });

    const result =
      await runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2(
        input(),
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "NO_CANDIDATES",
    );

    assert.equal(
      result.cursorAdvance,
      null,
    );

    assert.equal(
      harness.calls.persistence,
      0,
    );

    assert.equal(
      harness.calls.cas,
      0,
    );

    assert.equal(
      harness.calls.release,
      1,
    );
  },
);


for (
  const state of
  [
    "ADVANCED",
    "EXACT_RETRY",
    "NO_CHANGE",
    "STALE",
    "CONTENDED",
  ] as const
) {
  test(
    "NO_QUALIFYING surfaces nonfatal candidate CAS state " +
      state,
    async () => {
      const harness =
        makeHarness({
          selection:
            selection(
              "NO_QUALIFYING_REVALIDATION",
            ),

          casState:
            state,
        });

      const result =
        await runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2(
          input(),
          harness.dependencies,
        );

      assert.equal(
        result.branch,
        "NO_QUALIFYING_REVALIDATION",
      );

      assert.equal(
        harness.calls.persistence,
        0,
      );

      assert.equal(
        harness.calls.cas,
        1,
      );

      assert.equal(
        harness.calls.release,
        1,
      );

      assert.equal(
        result.cursorAdvance?.branch,
        "CURSOR_ADVANCE_RESULT",
      );

      assert.equal(
        result.cursorAdvance?.result?.state,
        state,
      );

      assert.deepEqual(
        result.cursorAdvance?.request,
        {
          positiveCheckpointId:
            POSITIVE_CHECKPOINT_ID,

          expectedCursor:
            EXPECTED_CURSOR,

          proposedCursor:
            PROPOSED_CURSOR,
        },
      );

      assert.deepEqual(
        harness.capture.cas.expectedCursor,
        EXPECTED_CURSOR,
      );

      assert.deepEqual(
        harness.capture.cas.proposedCursor,
        PROPOSED_CURSOR,
      );
    },
  );
}


test(
  "NO_QUALIFYING candidate CAS failure is summarized without retry or semantic failure",
  async () => {
    const harness =
      makeHarness({
        selection:
          selection(
            "NO_QUALIFYING_REVALIDATION",
          ),

        casError:
          "controlled candidate CAS failure",
      });

    const result =
      await runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2(
        input(),
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "NO_QUALIFYING_REVALIDATION",
    );

    assert.equal(
      result.cursorAdvance?.branch,
      "CURSOR_ADVANCE_ERROR",
    );

    assert.match(
      result.cursorAdvance?.error ?? "",
      /controlled candidate CAS failure/i,
    );

    assert.equal(
      harness.calls.cas,
      1,
    );

    assert.equal(
      harness.calls.persistence,
      0,
    );

    assert.equal(
      harness.calls.release,
      1,
    );
  },
);


test(
  "QUALIFYING persists exact Q14x-v2 authority and performs no candidate CAS",
  async () => {
    const harness =
      makeHarness({
        selection:
          selection(
            "QUALIFYING_REVALIDATION_FOUND",
          ),
      });

    const result =
      await runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2(
        input(),
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED",
    );

    assert.equal(
      harness.calls.persistence,
      1,
    );

    assert.equal(
      harness.calls.cas,
      0,
    );

    assert.equal(
      harness.calls.release,
      1,
    );

    assert.equal(
      result.cursorAdvance,
      null,
    );

    assert.equal(
      result.checkpoint?.checkpointId,
      CHECKPOINT_ID,
    );

    assert.equal(
      harness.capture.persistence.leaseToken,
      LEASE_TOKEN,
    );

    assert.equal(
      harness.capture.persistence.evidenceId,
      EVIDENCE_ID,
    );

    assert.equal(
      harness.capture.persistence.integrityFingerprint,
      SUBJECT_FINGERPRINT,
    );

    assert.equal(
      harness.capture.persistence.revalidationEvidenceId,
      R1_ID,
    );

    assert.equal(
      harness.capture.persistence.revalidationIntegrityFingerprint,
      R1_FINGERPRINT,
    );

    assert.equal(
      harness.capture.persistence.observedAt,
      R1_AT,
    );

    assert.equal(
      harness.capture.persistence.decidedAt,
      DECIDED_AT,
    );
  },
);


test(
  "Q14x-v2 failure remains primary and candidate cursor is never advanced",
  async () => {
    const harness =
      makeHarness({
        selection:
          selection(
            "QUALIFYING_REVALIDATION_FOUND",
          ),

        persistenceError:
          "controlled Q14x-v2 failure",
      });

    await assert.rejects(
      () =>
        runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2(
          input(),
          harness.dependencies,
        ),
      /controlled Q14x-v2 failure/i,
    );

    assert.equal(
      harness.calls.persistence,
      1,
    );

    assert.equal(
      harness.calls.cas,
      0,
    );

    assert.equal(
      harness.calls.release,
      1,
    );
  },
);


test(
  "release failure after durable Q14x-v2 success is summarized without inventing CAS",
  async () => {
    const harness =
      makeHarness({
        selection:
          selection(
            "QUALIFYING_REVALIDATION_FOUND",
          ),

        releaseError:
          "controlled release failure",
      });

    const result =
      await runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2(
        input(),
        harness.dependencies,
      );

    assert.equal(
      result.branch,
      "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED",
    );

    assert.equal(
      result.checkpoint?.checkpointId,
      CHECKPOINT_ID,
    );

    assert.equal(
      result.cursorAdvance,
      null,
    );

    assert.equal(
      result.leaseRelease?.state,
      "ERROR",
    );

    assert.match(
      result.leaseRelease?.error ?? "",
      /controlled release failure/i,
    );

    assert.equal(
      harness.calls.persistence,
      1,
    );

    assert.equal(
      harness.calls.cas,
      0,
    );

    assert.equal(
      harness.calls.release,
      1,
    );
  },
);


test(
  "selection failure stays primary when release also fails and neither Q14x nor CAS runs",
  async () => {
    const harness =
      makeHarness({
        selectionError:
          "controlled Selection V2 failure",

        releaseError:
          "controlled release failure",
      });

    await assert.rejects(
      () =>
        runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2(
          input(),
          harness.dependencies,
        ),
      /controlled Selection V2 failure/i,
    );

    assert.equal(
      harness.calls.selection,
      1,
    );

    assert.equal(
      harness.calls.persistence,
      0,
    );

    assert.equal(
      harness.calls.cas,
      0,
    );

    assert.equal(
      harness.calls.release,
      1,
    );
  },
);


test(
  "NO_QUALIFYING refuses a missing proposed cursor before any CAS call",
  async () => {
    const harness =
      makeHarness({
        selection:
          selection(
            "NO_QUALIFYING_REVALIDATION",
            {
              proposedCursor:
                null,
            },
          ),
      });

    await assert.rejects(
      () =>
        runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2(
          input(),
          harness.dependencies,
        ),
      /must provide a candidate cursor proposal/i,
    );

    assert.equal(
      harness.calls.cas,
      0,
    );

    assert.equal(
      harness.calls.persistence,
      0,
    );

    assert.equal(
      harness.calls.release,
      1,
    );
  },
);
