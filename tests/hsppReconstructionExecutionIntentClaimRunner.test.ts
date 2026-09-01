import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RPC,
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,
} from "../lib/hspp/claimHsppReconstructionExecutionIntent";

import type {
  RunHsppReservoirReevaluationResult,
} from "../lib/hspp/runHsppReservoirReevaluation";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RUNNER_VERSION,
  runHsppReconstructionExecutionIntentClaim,
} from "../lib/hspp/runHsppReconstructionExecutionIntentClaim";


const ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000001";

const PROPOSED_CHILD_ID =
  "20000000-0000-4000-8000-000000000001";

const RECOVERED_CHILD_ID =
  "20000000-0000-4000-8000-000000000002";

const INTENT_ID =
  "30000000-0000-4000-8000-000000000001";

const HISTORICAL_ID =
  "40000000-0000-4000-8000-000000000001";

const REPLACEMENT_ID =
  "40000000-0000-4000-8000-000000000002";

const HISTORICAL_FINGERPRINT =
  "a".repeat(64);

const REPLACEMENT_FINGERPRINT =
  "b".repeat(64);

const DISCOVERY_POLICY =
  "hspp-reservoir-discovery-v1";

const REEVALUATION_POLICY =
  "hspp-reservoir-reevaluation-v1";

const MEMBERSHIP_POLICY =
  "hspp-assembly-membership-v1";

const RECONSTRUCTION_POLICY =
  "hspp-reconstruction-policy-v1";

const RECONSTRUCTION_REASON =
  "REPLACE_UNSUITABLE_MEMBER";

const CREATED_AT =
  "2026-08-24T09:00:00.000Z";


type RpcCall = {
  name: string;
  args: unknown;
};


function makeSupabase(
  data: unknown,
  error: unknown = null,
) {
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

        return {
          data,
          error,
        };
      },
    } as any,
  };
}


function noClaimSnapshot(): RunHsppReservoirReevaluationResult {
  return {
    runnerVersion:
      "hspp-reservoir-reevaluation-runner-v1",

    discoveryPolicyVersion:
      DISCOVERY_POLICY,

    reevaluationPolicyVersion:
      REEVALUATION_POLICY,

    organizationId:
      ORGANIZATION_ID,

    discovery: {
      organizationId:
        ORGANIZATION_ID,

      candidates:
        [],
    },

    reevaluation: {
      state:
        "NO_COUNTERPART",

      assemblyCandidates:
        [],
    },
  } as unknown as
    RunHsppReservoirReevaluationResult;
}


function claimSnapshot(): RunHsppReservoirReevaluationResult {
  return {
    runnerVersion:
      "hspp-reservoir-reevaluation-runner-v1",

    discoveryPolicyVersion:
      DISCOVERY_POLICY,

    reevaluationPolicyVersion:
      REEVALUATION_POLICY,

    organizationId:
      ORGANIZATION_ID,

    discovery: {
      organizationId:
        ORGANIZATION_ID,

      candidates: [
        {
          evidenceId:
            HISTORICAL_ID,

          membershipClassification:
            "HISTORICAL_NOT_CURRENT",

          reservoirDecision: {
            policyVersion:
              "hspp-reservoir-eligibility-v1",

            eligible:
              true,

            reason:
              "RESERVOIR_ELIGIBLE",
          },

          operationalRead: {
            evidence: {
              id:
                HISTORICAL_ID,

              integrityFingerprint:
                HISTORICAL_FINGERPRINT,
            },
          },
        },

        {
          evidenceId:
            REPLACEMENT_ID,

          membershipClassification:
            "NEVER_ASSEMBLED",

          reservoirDecision: {
            policyVersion:
              "hspp-reservoir-eligibility-v1",

            eligible:
              true,

            reason:
              "RESERVOIR_ELIGIBLE",
          },

          operationalRead: {
            evidence: {
              id:
                REPLACEMENT_ID,

              integrityFingerprint:
                REPLACEMENT_FINGERPRINT,
            },
          },
        },
      ],
    },

    reevaluation: {
      state:
        "ASSEMBLY_CANDIDATE",

      assemblyCandidates: [
        {
          firstEvidenceId:
            HISTORICAL_ID,

          secondEvidenceId:
            REPLACEMENT_ID,

          membershipDecision: {
            eligible:
              true,

            policyVersion:
              MEMBERSHIP_POLICY,
          },
        },
      ],
    },
  } as unknown as
    RunHsppReservoirReevaluationResult;
}


function claimRow(
  {
    childAssemblyId =
      PROPOSED_CHILD_ID,

    idempotentRecovery =
      false,
  }: {
    childAssemblyId?: string;
    idempotentRecovery?: boolean;
  } = {},
) {
  return {
    intent_id:
      INTENT_ID,

    organization_id:
      ORGANIZATION_ID,

    child_assembly_id:
      childAssemblyId,

    selected_first_evidence_id:
      HISTORICAL_ID,

    selected_second_evidence_id:
      REPLACEMENT_ID,

    historical_evidence_id:
      HISTORICAL_ID,

    historical_evidence_integrity_fingerprint:
      HISTORICAL_FINGERPRINT,

    replacement_evidence_id:
      REPLACEMENT_ID,

    replacement_evidence_integrity_fingerprint:
      REPLACEMENT_FINGERPRINT,

    discovery_policy_version:
      DISCOVERY_POLICY,

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
      CREATED_AT,

    idempotent_recovery:
      idempotentRecovery,
  };
}


