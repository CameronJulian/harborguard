import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,
} from "../lib/hspp/claimHsppReconstructionExecutionIntent";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_RUNNER_VERSION,
  runHsppReconstructionExecutionIntentCycle,
} from "../lib/hspp/runHsppReconstructionExecutionIntentCycle";


const ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000001";

const INTENT_1 =
  "20000000-0000-4000-8000-000000000001";

const INTENT_2 =
  "20000000-0000-4000-8000-000000000002";

const CHILD_1 =
  "30000000-0000-4000-8000-000000000001";

const CHILD_2 =
  "30000000-0000-4000-8000-000000000002";

const HISTORICAL_1 =
  "40000000-0000-4000-8000-000000000001";

const HISTORICAL_2 =
  "40000000-0000-4000-8000-000000000002";

const REPLACEMENT_1 =
  "50000000-0000-4000-8000-000000000001";

const REPLACEMENT_2 =
  "50000000-0000-4000-8000-000000000002";

const HISTORICAL_FP_1 =
  "a".repeat(64);

const HISTORICAL_FP_2 =
  "b".repeat(64);

const REPLACEMENT_FP_1 =
  "c".repeat(64);

const REPLACEMENT_FP_2 =
  "d".repeat(64);

const REEVALUATION_POLICY =
  "hspp-reservoir-reevaluation-v1";

const MEMBERSHIP_POLICY =
  "hspp-assembly-membership-v1";

const RECONSTRUCTION_POLICY =
  "hspp-reconstruction-policy-v1";

const RECONSTRUCTION_REASON =
  "REPLACE_UNSUITABLE_MEMBER";


type RpcCall = {
  name: string;
  args: unknown;
};


function claimedRow({
  intentId,
  childAssemblyId,
  historicalEvidenceId,
  historicalFingerprint,
  replacementEvidenceId,
  replacementFingerprint,
  createdAt,
}: {
  intentId: string;
  childAssemblyId: string;
  historicalEvidenceId: string;
  historicalFingerprint: string;
  replacementEvidenceId: string;
  replacementFingerprint: string;
  createdAt: string;
}) {
  return {
    intent_id:
      intentId,

    organization_id:
      ORGANIZATION_ID,

    child_assembly_id:
      childAssemblyId,

    selected_first_evidence_id:
      historicalEvidenceId,

    selected_second_evidence_id:
      replacementEvidenceId,

    historical_evidence_id:
      historicalEvidenceId,

    historical_evidence_integrity_fingerprint:
      historicalFingerprint,

    replacement_evidence_id:
      replacementEvidenceId,

    replacement_evidence_integrity_fingerprint:
      replacementFingerprint,

    /*
     * Deliberately stale for this cycle-runner test.
     *
     * Q14ag31M recovery-preflights first, then rejects this policy before
     * replacement hydration can issue another DB call. This gives the cycle
     * a deterministic per-intent failure with exactly one runner-side RPC.
     */
    discovery_policy_version:
      "hspp-reservoir-discovery-v0",

    reevaluation_policy_version:
      REEVALUATION_POLICY,

    membership_policy_version:
      MEMBERSHIP_POLICY,

    reconstruction_policy_version:
      RECONSTRUCTION_POLICY,

    reconstruction_reason:
      RECONSTRUCTION_REASON,

    intent_version:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,

    created_at:
      createdAt,

    persistence_state:
      "CLAIMED_NOT_PERSISTED",

    reconstruction_id:
      null,

    parent_assembly_id:
      null,

    assembly_state:
      null,

    sealed_at:
      null,
  };
}


function makeSupabase({
  readerRows,
}: {
  readerRows: unknown[];
}) {
  const calls:
    RpcCall[] =
      [];


  return {
    calls,

    client: {
      rpc: async (
        name: string,
        args: unknown,
      ) => {
        calls.push({
          name,
          args,
        });


        if (
          name ===
          "read_hspp_reconstruction_execution_intents"
        ) {
          return {
            data:
              readerRows,

            error:
              null,
          };
        }


        if (
          name ===
          "read_hspp_evidence_assembly_reconstruction_recovery"
        ) {
          return {
            data:
              [],

            error:
              null,
          };
        }


        throw new Error(
          `Unexpected RPC from isolated cycle test: ${name}`,
        );
      },
    } as any,
  };
}


test(
  "Q14ag31W exposes the isolated consumer-cycle version",
  () => {
    assert.equal(
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_RUNNER_VERSION,
      "hspp-reconstruction-execution-intent-cycle-runner-v1",
    );
  },
);


test(
  "Q14ag31W reads exactly one CLAIMED_NOT_PERSISTED page and returns NO_PENDING_INTENTS",
  async () => {
    const mock =
      makeSupabase({
        readerRows:
          [],
      });


    const result =
      await runHsppReconstructionExecutionIntentCycle({
        supabase:
          mock.client,

        organizationId:
          ORGANIZATION_ID,
      });


    assert.deepEqual(
      result,
      {
        runnerVersion:
          HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_RUNNER_VERSION,

        state:
          "NO_PENDING_INTENTS",

        organizationId:
          ORGANIZATION_ID,

        limit:
          100,

        selectedCount:
          0,

        succeededCount:
          0,

        failedCount:
          0,

        hasMore:
          false,

        outcomes:
          [],
      },
    );


    assert.equal(
      mock.calls.length,
      1,
    );


    assert.deepEqual(
      mock.calls[0],
      {
        name:
          "read_hspp_reconstruction_execution_intents",

        args: {
          p_organization_id:
            ORGANIZATION_ID,

          p_limit:
            100,

          p_before_created_at:
            null,

          p_before_intent_id:
            null,

          p_persistence_state:
            "CLAIMED_NOT_PERSISTED",
        },
      },
    );
  },
);


