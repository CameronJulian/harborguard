import assert from "node:assert/strict";
import test from "node:test";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION,
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_EXPECTED_INTENT_VERSION,
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READER_VERSION,
  type HsppReconstructionExecutionIntentV2,
  type ReadHsppReconstructionExecutionIntentsV2Result,
} from "../lib/hspp/readHsppReconstructionExecutionIntentsV2";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_V2_RUNNER_VERSION,
  runHsppReconstructionExecutionIntentCycleV2,
  type HsppReconstructionExecutionIntentCycleV2Dependencies,
} from "../lib/hspp/runHsppReconstructionExecutionIntentCycleV2";


const supabase =
  {} as SupabaseClient;


type ClaimedIntent =
  Extract<
    HsppReconstructionExecutionIntentV2,
    {
      persistenceState:
        "CLAIMED_NOT_PERSISTED";
    }
  >;


function intent({
  intentId,
  childAssemblyId,
  selectionSource,
}: {
  intentId:
    string;

  childAssemblyId:
    string;

  selectionSource:
    "B07B_DISCOVERY" | "SCHEDULED_PAIR";
}): ClaimedIntent {
  const common = {
    intentId,

    organizationId:
      "10000000-0000-4000-8000-000000000001",

    childAssemblyId,

    selectedFirstEvidenceId:
      "30000000-0000-4000-8000-000000000001",

    selectedSecondEvidenceId:
      "40000000-0000-4000-8000-000000000001",

    historicalEvidenceId:
      "30000000-0000-4000-8000-000000000001",

    historicalEvidenceIntegrityFingerprint:
      "a".repeat(64),

    replacementEvidenceId:
      "40000000-0000-4000-8000-000000000001",

    replacementEvidenceIntegrityFingerprint:
      "b".repeat(64),

    reservoirEligibilityPolicyVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_B06A_VERSION,

    reevaluationPolicyVersion:
      "hspp-reevaluation-v1",

    membershipPolicyVersion:
      "hspp-membership-v1",

    reconstructionPolicyVersion:
      "hspp-reconstruction-v1",

    reconstructionReason:
      "TEST",

    intentVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_EXPECTED_INTENT_VERSION,

    createdAt:
      "2026-09-02T12:00:00.000Z",

    persistenceState:
      "CLAIMED_NOT_PERSISTED" as const,

    reconstructionId:
      null,

    parentAssemblyId:
      null,

    assemblyState:
      null,

    sealedAt:
      null,
  } as const;


  if (
    selectionSource ===
    "B07B_DISCOVERY"
  ) {
    return {
      ...common,

      selectionSource:
        "B07B_DISCOVERY",

      discoveryPolicyVersion:
        "hspp-reservoir-discovery-v1",

      pairSchedulingVersion:
        null,
    };
  }


  return {
    ...common,

    selectionSource:
      "SCHEDULED_PAIR",

    discoveryPolicyVersion:
      null,

    pairSchedulingVersion:
      "hspp-reservoir-pair-scheduling-v1",
  };
}


function page({
  intents,
  nextCursor = null,
  limit = 10,
}: {
  intents:
    HsppReconstructionExecutionIntentV2[];

  nextCursor?:
    ReadHsppReconstructionExecutionIntentsV2Result["nextCursor"];

  limit?:
    number;
}): ReadHsppReconstructionExecutionIntentsV2Result {
  return {
    readerVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READER_VERSION,

    organizationId:
      "10000000-0000-4000-8000-000000000001",

    limit,

    cursor:
      null,

    persistenceStateFilter:
      "CLAIMED_NOT_PERSISTED",

    intents,

    nextCursor,
  };
}


