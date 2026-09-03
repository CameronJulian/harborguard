import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RPC,
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,
} from "../lib/hspp/claimHsppReconstructionExecutionIntent";

import {
  HSPP_RECONSTRUCTION_ACTIVATION_CYCLE_RUNNER_VERSION,
  runHsppReconstructionActivationCycle,
} from "../lib/hspp/runHsppReconstructionActivationCycle";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC,
} from "../lib/hspp/readHsppReconstructionExecutionIntentsV2";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RPC,
} from "../lib/hspp/claimHsppReconstructionExecutionIntentV2";

import type {
  RunHsppReservoirReevaluationResult,
} from "../lib/hspp/runHsppReservoirReevaluation";


const ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000001";

const OTHER_ORGANIZATION_ID =
  "10000000-0000-4000-8000-000000000002";

const PROPOSED_CHILD_ID =
  "20000000-0000-4000-8000-000000000001";

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
  "2026-08-24T12:00:00.000Z";


type RpcCall = {
  name: string;
  args: unknown;
};


type RpcHandler = (
  name: string,
  args: unknown,
  callIndex: number,
) => Promise<{
  data: unknown;
  error: unknown;
}>;


function makeSupabase(
  handler: RpcHandler,
  successorHandler?: RpcHandler,
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


        if (
          name ===
          HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC
        ) {
          if (successorHandler) {
            return successorHandler(
              name,
              args,
              calls.length - 1,
            );
          }

          return {
            data:
              [],

            error:
              null,
          };
        }

        return handler(
          name,
          args,
          calls.length - 1,
        );
      },
    } as any,
  };
}


