import assert from "node:assert/strict";
import test from "node:test";

import {
  runHsppScheduledPairReconstructionCycle,
} from "../lib/hspp/runHsppScheduledPairReconstructionCycle";

import type {
  CompareAndSwapHsppReservoirPairScanStateResult,
} from "../lib/hspp/compareAndSwapHsppReservoirPairScanState";

import type {
  RunHsppReservoirScheduledPairReevaluationResult,
} from "../lib/hspp/runHsppReservoirScheduledPairReevaluation";

import type {
  RunHsppScheduledPairReconstructionExecutionIntentClaimV2Result,
} from "../lib/hspp/runHsppScheduledPairReconstructionExecutionIntentClaimV2";


const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const FIRST_ID =
  "22222222-2222-4222-8222-222222222222";

const SECOND_ID =
  "33333333-3333-4333-8333-333333333333";

const CHILD_ID =
  "44444444-4444-4444-8444-444444444444";


function scheduledResult(
  proposedCursor:
    {
      firstEvidenceId: string;
      secondEvidenceId: string;
    } | null,
): RunHsppReservoirScheduledPairReevaluationResult {
  return {
    runnerVersion:
      "hspp-reservoir-scheduled-pair-reevaluation-runner-v1",

    pairPage: {
      schedulingVersion:
        "hspp-reservoir-pair-scheduling-v1",

      organizationId:
        ORGANIZATION_ID,

      pairs:
        proposedCursor === null
          ? []
          : [
              {
                ordinal:
                  1,

                firstEvidenceId:
                  FIRST_ID,

                secondEvidenceId:
                  SECOND_ID,
              },
            ],

      expectedCursor:
        proposedCursor === null
          ? null
          : {
              firstEvidenceId:
                "55555555-5555-4555-8555-555555555555",

              secondEvidenceId:
                "66666666-6666-4666-8666-666666666666",
            },

      proposedCursor,
    },

    endpointEvidenceIds:
      [],

    eligibleEvidence:
      [],

    reevaluation: {
      policyVersion:
        "hspp-reservoir-reevaluation-v1",

      state:
        "NO_COUNTERPART",

      candidateCount:
        0,

      comparisonCount:
        0,

      comparisonLimit:
        100,

      evaluations:
        [],

      assemblyCandidates:
        [],
    },
  } as never;
}


function noClaim():
  RunHsppScheduledPairReconstructionExecutionIntentClaimV2Result {
  return {
    runnerVersion:
      "hspp-scheduled-pair-reconstruction-execution-intent-claim-v2-runner-v1",

    state:
      "NO_RECONSTRUCTION_CLAIM",

    organizationId:
      ORGANIZATION_ID,

    claim:
      null,
  };
}


function claimed():
  RunHsppScheduledPairReconstructionExecutionIntentClaimV2Result {
  return {
    runnerVersion:
      "hspp-scheduled-pair-reconstruction-execution-intent-claim-v2-runner-v1",

    state:
      "RECONSTRUCTION_INTENT_V2_CLAIMED",

    organizationId:
      ORGANIZATION_ID,

    claim: {
      organizationId:
        ORGANIZATION_ID,
    } as never,
  };
}


function casResult(
  status:
    CompareAndSwapHsppReservoirPairScanStateResult["status"] =
      "ADVANCED",
): CompareAndSwapHsppReservoirPairScanStateResult {
  return {
    status,

    stateVersion:
      "hspp-reservoir-pair-scheduling-v1",

    organizationId:
      ORGANIZATION_ID,

    currentCursor: {
      firstEvidenceId:
        FIRST_ID,

      secondEvidenceId:
        SECOND_ID,
    },

    previousCursor:
      null,

    createdAt:
      "2026-09-03T00:00:00.000Z",

    updatedAt:
      "2026-09-03T00:00:00.000Z",
  };
}


test(
  "Q14ag35I no reconstruction claim with non-null cursor still advances scheduling",
  async () => {
    const order:
      string[] = [];

    let casInput:
      unknown = null;


    const result =
      await runHsppScheduledPairReconstructionCycle({
        supabase:
          {} as never,

        organizationId:
          ORGANIZATION_ID,

        proposedChildAssemblyId:
          CHILD_ID,

        reconstructionPolicyVersion:
          "hspp-reconstruction-policy-v1",

        reconstructionReason:
          "REPLACE_UNSUITABLE_MEMBER",

        dependencies: {
          runScheduledPairReevaluation:
            async () => {
              order.push(
                "scheduled",
              );

              return scheduledResult({
                firstEvidenceId:
                  FIRST_ID,

                secondEvidenceId:
                  SECOND_ID,
              });
            },

          runScheduledPairProducer:
            async () => {
              order.push(
                "producer",
              );

              return noClaim();
            },

          compareAndSwapPairCursor:
            async (input) => {
              order.push(
                "cas",
              );

              casInput =
                input;

              return casResult();
            },
        },
      });


    assert.deepEqual(
      order,
      [
        "scheduled",
        "producer",
        "cas",
      ],
    );


    assert.equal(
      result.producer.state,
      "NO_RECONSTRUCTION_CLAIM",
    );


    assert.equal(
      result.cursor.state,
      "PAIR_CURSOR_CAS_COMPLETED",
    );


    assert.equal(
      result.cursor.cas.status,
      "ADVANCED",
    );


    assert.deepEqual(
      (
        casInput as {
          proposedCursor: unknown;
        }
      ).proposedCursor,
      {
        firstEvidenceId:
          FIRST_ID,

        secondEvidenceId:
          SECOND_ID,
      },
    );
  },
);