function harness({
  readPage,
  failIntentIds = [],
}: {
  readPage:
    ReadHsppReconstructionExecutionIntentsV2Result;

  failIntentIds?:
    string[];
}) {
  const calls = {
    read:
      [] as unknown[],

    run:
      [] as HsppReconstructionExecutionIntentV2[],
  };


  const dependencies = {
    readIntents:
      async (input: unknown) => {
        calls.read.push(
          input,
        );

        return readPage;
      },

    runIntent:
      async ({
        intent,
      }: {
        supabase:
          SupabaseClient;

        intent:
          HsppReconstructionExecutionIntentV2;
      }) => {
        calls.run.push(
          intent,
        );

        if (
          failIntentIds.includes(
            intent.intentId,
          )
        ) {
          throw new Error(
            `intent failed: ${intent.intentId}`,
          );
        }

        return {
          runnerVersion:
            "hspp-reconstruction-execution-intent-v2-runner-v1",

          intentId:
            intent.intentId,

          organizationId:
            intent.organizationId,

          childAssemblyId:
            intent.childAssemblyId,

          selectedFirstEvidenceId:
            intent.selectedFirstEvidenceId,

          selectedSecondEvidenceId:
            intent.selectedSecondEvidenceId,

          historicalEvidenceId:
            intent.historicalEvidenceId,

          replacementEvidenceId:
            intent.replacementEvidenceId,

          selectionSource:
            intent.selectionSource,

          discoveryPolicyVersion:
            intent.discoveryPolicyVersion,

          pairSchedulingVersion:
            intent.pairSchedulingVersion,

          reservoirEligibilityPolicyVersion:
            intent.reservoirEligibilityPolicyVersion,

          reevaluationPolicyVersion:
            intent.reevaluationPolicyVersion,

          membershipPolicyVersion:
            intent.membershipPolicyVersion,

          reconstructionPolicyVersion:
            intent.reconstructionPolicyVersion,

          reconstructionReason:
            intent.reconstructionReason,

          initialPersistenceState:
            intent.persistenceState,

          state:
            "RECONSTRUCTION_RECOVERED",

          parentAssemblyId:
            "60000000-0000-4000-8000-000000000001",

          reconstructionId:
            "70000000-0000-4000-8000-000000000001",

          assemblyState:
            "SEALED",

          idempotentRecovery:
            null,

          memberCount:
            2,
        };
      },
  } as unknown as HsppReconstructionExecutionIntentCycleV2Dependencies;


  return {
    calls,
    dependencies,
  };
}


test(
  "E3E2 always reads one CLAIMED_NOT_PERSISTED page",
  async () => {
    const h =
      harness({
        readPage:
          page({
            intents:
              [],
            limit:
              17,
          }),
      });

    const result =
      await runHsppReconstructionExecutionIntentCycleV2(
        {
          supabase,

          organizationId:
            "10000000-0000-4000-8000-000000000001",

          limit:
            17,
        },
        h.dependencies,
      );

    assert.equal(
      h.calls.read.length,
      1,
    );

    assert.deepEqual(
      h.calls.read[0],
      {
        supabase,

        organizationId:
          "10000000-0000-4000-8000-000000000001",

        limit:
          17,

        persistenceStateFilter:
          "CLAIMED_NOT_PERSISTED",
      },
    );

    assert.equal(
      result.state,
      "NO_PENDING_SUCCESSOR_INTENTS",
    );

    assert.equal(
      result.selectedCount,
      0,
    );

    assert.equal(
      result.hasMore,
      false,
    );
  },
);


