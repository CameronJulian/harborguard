import assert from "node:assert/strict";
import test from "node:test";

import {
  runHsppScheduledPairReconstructionExecutionIntentClaimV2,
} from "../lib/hspp/runHsppScheduledPairReconstructionExecutionIntentClaimV2";


const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const HISTORICAL_ID =
  "22222222-2222-4222-8222-222222222222";

const REPLACEMENT_ID =
  "33333333-3333-4333-8333-333333333333";

const CHILD_ID =
  "44444444-4444-4444-8444-444444444444";

const INTENT_ID =
  "55555555-5555-4555-8555-555555555555";

const HISTORICAL_FINGERPRINT =
  "a".repeat(64);

const REPLACEMENT_FINGERPRINT =
  "b".repeat(64);

const PAIR_SCHEDULING_VERSION =
  "hspp-reservoir-pair-scheduling-v1";


function makeScheduledResult(
  withAssemblyCandidate = true,
) {
  return {
    runnerVersion:
      "hspp-reservoir-scheduled-pair-reevaluation-runner-v1",

    pairPage: {
      schedulingVersion:
        PAIR_SCHEDULING_VERSION,

      organizationId:
        ORGANIZATION_ID,

      pairs: [
        {
          ordinal:
            1,

          firstEvidenceId:
            HISTORICAL_ID,

          secondEvidenceId:
            REPLACEMENT_ID,
        },
      ],

      expectedCursor:
        null,

      proposedCursor: {
        firstEvidenceId:
          HISTORICAL_ID,

        secondEvidenceId:
          REPLACEMENT_ID,
      },
    },

    endpointEvidenceIds: [
      HISTORICAL_ID,
      REPLACEMENT_ID,
    ],

    eligibleEvidence: [
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

    reevaluation: {
      policyVersion:
        "hspp-reservoir-reevaluation-v1",

      state:
        withAssemblyCandidate
          ? "ASSEMBLY_CANDIDATE"
          : "NO_COUNTERPART",

      candidateCount:
        2,

      comparisonCount:
        1,

      comparisonLimit:
        100,

      evaluations:
        [],

      assemblyCandidates:
        withAssemblyCandidate
          ? [
              {
                firstEvidenceId:
                  HISTORICAL_ID,

                secondEvidenceId:
                  REPLACEMENT_ID,

                membershipDecision: {
                  eligible:
                    true,

                  policyVersion:
                    "hspp-effective-membership-v1",
                },
              },
            ]
          : [],
    },
  } as never;
}


function makeRpcRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    intent_id:
      INTENT_ID,

    organization_id:
      ORGANIZATION_ID,

    child_assembly_id:
      CHILD_ID,

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
      "SCHEDULED_PAIR",

    discovery_policy_version:
      null,

    pair_scheduling_version:
      PAIR_SCHEDULING_VERSION,

    reservoir_eligibility_policy_version:
      "hspp-reservoir-eligibility-v1",

    reevaluation_policy_version:
      "hspp-reservoir-reevaluation-v1",

    membership_policy_version:
      "hspp-effective-membership-v1",

    reconstruction_policy_version:
      "hspp-reconstruction-policy-v1",

    reconstruction_reason:
      "REPLACE_UNSUITABLE_MEMBER",

    intent_version:
      "hspp-reconstruction-execution-intent-v1",

    created_at:
      "2026-09-03T00:00:00.000Z",

    idempotent_recovery:
      false,

    ...overrides,
  };
}


