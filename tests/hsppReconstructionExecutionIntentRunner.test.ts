import assert from "node:assert/strict";
import test from "node:test";

import type {
  HsppReconstructionExecutionIntent,
} from "../lib/hspp/readHsppReconstructionExecutionIntents";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,
} from "../lib/hspp/claimHsppReconstructionExecutionIntent";

import {
  HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,
} from "../lib/hspp/readHsppReservoirCandidates";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_RUNNER_VERSION,
  runHsppReconstructionExecutionIntent,
} from "../lib/hspp/runHsppReconstructionExecutionIntent";


const ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000001";

const CHILD_ID =
  "20000000-0000-4000-8000-000000000001";

const HISTORICAL_ID =
  "30000000-0000-4000-8000-000000000001";

const REPLACEMENT_ID =
  "30000000-0000-4000-8000-000000000002";

const OTHER_ID =
  "30000000-0000-4000-8000-000000000003";

const PARENT_ID =
  "40000000-0000-4000-8000-000000000001";

const RECONSTRUCTION_ID =
  "50000000-0000-4000-8000-000000000001";

const HISTORICAL_FP =
  "a".repeat(64);

const REPLACEMENT_FP =
  "b".repeat(64);


type RpcCall = {
  name: string;

  args:
    Record<string, unknown>;
};


function makeRecoveryOnlySupabase(
  recoveryResponses:
    unknown[][] =
      [
        [],
      ],
) {
  const calls:
    RpcCall[] =
      [];

  let recoveryIndex =
    0;

  const client = {
    rpc: async (
      name: string,
      args: Record<string, unknown>,
    ) => {
      calls.push({
        name,
        args,
      });

      if (
        name ===
        "read_hspp_evidence_assembly_reconstruction_recovery"
      ) {
        const data =
          recoveryResponses[
            recoveryIndex
          ] ?? [];

        recoveryIndex +=
          1;

        return {
          data,
          error:
            null,
        };
      }

      throw new Error(
        `Unexpected RPC ${name}`,
      );
    },
  };

  return {
    client:
      client as any,

    calls,
  };
}


function claimedIntent(
  overrides:
    Record<string, unknown> =
      {},
): HsppReconstructionExecutionIntent {
  return {
    intentId:
      "intent-1",

    organizationId:
      ORGANIZATION_ID,

    childAssemblyId:
      CHILD_ID,

    selectedFirstEvidenceId:
      HISTORICAL_ID,

    selectedSecondEvidenceId:
      REPLACEMENT_ID,

    historicalEvidenceId:
      HISTORICAL_ID,

    historicalEvidenceIntegrityFingerprint:
      HISTORICAL_FP,

    replacementEvidenceId:
      REPLACEMENT_ID,

    replacementEvidenceIntegrityFingerprint:
      REPLACEMENT_FP,

    discoveryPolicyVersion:
      HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,

    reevaluationPolicyVersion:
      "hspp-reservoir-reevaluation-v1",

    membershipPolicyVersion:
      "hspp-assembly-membership-v1",

    reconstructionPolicyVersion:
      "hspp-reconstruction-policy-v1",

    reconstructionReason:
      "REPLACE_UNSUITABLE_MEMBER",

    intentVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,

    createdAt:
      "2026-08-24T08:00:00.123456+00:00",

    persistenceState:
      "CLAIMED_NOT_PERSISTED",

    reconstructionId:
      null,

    parentAssemblyId:
      null,

    assemblyState:
      null,

    sealedAt:
      null,

    ...overrides,
  } as unknown as
    HsppReconstructionExecutionIntent;
}


function persistedIntent(
  overrides:
    Record<string, unknown> =
      {},
): HsppReconstructionExecutionIntent {
  return claimedIntent({
    persistenceState:
      "RECONSTRUCTION_PERSISTED",

    reconstructionId:
      RECONSTRUCTION_ID,

    parentAssemblyId:
      PARENT_ID,

    assemblyState:
      "OPEN",

    sealedAt:
      null,

    ...overrides,
  });
}


test(
  "Q14ag31M exposes the closed isolated runner version",
  () => {
    assert.equal(
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_RUNNER_VERSION,
      "hspp-reconstruction-execution-intent-runner-v1",
    );
  },
);


test(
  "Q14ag31M rejects a durable pair that does not exactly contain historical plus replacement identity before any external read",
  async () => {
    const mock =
      makeRecoveryOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          intent:
            claimedIntent({
              selectedSecondEvidenceId:
                OTHER_ID,
            }),
        }),
      /selected evidence pair/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag31M rejects a stale execution-intent version before any external read",
  async () => {
    const mock =
      makeRecoveryOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          intent:
            claimedIntent({
              intentVersion:
                "hspp-reconstruction-execution-intent-v0",
            }),
        }),
      /intent version/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag31M fails closed when a durable RECONSTRUCTION_PERSISTED intent has no recoverable canonical child",
  async () => {
    const mock =
      makeRecoveryOnlySupabase([
        [],
      ]);

    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          intent:
            persistedIntent(),
        }),
      /claims a persisted reconstruction.*NOT_FOUND/,
    );

    assert.equal(
      mock.calls.length,
      1,
    );

    assert.equal(
      mock.calls[0].name,
      "read_hspp_evidence_assembly_reconstruction_recovery",
    );

    assert.deepEqual(
      mock.calls[0].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_child_assembly_id:
          CHILD_ID,
      },
    );
  },
);


test(
  "Q14ag31M recovery-preflights the canonical child before exact replacement hydration",
  async () => {
    const mock =
      makeRecoveryOnlySupabase([
        [],
      ]);

    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          intent:
            claimedIntent({
              discoveryPolicyVersion:
                "hspp-reservoir-discovery-v0",
            }),
        }),
      /discovery policy/,
    );

    /*
     * The stale Q14ag31H policy is rejected before any replacement
     * evidence DB access, so the one observed call must be Q14ag22B.
     */
    assert.equal(
      mock.calls.length,
      1,
    );

    assert.equal(
      mock.calls[0].name,
      "read_hspp_evidence_assembly_reconstruction_recovery",
    );
  },
);


test(
  "Q14ag31M rejects contradictory persisted OPEN plus sealedAt before recovery",
  async () => {
    const mock =
      makeRecoveryOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          intent:
            persistedIntent({
              sealedAt:
                "2026-08-24T08:10:00+00:00",
            }),
        }),
      /OPEN durable reconstruction intent must not record sealedAt/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag31M rejects historical and replacement identity equality before external reads",
  async () => {
    const mock =
      makeRecoveryOnlySupabase();

    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          intent:
            claimedIntent({
              replacementEvidenceId:
                HISTORICAL_ID,

              selectedSecondEvidenceId:
                HISTORICAL_ID,
            }),
        }),
      /must be distinct/,
    );

    assert.equal(
      mock.calls.length,
      0,
    );
  },
);