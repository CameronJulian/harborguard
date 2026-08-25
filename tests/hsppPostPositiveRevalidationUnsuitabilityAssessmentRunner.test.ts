import assert from "node:assert/strict";
import test from "node:test";

import {
  runHsppPostPositiveRevalidationUnsuitabilityAssessment,
  type HsppPostPositiveRevalidationAuthoritativeLeaseAcquisition,
  type HsppPostPositiveRevalidationAuthoritativeLeaseReleaseResult,
} from "../lib/hspp/runHsppPostPositiveRevalidationUnsuitabilityAssessment";

import type {
  RunHsppPostPositiveRevalidationSelectionResult,
} from "../lib/hspp/runHsppPostPositiveRevalidationSelection";

import type {
  PersistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLeaseInput,
  PersistedHsppMemberUnsuitabilityCheckpointWithRevalidation,
} from "../lib/hspp/persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "../lib/hspp/readHsppPostPositiveLifecycleWorkItems";


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

const R1_ID =
  "66666666-6666-4666-8666-666666666666";

const POSITIVE_CHECKPOINT_ID =
  "77777777-7777-4777-8777-777777777777";

const CHECKPOINT_ID =
  "88888888-8888-4888-8888-888888888888";

const C_FINGERPRINT =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const R1_FINGERPRINT =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const R1_OBSERVED_AT =
  "2026-08-25T08:05:00.000Z";

const DECIDED_AT =
  "2026-08-25T08:06:00.000Z";

const CREATED_AT =
  "2026-08-25T08:06:01.000Z";


function makeWorkItem(): HsppPostPositiveLifecycleWorkItem {
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
      C_FINGERPRINT,

    positiveAssessedAt:
      "2026-08-25T08:00:00.000Z",

    unsuitabilityCheckpointId:
      null,

    unsuitabilityObservedAt:
      null,

    unsuitabilityDecidedAt:
      null,

    workState:
      "REEVALUATION_REQUIRED",
  };
}


function makeAcquired(
  leaseToken:
    string =
      LEASE_TOKEN,
): HsppPostPositiveRevalidationAuthoritativeLeaseAcquisition {
  return {
    state:
      "ACQUIRED",

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    leaseToken,

    expiresAt:
      "2026-08-25T08:10:00.000Z",
  };
}


function makeBusy(): HsppPostPositiveRevalidationAuthoritativeLeaseAcquisition {
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
      "2026-08-25T08:10:00.000Z",
  };
}


function makeRelease(): HsppPostPositiveRevalidationAuthoritativeLeaseReleaseResult {
  return {
    state:
      "RELEASED",

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    leaseToken:
      LEASE_TOKEN,
  };
}


function makeSelection(
  status:
    RunHsppPostPositiveRevalidationSelectionResult["status"],
): RunHsppPostPositiveRevalidationSelectionResult {
  const qualifying =
    status ===
    "QUALIFYING_REVALIDATION_FOUND";

  return {
    runnerVersion:
      "hspp-post-positive-revalidation-selection-runner-v1",

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      C_FINGERPRINT,

    candidateCount:
      status ===
      "NO_CANDIDATES"
        ? 0
        : 1,

    evaluatedCount:
      status ===
      "NO_CANDIDATES"
        ? 0
        : 1,

    status,

    selectedBasis:
      qualifying
        ? {
            revalidationEvidenceId:
              R1_ID,

            revalidationIntegrityFingerprint:
              R1_FINGERPRINT,

            observedAt:
              R1_OBSERVED_AT,

            policyVersion:
              "hspp-post-positive-member-unsuitability-v2",

            persistenceReason:
              "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION",
          }
        : null,
  };
}


function makeCheckpoint(
  overrides:
    Partial<PersistedHsppMemberUnsuitabilityCheckpointWithRevalidation> =
      {},
): PersistedHsppMemberUnsuitabilityCheckpointWithRevalidation {
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
      C_FINGERPRINT,

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
      R1_OBSERVED_AT,

    decidedAt:
      DECIDED_AT,

    createdAt:
      CREATED_AT,

    ...overrides,
  };
}


function baseInput() {
  return {
    supabase:
      {} as never,

    workItem:
      makeWorkItem(),

    leaseToken:
      LEASE_TOKEN,

    leaseSeconds:
      120,

    decidedAt:
      DECIDED_AT,

    limit:
      5,
  };
}


