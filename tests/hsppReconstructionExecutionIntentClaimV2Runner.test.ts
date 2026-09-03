import assert from "node:assert/strict";
import test from "node:test";

import {
  runHsppReconstructionExecutionIntentClaimV2,
} from "../lib/hspp/runHsppReconstructionExecutionIntentClaimV2";


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
      "B07B_DISCOVERY",

    discovery_policy_version:
      "hspp-reservoir-discovery-v1",

    pair_scheduling_version:
      null,

    reservoir_eligibility_policy_version:
      "hspp-reservoir-eligibility-v1",

    reevaluation_policy_version:
      "hspp-reservoir-reevaluation-v1",

    membership_policy_version:
      "hspp-effective-membership-v1",

    reconstruction_policy_version:
      "hspp-reconstruction-v1",

    reconstruction_reason:
      "B07B replacement candidate",

    intent_version:
      "hspp-reconstruction-execution-intent-v1",

    created_at:
      "2026-09-02T00:00:00.000Z",

    idempotent_recovery:
      false,

    ...overrides,
  };
}


function makeReevaluationResult() {
  return {
    runnerVersion:
      "hspp-reservoir-reevaluation-runner-v1",

    discoveryPolicyVersion:
      "hspp-reservoir-discovery-v1",

    reevaluationPolicyVersion:
      "hspp-reservoir-reevaluation-v1",

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
              "hspp-effective-membership-v1",
          },
        },
      ],
    },
  } as never;
}


test(
  "Q14ag34O B07B producer sends one exact successor claim",
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
      await runHsppReconstructionExecutionIntentClaimV2({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        reevaluationResult:
          makeReevaluationResult(),

        proposedChildAssemblyId:
          CHILD_ID,

        reconstructionPolicyVersion:
          "hspp-reconstruction-v1",

        reconstructionReason:
          "B07B replacement candidate",
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
      calls[0].args.p_selection_source,
      "B07B_DISCOVERY",
    );

    assert.equal(
      calls[0].args.p_discovery_policy_version,
      "hspp-reservoir-discovery-v1",
    );

    assert.equal(
      calls[0].args.p_pair_scheduling_version,
      null,
    );

    assert.equal(
      calls[0].args.p_reservoir_eligibility_policy_version,
      "hspp-reservoir-eligibility-v1",
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
        "Expected successor durable claim.",
      );
    }

    assert.equal(
      result.claim.selectionSource,
      "B07B_DISCOVERY",
    );

    assert.equal(
      result.claim.pairSchedulingVersion,
      null,
    );
  },
);


test(
  "Q14ag34O successor wrapper rejects provenance echo mutation",
  async () => {
    const supabase = {
      rpc: async () => ({
        data: [
          makeRpcRow({
            pair_scheduling_version:
              "unexpected-pair-version",
          }),
        ],

        error:
          null,
      }),
    } as never;

    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntentClaimV2({
          supabase,

          organizationId:
            ORGANIZATION_ID,

          reevaluationResult:
            makeReevaluationResult(),

          proposedChildAssemblyId:
            CHILD_ID,

          reconstructionPolicyVersion:
            "hspp-reconstruction-v1",

          reconstructionReason:
            "B07B replacement candidate",
        }),

      /pair_scheduling_version returned by the successor claim does not match/,
    );
  },
);


test(
  "Q14ag34O fresh claim rejects a different canonical child UUID",
  async () => {
    const supabase = {
      rpc: async () => ({
        data: [
          makeRpcRow({
            child_assembly_id:
              "66666666-6666-4666-8666-666666666666",

            idempotent_recovery:
              false,
          }),
        ],

        error:
          null,
      }),
    } as never;

    await assert.rejects(
      () =>
        runHsppReconstructionExecutionIntentClaimV2({
          supabase,

          organizationId:
            ORGANIZATION_ID,

          reevaluationResult:
            makeReevaluationResult(),

          proposedChildAssemblyId:
            CHILD_ID,

          reconstructionPolicyVersion:
            "hspp-reconstruction-v1",

          reconstructionReason:
            "B07B replacement candidate",
        }),

      /newly claimed successor reconstruction intent must preserve the proposed childAssemblyId/,
    );
  },
);


test(
  "Q14ag34O idempotent recovery accepts the database canonical child UUID",
  async () => {
    const canonicalRecoveredChild =
      "77777777-7777-4777-8777-777777777777";

    const supabase = {
      rpc: async () => ({
        data: [
          makeRpcRow({
            child_assembly_id:
              canonicalRecoveredChild,

            idempotent_recovery:
              true,
          }),
        ],

        error:
          null,
      }),
    } as never;

    const result =
      await runHsppReconstructionExecutionIntentClaimV2({
        supabase,

        organizationId:
          ORGANIZATION_ID,

        reevaluationResult:
          makeReevaluationResult(),

        proposedChildAssemblyId:
          CHILD_ID,

        reconstructionPolicyVersion:
          "hspp-reconstruction-v1",

        reconstructionReason:
          "B07B replacement candidate",
      });

    assert.equal(
      result.state,
      "RECONSTRUCTION_INTENT_V2_CLAIMED",
    );

    if (
      result.state !==
      "RECONSTRUCTION_INTENT_V2_CLAIMED"
    ) {
      throw new Error(
        "Expected recovered successor claim.",
      );
    }

    assert.equal(
      result.claim.idempotentRecovery,
      true,
    );

    assert.equal(
      result.claim.childAssemblyId,
      canonicalRecoveredChild,
    );

    assert.equal(
      result.claim.proposedChildAssemblyId,
      CHILD_ID,
    );
  },
);