function noClaimSnapshot(
  organizationId =
    ORGANIZATION_ID,
): RunHsppReservoirReevaluationResult {
  return {
    runnerVersion:
      "hspp-reservoir-reevaluation-runner-v1",

    discoveryPolicyVersion:
      DISCOVERY_POLICY,

    reevaluationPolicyVersion:
      REEVALUATION_POLICY,

    organizationId,

    discovery: {
      organizationId,

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


function claimRow() {
  return {
    intent_id:
      INTENT_ID,

    organization_id:
      ORGANIZATION_ID,

    child_assembly_id:
      PROPOSED_CHILD_ID,

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
      false,
  };
}


function successorClaimRow() {
  return {
    intent_id:
      INTENT_ID,

    organization_id:
      ORGANIZATION_ID,

    child_assembly_id:
      PROPOSED_CHILD_ID,

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

    selection_source:
      "B07B_DISCOVERY",

    discovery_policy_version:
      DISCOVERY_POLICY,

    pair_scheduling_version:
      null,

    reservoir_eligibility_policy_version:
      "hspp-reservoir-eligibility-v1",

    reevaluation_policy_version:
      REEVALUATION_POLICY,

    membership_policy_version:
      MEMBERSHIP_POLICY,

    reconstruction_policy_version:
      RECONSTRUCTION_POLICY,

    reconstruction_reason:
      RECONSTRUCTION_REASON,

    intent_version:
      "hspp-reconstruction-execution-intent-v1",

    created_at:
      CREATED_AT,

    idempotent_recovery:
      false,
  };
}


function request(
  supabase: any,
  reevaluationResult:
    RunHsppReservoirReevaluationResult,
) {
  return {
    supabase,

    organizationId:
      ORGANIZATION_ID,

    reevaluationResult,

    proposedChildAssemblyId:
      PROPOSED_CHILD_ID,
  };
}


test(
  "Q14ag32B exposes the dormant activation-cycle runner version",
  () => {
    assert.equal(
      HSPP_RECONSTRUCTION_ACTIVATION_CYCLE_RUNNER_VERSION,
      "hspp-reconstruction-activation-cycle-runner-v1",
    );
  },
);


test(
  "Q14ag32B preserves NO_RECONSTRUCTION_CLAIM and still drains the consumer",
  async () => {
    const mock =
      makeSupabase(
        async (
          name,
          _args,
        ) => {
          assert.equal(
            name,
            "read_hspp_reconstruction_execution_intents",
          );


          return {
            data:
              [],

            error:
              null,
          };
        },
      );


    const result =
      await runHsppReconstructionActivationCycle(
        request(
          mock.client,
          noClaimSnapshot(),
        ),
      );


    assert.equal(
      mock.calls.length,
      2,
    );



    assert.equal(
      mock.calls[0].name,
      "read_hspp_reconstruction_execution_intents",
    );

    assert.equal(
      mock.calls[1].name,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC,
    );
assert.equal(
      result.state,
      "ACTIVATION_CYCLE_COMPLETED",
    );


    assert.deepEqual(
      result.activationPolicy,
      {
        resolverVersion:
          "hspp-reconstruction-activation-policy-resolver-v1",

        reconstructionPolicyVersion:
          RECONSTRUCTION_POLICY,

        reconstructionReason:
          RECONSTRUCTION_REASON,
      },
    );


    assert.equal(
      result.producer.success,
      true,
    );


    if (!result.producer.success) {
      throw new Error(
        "Expected successful producer execution.",
      );
    }


    assert.equal(
      result.producer.result.state,
      "NO_RECONSTRUCTION_CLAIM",
    );


    assert.equal(
      result.consumer.state,
      "NO_PENDING_INTENTS",
    );



    assert.equal(
      result.successorConsumer.state,
      "NO_PENDING_SUCCESSOR_INTENTS",
    );

    assert.equal(
      result.successorConsumer.selectedCount,
      0,
    );
assert.equal(
      result.organizationId,
      ORGANIZATION_ID,
    );


    assert.equal(
      result.proposedChildAssemblyId,
      PROPOSED_CHILD_ID,
    );
  },
);


test(
  "Q14ag32B uses the canonical Q14ag31Z pair for one real producer claim before consumer drain",
  async () => {
    const mock =
      makeSupabase(
        async (
          name,
          _args,
        ) => {
          if (
            name ===
            HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RPC
          ) {
            return {
              data: [
                claimRow(),
              ],

              error:
                null,
            };
          }


          if (
            name ===
            HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RPC
          ) {
            return {
              data: [
                successorClaimRow(),
              ],

              error:
                null,
            };
          }


          if (
            name ===
            "read_hspp_reconstruction_execution_intents"
          ) {
            return {
              data:
                [],

              error:
                null,
            };
          }


          throw new Error(
            `Unexpected RPC in Q14ag32B test: ${name}`,
          );
        },
      );


    const result =
      await runHsppReconstructionActivationCycle(
        request(
          mock.client,
          claimSnapshot(),
        ),
      );


    assert.equal(
      mock.calls.length,
      4,
    );


    assert.equal(
      mock.calls[0].name,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RPC,
    );


    assert.equal(
      mock.calls[1].name,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RPC,
    );


    assert.equal(
      mock.calls[2].name,
      "read_hspp_reconstruction_execution_intents",
    );


    assert.equal(
      mock.calls[3].name,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC,
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


    assert.deepEqual(
      mock.calls[1].args,
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

        p_selection_source:
          "B07B_DISCOVERY",

        p_discovery_policy_version:
          DISCOVERY_POLICY,

        p_pair_scheduling_version:
          null,

        p_reservoir_eligibility_policy_version:
          "hspp-reservoir-eligibility-v1",

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
      result.producer.success,
      true,
    );


    if (!result.producer.success) {
      throw new Error(
        "Expected successful durable claim producer.",
      );
    }


    assert.equal(
      result.producer.result.state,
      "RECONSTRUCTION_INTENT_CLAIMED",
    );


    if (
      result.producer.result.state !==
      "RECONSTRUCTION_INTENT_CLAIMED"
    ) {
      throw new Error(
        "Expected claimed reconstruction intent.",
      );
    }


    assert.equal(
      result.producer.result.claim.reconstructionPolicyVersion,
      RECONSTRUCTION_POLICY,
    );


    assert.equal(
      result.producer.result.claim.reconstructionReason,
      RECONSTRUCTION_REASON,
    );


    assert.equal(
      result.successorProducer.success,
      true,
    );


    if (!result.successorProducer.success) {
      throw new Error(
        "Expected successful successor durable claim producer.",
      );
    }


    assert.equal(
      result.successorProducer.result.state,
      "RECONSTRUCTION_INTENT_V2_CLAIMED",
    );


    if (
      result.successorProducer.result.state !==
      "RECONSTRUCTION_INTENT_V2_CLAIMED"
    ) {
      throw new Error(
        "Expected claimed successor reconstruction intent.",
      );
    }


    assert.equal(
      result.successorProducer.result.claim.selectionSource,
      "B07B_DISCOVERY",
    );


    assert.equal(
      result.successorProducer.result.claim.discoveryPolicyVersion,
      DISCOVERY_POLICY,
    );


    assert.equal(
      result.successorProducer.result.claim.pairSchedulingVersion,
      null,
    );


    assert.equal(
      result.successorProducer.result.claim.reservoirEligibilityPolicyVersion,
      "hspp-reservoir-eligibility-v1",
    );


    assert.equal(
      result.consumer.state,
      "NO_PENDING_INTENTS",
    );
  },
);


test(
  "Q14ag32B isolates a producer exception and still drains existing durable work",
  async () => {
    const mock =
      makeSupabase(
        async (
          name,
          _args,
        ) => {
          assert.equal(
            name,
            "read_hspp_reconstruction_execution_intents",
          );


          return {
            data:
              [],

            error:
              null,
          };
        },
      );


    const invalidSnapshot =
      noClaimSnapshot(
        OTHER_ORGANIZATION_ID,
      );


    const result =
      await runHsppReconstructionActivationCycle(
        request(
          mock.client,
          invalidSnapshot,
        ),
      );


    /*
     * The producer fails before an RPC because Q14ag31S rejects the
     * organization mismatch. The single observed RPC is therefore the
     * Q14ag31W consumer drain, proving producer failure did not block it.
     */
    assert.equal(
      mock.calls.length,
      2,
    );


    assert.equal(
      mock.calls[0].name,
      "read_hspp_reconstruction_execution_intents",
    );



    assert.equal(
      mock.calls[1].name,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC,
    );
assert.equal(
      result.producer.success,
      false,
    );


    if (result.producer.success) {
      throw new Error(
        "Expected isolated producer failure.",
      );
    }


    assert.equal(
      result.producer.result,
      null,
    );


    assert.match(
      result.producer.errorMessage,
      /organization/i,
    );


    assert.equal(
      result.consumer.state,
      "NO_PENDING_INTENTS",
    );
  },
);


test(
  "Q14ag32B propagates a fatal consumer read error after the producer attempt",
  async () => {
    const expected =
      new Error(
        "consumer read failed",
      );


    const mock =
      makeSupabase(
        async (
          name,
          _args,
        ) => {
          assert.equal(
            name,
            "read_hspp_reconstruction_execution_intents",
          );


          return {
            data:
              null,

            error:
              expected,
          };
        },
      );


    await assert.rejects(
      () =>
        runHsppReconstructionActivationCycle(
          request(
            mock.client,
            noClaimSnapshot(),
          ),
        ),
      /consumer read failed/,
    );


    assert.equal(
      mock.calls.length,
      1,
    );
  },
);

test(
  "Q14ag33E3E4 propagates a fatal successor read only after the legacy consumer has run",
  async () => {
    const mock =
      makeSupabase(
        async (
          name,
          _args,
        ) => {
          assert.equal(
            name,
            "read_hspp_reconstruction_execution_intents",
          );

          return {
            data:
              [],

            error:
              null,
          };
        },

        async (
          name,
          _args,
        ) => {
          assert.equal(
            name,
            HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC,
          );

          const rpcError = {
            message:
              "successor read failed",
          };

          return {
            data:
              null,

            error:
              rpcError,
          };
        },
      );

    await assert.rejects(
      () =>
        runHsppReconstructionActivationCycle(
          request(
            mock.client,
            noClaimSnapshot(),
          ),
        ),
      error => {
        assert.deepEqual(
          error,
          {
            message:
              "successor read failed",
          },
        );

        return true;
      },
    );

    assert.equal(
      mock.calls.length,
      2,
    );

    assert.equal(
      mock.calls[0].name,
      "read_hspp_reconstruction_execution_intents",
    );

    assert.equal(
      mock.calls[1].name,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_SUCCESSOR_READ_RPC,
    );
  },
);