test(
  "BUSY short-circuits before selection persistence and release",
  async () => {
    let selectionCalls =
      0;

    let persistenceCalls =
      0;

    let releaseCalls =
      0;


    const result =
      await runHsppPostPositiveRevalidationUnsuitabilityAssessment(
        baseInput(),
        {
          acquireLease:
            async () =>
              makeBusy(),

          releaseLease:
            async () => {
              releaseCalls +=
                1;

              return makeRelease();
            },

          selectRevalidation:
            async () => {
              selectionCalls +=
                1;

              return makeSelection(
                "QUALIFYING_REVALIDATION_FOUND",
              );
            },

          persistUnsuitability:
            async () => {
              persistenceCalls +=
                1;

              return makeCheckpoint();
            },
        },
      );


    assert.equal(
      result.branch,
      "LEASE_BUSY",
    );

    assert.equal(
      selectionCalls,
      0,
    );

    assert.equal(
      persistenceCalls,
      0,
    );

    assert.equal(
      releaseCalls,
      0,
    );

    assert.equal(
      result.selection,
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
  },
);


test(
  "NO_CANDIDATES releases acquired lease without Q14x-v2 persistence",
  async () => {
    let persistenceCalls =
      0;

    let releaseCalls =
      0;


    const result =
      await runHsppPostPositiveRevalidationUnsuitabilityAssessment(
        baseInput(),
        {
          acquireLease:
            async () =>
              makeAcquired(),

          releaseLease:
            async () => {
              releaseCalls +=
                1;

              return makeRelease();
            },

          selectRevalidation:
            async () =>
              makeSelection(
                "NO_CANDIDATES",
              ),

          persistUnsuitability:
            async () => {
              persistenceCalls +=
                1;

              return makeCheckpoint();
            },
        },
      );


    assert.equal(
      result.branch,
      "NO_CANDIDATES",
    );

    assert.equal(
      persistenceCalls,
      0,
    );

    assert.equal(
      releaseCalls,
      1,
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
  "NO_QUALIFYING_REVALIDATION releases acquired lease without persistence",
  async () => {
    let persistenceCalls =
      0;


    const result =
      await runHsppPostPositiveRevalidationUnsuitabilityAssessment(
        baseInput(),
        {
          acquireLease:
            async () =>
              makeAcquired(),

          releaseLease:
            async () =>
              makeRelease(),

          selectRevalidation:
            async () =>
              makeSelection(
                "NO_QUALIFYING_REVALIDATION",
              ),

          persistUnsuitability:
            async () => {
              persistenceCalls +=
                1;

              return makeCheckpoint();
            },
        },
      );


    assert.equal(
      result.branch,
      "NO_QUALIFYING_REVALIDATION",
    );

    assert.equal(
      persistenceCalls,
      0,
    );

    assert.equal(
      result.checkpoint,
      null,
    );
  },
);


test(
  "qualifying R1 persists exact C plus R1 basis under acquired lease",
  async () => {
    const persistCapture: {
      value?:
        PersistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLeaseInput;
    } = {};

    let releaseCalls =
      0;


    const result =
      await runHsppPostPositiveRevalidationUnsuitabilityAssessment(
        baseInput(),
        {
          acquireLease:
            async () =>
              makeAcquired(),

          releaseLease:
            async () => {
              releaseCalls +=
                1;

              return makeRelease();
            },

          selectRevalidation:
            async () =>
              makeSelection(
                "QUALIFYING_REVALIDATION_FOUND",
              ),

          persistUnsuitability:
            async input => {
              persistCapture.value =
                input;

              return makeCheckpoint();
            },
        },
      );


    const persistedInput =
      persistCapture.value;

    assert.ok(
      persistedInput,
    );

    assert.deepEqual(
      {
        organizationId:
          persistedInput.organizationId,

        assemblyId:
          persistedInput.assemblyId,

        leaseToken:
          persistedInput.leaseToken,

        evidenceId:
          persistedInput.evidenceId,

        integrityFingerprint:
          persistedInput.integrityFingerprint,

        revalidationEvidenceId:
          persistedInput.revalidationEvidenceId,

        revalidationIntegrityFingerprint:
          persistedInput.revalidationIntegrityFingerprint,

        observedAt:
          persistedInput.observedAt,

        decidedAt:
          persistedInput.decidedAt,
      },
      {
        organizationId:
          ORGANIZATION_ID,

        assemblyId:
          ASSEMBLY_ID,

        leaseToken:
          LEASE_TOKEN,

        evidenceId:
          EVIDENCE_ID,

        integrityFingerprint:
          C_FINGERPRINT,

        revalidationEvidenceId:
          R1_ID,

        revalidationIntegrityFingerprint:
          R1_FINGERPRINT,

        observedAt:
          R1_OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      },
    );


    assert.equal(
      result.branch,
      "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED",
    );

    assert.equal(
      result.checkpoint?.priorPositiveCheckpointId,
      POSITIVE_CHECKPOINT_ID,
    );

    assert.equal(
      releaseCalls,
      1,
    );
  },
);


test(
  "runner fails closed if Q14x-v2 returns a different prior-positive checkpoint",
  async () => {
    let releaseCalls =
      0;


    await assert.rejects(
      runHsppPostPositiveRevalidationUnsuitabilityAssessment(
        baseInput(),
        {
          acquireLease:
            async () =>
              makeAcquired(),

          releaseLease:
            async () => {
              releaseCalls +=
                1;

              return makeRelease();
            },

          selectRevalidation:
            async () =>
              makeSelection(
                "QUALIFYING_REVALIDATION_FOUND",
              ),

          persistUnsuitability:
            async () =>
              makeCheckpoint({
                priorPositiveCheckpointId:
                  "99999999-9999-4999-8999-999999999999",
              }),
        },
      ),
      /conflicts with the selected lifecycle basis/,
    );


    assert.equal(
      releaseCalls,
      1,
    );
  },
);


test(
  "selection failure remains primary and release is still attempted",
  async () => {
    let releaseCalls =
      0;


    await assert.rejects(
      runHsppPostPositiveRevalidationUnsuitabilityAssessment(
        baseInput(),
        {
          acquireLease:
            async () =>
              makeAcquired(),

          releaseLease:
            async () => {
              releaseCalls +=
                1;

              throw new Error(
                "controlled release failure",
              );
            },

          selectRevalidation:
            async () => {
              throw new Error(
                "controlled selection failure",
              );
            },

          persistUnsuitability:
            async () =>
              makeCheckpoint(),
        },
      ),
      /controlled selection failure/,
    );


    assert.equal(
      releaseCalls,
      1,
    );
  },
);


test(
  "persistence failure remains primary when release also fails",
  async () => {
    let releaseCalls =
      0;


    await assert.rejects(
      runHsppPostPositiveRevalidationUnsuitabilityAssessment(
        baseInput(),
        {
          acquireLease:
            async () =>
              makeAcquired(),

          releaseLease:
            async () => {
              releaseCalls +=
                1;

              throw new Error(
                "controlled release failure",
              );
            },

          selectRevalidation:
            async () =>
              makeSelection(
                "QUALIFYING_REVALIDATION_FOUND",
              ),

          persistUnsuitability:
            async () => {
              throw new Error(
                "controlled persistence failure",
              );
            },
        },
      ),
      /controlled persistence failure/,
    );


    assert.equal(
      releaseCalls,
      1,
    );
  },
);


test(
  "release failure after durable Q14v-v2 success is summarized without erasing checkpoint",
  async () => {
    const result =
      await runHsppPostPositiveRevalidationUnsuitabilityAssessment(
        baseInput(),
        {
          acquireLease:
            async () =>
              makeAcquired(),

          releaseLease:
            async () => {
              throw new Error(
                "controlled release failure",
              );
            },

          selectRevalidation:
            async () =>
              makeSelection(
                "QUALIFYING_REVALIDATION_FOUND",
              ),

          persistUnsuitability:
            async () =>
              makeCheckpoint(),
        },
      );


    assert.equal(
      result.branch,
      "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED",
    );

    assert.equal(
      result.checkpoint?.checkpointId,
      CHECKPOINT_ID,
    );

    assert.deepEqual(
      result.leaseRelease,
      {
        state:
          "ERROR",

        error:
          "controlled release failure",
      },
    );
  },
);


test(
  "acquired lease must preserve the exact caller-owned token before selection",
  async () => {
    let selectionCalls =
      0;

    let persistenceCalls =
      0;

    let releaseCalls =
      0;


    await assert.rejects(
      runHsppPostPositiveRevalidationUnsuitabilityAssessment(
        baseInput(),
        {
          acquireLease:
            async () =>
              makeAcquired(
                "99999999-9999-4999-8999-999999999999",
              ),

          releaseLease:
            async () => {
              releaseCalls +=
                1;

              return makeRelease();
            },

          selectRevalidation:
            async () => {
              selectionCalls +=
                1;

              return makeSelection(
                "QUALIFYING_REVALIDATION_FOUND",
              );
            },

          persistUnsuitability:
            async () => {
              persistenceCalls +=
                1;

              return makeCheckpoint();
            },
        },
      ),
      /did not preserve exact caller-owned authority/,
    );


    assert.equal(
      selectionCalls,
      0,
    );

    assert.equal(
      persistenceCalls,
      0,
    );

    assert.equal(
      releaseCalls,
      0,
    );
  },
);