test(
  "Q14ag35A scheduled-pair producer sends one exact successor durable claim",
  async () => {
    const calls:
      Array<{
        rpc: string;
        args: Record<string, unknown>;
      }> = [];


    const supabase = {
      rpc: async (
        rpc: string,
        args: Record<string, unknown>,
      ) => {
        calls.push({
          rpc,
          args,
        });


        return {
          data: [
            makeRpcRow(),
          ],

          error:
            null,
        };
      },
    } as never;


    const result =
      await runHsppScheduledPairReconstructionExecutionIntentClaimV2({
        supabase,

        scheduledReevaluationResult:
          makeScheduledResult(),

        proposedChildAssemblyId:
          CHILD_ID,

        reconstructionPolicyVersion:
          "hspp-reconstruction-policy-v1",

        reconstructionReason:
          "REPLACE_UNSUITABLE_MEMBER",
      });


    assert.equal(
      calls.length,
      1,
    );


    assert.equal(
      calls[0].rpc,
      "claim_hspp_reconstruction_execution_intent_v2",
    );


    assert.equal(
      calls[0].args.p_organization_id,
      ORGANIZATION_ID,
    );


    assert.equal(
      calls[0].args.p_selection_source,
      "SCHEDULED_PAIR",
    );


    assert.equal(
      calls[0].args.p_discovery_policy_version,
      null,
    );


    assert.equal(
      calls[0].args.p_pair_scheduling_version,
      PAIR_SCHEDULING_VERSION,
    );


    assert.equal(
      calls[0].args.p_reservoir_eligibility_policy_version,
      "hspp-reservoir-eligibility-v1",
    );


    assert.equal(
      calls[0].args.p_reevaluation_policy_version,
      "hspp-reservoir-reevaluation-v1",
    );


    assert.equal(
      calls[0].args.p_membership_policy_version,
      "hspp-effective-membership-v1",
    );


    assert.equal(
      calls[0].args.p_reconstruction_policy_version,
      "hspp-reconstruction-policy-v1",
    );


    assert.equal(
      calls[0].args.p_reconstruction_reason,
      "REPLACE_UNSUITABLE_MEMBER",
    );


    assert.equal(
      result.state,
      "RECONSTRUCTION_INTENT_V2_CLAIMED",
    );


    if (
      result.state !==
      "RECONSTRUCTION_INTENT_V2_CLAIMED"
    ) {
      throw new Error(
        "Expected scheduled-pair successor durable claim.",
      );
    }


    assert.equal(
      result.claim.selectionSource,
      "SCHEDULED_PAIR",
    );


    assert.equal(
      result.claim.discoveryPolicyVersion,
      null,
    );


    assert.equal(
      result.claim.pairSchedulingVersion,
      PAIR_SCHEDULING_VERSION,
    );
  },
);


test(
  "Q14ag35A scheduled-pair producer makes no durable claim when semantic resolver returns no candidate",
  async () => {
    let rpcCount =
      0;


    const supabase = {
      rpc: async () => {
        rpcCount++;

        throw new Error(
          "RPC must not execute when there is no reconstruction claim.",
        );
      },
    } as never;


    const result =
      await runHsppScheduledPairReconstructionExecutionIntentClaimV2({
        supabase,

        scheduledReevaluationResult:
          makeScheduledResult(
            false,
          ),

        proposedChildAssemblyId:
          CHILD_ID,

        reconstructionPolicyVersion:
          "hspp-reconstruction-policy-v1",

        reconstructionReason:
          "REPLACE_UNSUITABLE_MEMBER",
      });


    assert.equal(
      rpcCount,
      0,
    );


    assert.equal(
      result.state,
      "NO_RECONSTRUCTION_CLAIM",
    );


    assert.equal(
      result.organizationId,
      ORGANIZATION_ID,
    );


    assert.equal(
      result.claim,
      null,
    );
  },
);


test(
  "Q14ag35A scheduled-pair producer preserves scheduler provenance through wrapper echo validation",
  async () => {
    const supabase = {
      rpc: async () => ({
        data: [
          makeRpcRow({
            pair_scheduling_version:
              "different-scheduler-version",
          }),
        ],

        error:
          null,
      }),
    } as never;


    await assert.rejects(
      () =>
        runHsppScheduledPairReconstructionExecutionIntentClaimV2({
          supabase,

          scheduledReevaluationResult:
            makeScheduledResult(),

          proposedChildAssemblyId:
            CHILD_ID,

          reconstructionPolicyVersion:
            "hspp-reconstruction-policy-v1",

          reconstructionReason:
            "REPLACE_UNSUITABLE_MEMBER",
        }),

      /pair_scheduling_version returned by the successor claim does not match/,
    );
  },
);