test(
  "E3E2 executes B07B and SCHEDULED_PAIR intents sequentially",
  async () => {
    const first =
      intent({
        intentId:
          "50000000-0000-4000-8000-000000000001",

        childAssemblyId:
          "20000000-0000-4000-8000-000000000001",

        selectionSource:
          "B07B_DISCOVERY",
      });

    const second =
      intent({
        intentId:
          "50000000-0000-4000-8000-000000000002",

        childAssemblyId:
          "20000000-0000-4000-8000-000000000002",

        selectionSource:
          "SCHEDULED_PAIR",
      });

    const h =
      harness({
        readPage:
          page({
            intents:
              [
                first,
                second,
              ],
          }),
      });

    const result =
      await runHsppReconstructionExecutionIntentCycleV2(
        {
          supabase,

          organizationId:
            first.organizationId,
        },
        h.dependencies,
      );

    assert.deepEqual(
      h.calls.run.map(
        item =>
          item.intentId,
      ),
      [
        first.intentId,
        second.intentId,
      ],
    );

    assert.equal(
      result.state,
      "SUCCESSOR_CYCLE_COMPLETED",
    );

    assert.equal(
      result.selectedCount,
      2,
    );

    assert.equal(
      result.succeededCount,
      2,
    );

    assert.equal(
      result.failedCount,
      0,
    );

    assert.deepEqual(
      result.outcomes.map(
        outcome =>
          outcome.selectionSource,
      ),
      [
        "B07B_DISCOVERY",
        "SCHEDULED_PAIR",
      ],
    );
  },
);


test(
  "E3E2 isolates one failed intent and continues later work",
  async () => {
    const first =
      intent({
        intentId:
          "50000000-0000-4000-8000-000000000011",

        childAssemblyId:
          "20000000-0000-4000-8000-000000000011",

        selectionSource:
          "B07B_DISCOVERY",
      });

    const failed =
      intent({
        intentId:
          "50000000-0000-4000-8000-000000000012",

        childAssemblyId:
          "20000000-0000-4000-8000-000000000012",

        selectionSource:
          "SCHEDULED_PAIR",
      });

    const third =
      intent({
        intentId:
          "50000000-0000-4000-8000-000000000013",

        childAssemblyId:
          "20000000-0000-4000-8000-000000000013",

        selectionSource:
          "B07B_DISCOVERY",
      });

    const h =
      harness({
        readPage:
          page({
            intents:
              [
                first,
                failed,
                third,
              ],
          }),

        failIntentIds:
          [
            failed.intentId,
          ],
      });

    const result =
      await runHsppReconstructionExecutionIntentCycleV2(
        {
          supabase,

          organizationId:
            first.organizationId,
        },
        h.dependencies,
      );

    assert.deepEqual(
      h.calls.run.map(
        item =>
          item.intentId,
      ),
      [
        first.intentId,
        failed.intentId,
        third.intentId,
      ],
    );

    assert.equal(
      result.selectedCount,
      3,
    );

    assert.equal(
      result.succeededCount,
      2,
    );

    assert.equal(
      result.failedCount,
      1,
    );

    assert.equal(
      result.outcomes[1]?.success,
      false,
    );

    assert.match(
      result.outcomes[1]?.errorMessage ?? "",
      /intent failed/,
    );
  },
);


test(
  "E3E2 exposes hasMore but does not fetch another page",
  async () => {
    const selected =
      intent({
        intentId:
          "50000000-0000-4000-8000-000000000021",

        childAssemblyId:
          "20000000-0000-4000-8000-000000000021",

        selectionSource:
          "SCHEDULED_PAIR",
      });

    const h =
      harness({
        readPage:
          page({
            intents:
              [
                selected,
              ],

            nextCursor: {
              createdAt:
                "2026-09-02T11:59:59.000Z",

              intentId:
                "50000000-0000-4000-8000-000000000020",
            },
          }),
      });

    const result =
      await runHsppReconstructionExecutionIntentCycleV2(
        {
          supabase,

          organizationId:
            selected.organizationId,
        },
        h.dependencies,
      );

    assert.equal(
      h.calls.read.length,
      1,
    );

    assert.equal(
      result.hasMore,
      true,
    );
  },
);


test(
  "E3E2 reports the certified successor cycle version",
  async () => {
    const h =
      harness({
        readPage:
          page({
            intents:
              [],
          }),
      });

    const result =
      await runHsppReconstructionExecutionIntentCycleV2(
        {
          supabase,

          organizationId:
            "10000000-0000-4000-8000-000000000001",
        },
        h.dependencies,
      );

    assert.equal(
      result.runnerVersion,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_V2_RUNNER_VERSION,
    );
  },
);