function request(
  supabase: any,
  reevaluationResult:
    RunHsppReservoirReevaluationResult =
      claimSnapshot(),
) {
  return {
    supabase,

    organizationId:
      ORGANIZATION_ID,

    reevaluationResult,

    proposedChildAssemblyId:
      PROPOSED_CHILD_ID,

    reconstructionPolicyVersion:
      RECONSTRUCTION_POLICY,

    reconstructionReason:
      RECONSTRUCTION_REASON,
  };
}


test(
  "Q14ag31U exposes the isolated producer runner version",
  () => {
    assert.equal(
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RUNNER_VERSION,
      "hspp-reconstruction-execution-intent-claim-runner-v1",
    );
  },
);


test(
  "Q14ag31U returns no claim with zero RPC calls when Q14ag31S finds no reconstruction material",
  async () => {
    const mock =
      makeSupabase(
        null,
      );


    const result =
      await runHsppReconstructionExecutionIntentClaim(
        request(
          mock.client,
          noClaimSnapshot(),
        ),
      );


    assert.deepEqual(
      result,
      {
        runnerVersion:
          HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RUNNER_VERSION,

        state:
          "NO_RECONSTRUCTION_CLAIM",

        organizationId:
          ORGANIZATION_ID,

        claim:
          null,
      },
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag31U maps exact Q14ag31S claim material into exactly one Q14ag31B durable claim",
  async () => {
    const mock =
      makeSupabase([
        claimRow(),
      ]);


    const result =
      await runHsppReconstructionExecutionIntentClaim(
        request(
          mock.client,
        ),
      );


    assert.equal(
      mock.calls.length,
      1,
    );


    assert.equal(
      mock.calls[0].name,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RPC,
    );


    assert.deepEqual(
      mock.calls[0].args,
      {
        p_organization_id:
          ORGANIZATION_ID,

        p_proposed_child_assembly_id:
          PROPOSED_CHILD_ID,

        p_selected_first_evidence_id:
          HISTORICAL_ID,

        p_selected_second_evidence_id:
          REPLACEMENT_ID,

        p_historical_evidence_id:
          HISTORICAL_ID,

        p_historical_evidence_integrity_fingerprint:
          HISTORICAL_FINGERPRINT,

        p_replacement_evidence_id:
          REPLACEMENT_ID,

        p_replacement_evidence_integrity_fingerprint:
          REPLACEMENT_FINGERPRINT,

        p_discovery_policy_version:
          DISCOVERY_POLICY,

        p_reevaluation_policy_version:
          REEVALUATION_POLICY,

        p_membership_policy_version:
          MEMBERSHIP_POLICY,

        p_reconstruction_policy_version:
          RECONSTRUCTION_POLICY,

        p_reconstruction_reason:
          RECONSTRUCTION_REASON,
      },
    );


    assert.equal(
      result.state,
      "RECONSTRUCTION_INTENT_CLAIMED",
    );


    if (
      result.state !==
      "RECONSTRUCTION_INTENT_CLAIMED"
    ) {
      throw new Error(
        "Expected a claimed durable intent.",
      );
    }


    assert.equal(
      result.claim.childAssemblyId,
      PROPOSED_CHILD_ID,
    );


    assert.equal(
      result.claim.proposedChildAssemblyId,
      PROPOSED_CHILD_ID,
    );


    assert.equal(
      result.claim.idempotentRecovery,
      false,
    );
  },
);


test(
  "Q14ag31U preserves the database-returned canonical child on idempotent recovery",
  async () => {
    const mock =
      makeSupabase([
        claimRow({
          childAssemblyId:
            RECOVERED_CHILD_ID,

          idempotentRecovery:
            true,
        }),
      ]);


    const result =
      await runHsppReconstructionExecutionIntentClaim(
        request(
          mock.client,
        ),
      );


    assert.equal(
      mock.calls.length,
      1,
    );


    assert.equal(
      result.state,
      "RECONSTRUCTION_INTENT_CLAIMED",
    );


    if (
      result.state !==
      "RECONSTRUCTION_INTENT_CLAIMED"
    ) {
      throw new Error(
        "Expected an idempotently recovered durable claim.",
      );
    }


    assert.equal(
      result.claim.proposedChildAssemblyId,
      PROPOSED_CHILD_ID,
    );


    assert.equal(
      result.claim.childAssemblyId,
      RECOVERED_CHILD_ID,
    );


    assert.equal(
      result.claim.idempotentRecovery,
      true,
    );


    assert.notEqual(
      result.claim.childAssemblyId,
      result.claim.proposedChildAssemblyId,
    );
  },
);


test(
  "Q14ag31U propagates the sole durable-claim error without fallback mutation",
  async () => {
    const expected =
      new Error(
        "durable claim failed",
      );


    const mock =
      makeSupabase(
        null,
        expected,
      );


    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntentClaim(
          request(
            mock.client,
          ),
        ),
      (error) =>
        error ===
        expected,
    );


    assert.equal(
      mock.calls.length,
      1,
    );
  },
);