test(
  "Q14ag35I claimed reconstruction intent with non-null cursor advances scheduling",
  async () => {
    let casCount =
      0;


    const result =
      await runHsppScheduledPairReconstructionCycle({
        supabase:
          {} as never,

        organizationId:
          ORGANIZATION_ID,

        proposedChildAssemblyId:
          CHILD_ID,

        reconstructionPolicyVersion:
          "hspp-reconstruction-policy-v1",

        reconstructionReason:
          "REPLACE_UNSUITABLE_MEMBER",

        dependencies: {
          runScheduledPairReevaluation:
            async () =>
              scheduledResult({
                firstEvidenceId:
                  FIRST_ID,

                secondEvidenceId:
                  SECOND_ID,
              }),

          runScheduledPairProducer:
            async () =>
              claimed(),

          compareAndSwapPairCursor:
            async () => {
              casCount++;

              return casResult(
                "NO_CHANGE",
              );
            },
        },
      });


    assert.equal(
      result.producer.state,
      "RECONSTRUCTION_INTENT_V2_CLAIMED",
    );


    assert.equal(
      casCount,
      1,
    );


    assert.equal(
      result.cursor.state,
      "PAIR_CURSOR_CAS_COMPLETED",
    );


    assert.equal(
      result.cursor.cas.status,
      "NO_CHANGE",
    );
  },
);


test(
  "Q14ag35I producer failure prevents cursor advancement",
  async () => {
    let casCount =
      0;


    await assert.rejects(
      () =>
        runHsppScheduledPairReconstructionCycle({
          supabase:
            {} as never,

          organizationId:
            ORGANIZATION_ID,

          proposedChildAssemblyId:
            CHILD_ID,

          reconstructionPolicyVersion:
            "hspp-reconstruction-policy-v1",

          reconstructionReason:
            "REPLACE_UNSUITABLE_MEMBER",

          dependencies: {
            runScheduledPairReevaluation:
              async () =>
                scheduledResult({
                  firstEvidenceId:
                    FIRST_ID,

                  secondEvidenceId:
                    SECOND_ID,
                }),

            runScheduledPairProducer:
              async () => {
                throw new Error(
                  "producer failed",
                );
              },

            compareAndSwapPairCursor:
              async () => {
                casCount++;

                return casResult();
              },
          },
        }),

      /producer failed/,
    );


    assert.equal(
      casCount,
      0,
    );
  },
);


test(
  "Q14ag35I reevaluation failure prevents producer and cursor advancement",
  async () => {
    let producerCount =
      0;

    let casCount =
      0;


    await assert.rejects(
      () =>
        runHsppScheduledPairReconstructionCycle({
          supabase:
            {} as never,

          organizationId:
            ORGANIZATION_ID,

          proposedChildAssemblyId:
            CHILD_ID,

          reconstructionPolicyVersion:
            "hspp-reconstruction-policy-v1",

          reconstructionReason:
            "REPLACE_UNSUITABLE_MEMBER",

          dependencies: {
            runScheduledPairReevaluation:
              async () => {
                throw new Error(
                  "reevaluation failed",
                );
              },

            runScheduledPairProducer:
              async () => {
                producerCount++;

                return noClaim();
              },

            compareAndSwapPairCursor:
              async () => {
                casCount++;

                return casResult();
              },
          },
        }),

      /reevaluation failed/,
    );


    assert.equal(
      producerCount,
      0,
    );


    assert.equal(
      casCount,
      0,
    );
  },
);


test(
  "Q14ag35I null proposed cursor skips PAIR CAS after successful producer completion",
  async () => {
    let producerCount =
      0;

    let casCount =
      0;


    const result =
      await runHsppScheduledPairReconstructionCycle({
        supabase:
          {} as never,

        organizationId:
          ORGANIZATION_ID,

        proposedChildAssemblyId:
          CHILD_ID,

        reconstructionPolicyVersion:
          "hspp-reconstruction-policy-v1",

        reconstructionReason:
          "REPLACE_UNSUITABLE_MEMBER",

        dependencies: {
          runScheduledPairReevaluation:
            async () =>
              scheduledResult(
                null,
              ),

          runScheduledPairProducer:
            async () => {
              producerCount++;

              return noClaim();
            },

          compareAndSwapPairCursor:
            async () => {
              casCount++;

              return casResult();
            },
        },
      });


    assert.equal(
      producerCount,
      1,
    );


    assert.equal(
      casCount,
      0,
    );


    assert.equal(
      result.cursor.state,
      "SKIPPED_NO_PROPOSED_CURSOR",
    );


    assert.equal(
      result.cursor.cas,
      null,
    );
  },
);


test(
  "Q14ag35I STALE CAS is surfaced as scheduling contention, not converted to failure",
  async () => {
    const result =
      await runHsppScheduledPairReconstructionCycle({
        supabase:
          {} as never,

        organizationId:
          ORGANIZATION_ID,

        proposedChildAssemblyId:
          CHILD_ID,

        reconstructionPolicyVersion:
          "hspp-reconstruction-policy-v1",

        reconstructionReason:
          "REPLACE_UNSUITABLE_MEMBER",

        dependencies: {
          runScheduledPairReevaluation:
            async () =>
              scheduledResult({
                firstEvidenceId:
                  FIRST_ID,

                secondEvidenceId:
                  SECOND_ID,
              }),

          runScheduledPairProducer:
            async () =>
              noClaim(),

          compareAndSwapPairCursor:
            async () =>
              casResult(
                "STALE",
              ),
        },
      });


    assert.equal(
      result.cursor.state,
      "PAIR_CURSOR_CAS_COMPLETED",
    );


    assert.equal(
      result.cursor.cas.status,
      "STALE",
    );
  },
);