test(
  "Q14ag31W passes the bounded limit to the one durable reader call",
  async () => {
    const mock =
      makeSupabase({
        readerRows:
          [],
      });


    const result =
      await runHsppReconstructionExecutionIntentCycle({
        supabase:
          mock.client,

        organizationId:
          ORGANIZATION_ID,

        limit:
          7,
      });


    assert.equal(
      result.limit,
      7,
    );


    assert.equal(
      mock.calls.length,
      1,
    );


    assert.deepEqual(
      mock.calls[0].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_limit:
          7,

        p_before_created_at:
          null,

        p_before_intent_id:
          null,

        p_persistence_state:
          "CLAIMED_NOT_PERSISTED",
      },
    );
  },
);


test(
  "Q14ag31W isolates one failed intent and continues sequentially to the next intent",
  async () => {
    const mock =
      makeSupabase({
        readerRows: [
          claimedRow({
            intentId:
              INTENT_1,

            childAssemblyId:
              CHILD_1,

            historicalEvidenceId:
              HISTORICAL_1,

            historicalFingerprint:
              HISTORICAL_FP_1,

            replacementEvidenceId:
              REPLACEMENT_1,

            replacementFingerprint:
              REPLACEMENT_FP_1,

            createdAt:
              "2026-08-24T09:02:00.000Z",
          }),

          claimedRow({
            intentId:
              INTENT_2,

            childAssemblyId:
              CHILD_2,

            historicalEvidenceId:
              HISTORICAL_2,

            historicalFingerprint:
              HISTORICAL_FP_2,

            replacementEvidenceId:
              REPLACEMENT_2,

            replacementFingerprint:
              REPLACEMENT_FP_2,

            createdAt:
              "2026-08-24T09:01:00.000Z",
          }),
        ],
      });


    const result =
      await runHsppReconstructionExecutionIntentCycle({
        supabase:
          mock.client,

        organizationId:
          ORGANIZATION_ID,

        limit:
          2,
      });


    assert.equal(
      result.state,
      "CYCLE_COMPLETED",
    );


    if (
      result.state !==
      "CYCLE_COMPLETED"
    ) {
      throw new Error(
        "Expected completed cycle.",
      );
    }


    assert.equal(
      result.selectedCount,
      2,
    );


    assert.equal(
      result.succeededCount,
      0,
    );


    assert.equal(
      result.failedCount,
      2,
    );


    assert.equal(
      result.hasMore,
      true,
    );


    assert.deepEqual(
      result.outcomes.map(
        (outcome) => ({
          intentId:
            outcome.intentId,

          childAssemblyId:
            outcome.childAssemblyId,

          success:
            outcome.success,
        }),
      ),
      [
        {
          intentId:
            INTENT_1,

          childAssemblyId:
            CHILD_1,

          success:
            false,
        },

        {
          intentId:
            INTENT_2,

          childAssemblyId:
            CHILD_2,

          success:
            false,
        },
      ],
    );


    for (
      const outcome of
      result.outcomes
    ) {
      assert.equal(
        outcome.success,
        false,
      );


      if (outcome.success) {
        throw new Error(
          "Expected a deterministic failed test outcome.",
        );
      }


      assert.equal(
        outcome.result,
        null,
      );


      assert.match(
        outcome.errorMessage,
        /discovery policy/i,
      );
    }


    /*
     * One reader RPC, then exactly one Q14ag31M recovery preflight for each
     * intent. The second recovery call proves the first failure did not stop
     * later work in the same already-read page.
     */
    assert.equal(
      mock.calls.length,
      3,
    );


    assert.equal(
      mock.calls[0].name,
      "read_hspp_reconstruction_execution_intents",
    );


    assert.deepEqual(
      mock.calls[1],
      {
        name:
          "read_hspp_evidence_assembly_reconstruction_recovery",

        args: {
          p_organization_id:
            ORGANIZATION_ID,

          p_child_assembly_id:
            CHILD_1,
        },
      },
    );


    assert.deepEqual(
      mock.calls[2],
      {
        name:
          "read_hspp_evidence_assembly_reconstruction_recovery",

        args: {
          p_organization_id:
            ORGANIZATION_ID,

          p_child_assembly_id:
            CHILD_2,
        },
      },
    );
  },
);


test(
  "Q14ag31W lets Q14ag31F reject an invalid cycle limit before any RPC",
  async () => {
    const mock =
      makeSupabase({
        readerRows:
          [],
      });


    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntentCycle({
          supabase:
            mock.client,

          organizationId:
            ORGANIZATION_ID,

          limit:
            101,
        }),
      /limit must be an integer between 1 and 100/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);
