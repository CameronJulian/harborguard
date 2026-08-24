import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RPC,
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_WRAPPER_VERSION,
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,
  claimHsppReconstructionExecutionIntent,
} from "../lib/hspp/claimHsppReconstructionExecutionIntent";


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

const OTHER_EVIDENCE_ID =
  "40000000-0000-4000-8000-000000000003";

const HISTORICAL_FINGERPRINT =
  "a".repeat(64);

const REPLACEMENT_FINGERPRINT =
  "b".repeat(64);

const CREATED_AT =
  "2026-08-24T04:30:00.000Z";


function claimRow(
  overrides: Record<string, unknown> = {},
) {
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
      "hspp-reservoir-discovery-v1",

    reevaluation_policy_version:
      "hspp-reservoir-reevaluation-v1",

    membership_policy_version:
      "hspp-assembly-membership-v1",

    reconstruction_policy_version:
      "hspp-reconstruction-policy-v1",

    reconstruction_reason:
      "REPLACE_UNSUITABLE_MEMBER",

    intent_version:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,

    created_at:
      CREATED_AT,

    idempotent_recovery:
      false,

    ...overrides,
  };
}


function makeSupabase(
  data: unknown,
  error: unknown = null,
) {
  const calls:
    Array<{
      name: string;
      args: unknown;
    }> =
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


function request(
  overrides: Record<string, unknown> = {},
) {
  return {
    organizationId:
      ORGANIZATION_ID,

    proposedChildAssemblyId:
      PROPOSED_CHILD_ID,

    selectedFirstEvidenceId:
      HISTORICAL_ID,

    selectedSecondEvidenceId:
      REPLACEMENT_ID,

    historicalEvidenceId:
      HISTORICAL_ID,

    historicalEvidenceIntegrityFingerprint:
      HISTORICAL_FINGERPRINT,

    replacementEvidenceId:
      REPLACEMENT_ID,

    replacementEvidenceIntegrityFingerprint:
      REPLACEMENT_FINGERPRINT,

    discoveryPolicyVersion:
      "hspp-reservoir-discovery-v1",

    reevaluationPolicyVersion:
      "hspp-reservoir-reevaluation-v1",

    membershipPolicyVersion:
      "hspp-assembly-membership-v1",

    reconstructionPolicyVersion:
      "hspp-reconstruction-policy-v1",

    reconstructionReason:
      "REPLACE_UNSUITABLE_MEMBER",

    ...overrides,
  } as any;
}


test(
  "Q14ag31B maps one fresh durable-intent claim exactly",
  async () => {
    const mock =
      makeSupabase([
        claimRow(),
      ]);

    const result =
      await claimHsppReconstructionExecutionIntent({
        supabase:
          mock.client,

        ...request(),
      });


    assert.deepEqual(
      mock.calls,
      [
        {
          name:
            HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RPC,

          args: {
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
              "hspp-reservoir-discovery-v1",

            p_reevaluation_policy_version:
              "hspp-reservoir-reevaluation-v1",

            p_membership_policy_version:
              "hspp-assembly-membership-v1",

            p_reconstruction_policy_version:
              "hspp-reconstruction-policy-v1",

            p_reconstruction_reason:
              "REPLACE_UNSUITABLE_MEMBER",
          },
        },
      ],
    );


    assert.equal(
      result.claimWrapperVersion,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_WRAPPER_VERSION,
    );

    assert.equal(
      result.intentVersion,
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,
    );

    assert.equal(
      result.intentId,
      INTENT_ID,
    );

    assert.equal(
      result.proposedChildAssemblyId,
      PROPOSED_CHILD_ID,
    );

    assert.equal(
      result.childAssemblyId,
      PROPOSED_CHILD_ID,
    );

    assert.equal(
      result.idempotentRecovery,
      false,
    );

    assert.equal(
      result.createdAt,
      CREATED_AT,
    );
  },
);


test(
  "Q14ag31B recovers the canonical child UUID for an identical durable decision",
  async () => {
    const mock =
      makeSupabase([
        claimRow({
          child_assembly_id:
            RECOVERED_CHILD_ID,

          idempotent_recovery:
            true,
        }),
      ]);


    const result =
      await claimHsppReconstructionExecutionIntent({
        supabase:
          mock.client,

        ...request(),
      });


    assert.equal(
      result.proposedChildAssemblyId,
      PROPOSED_CHILD_ID,
    );

    assert.equal(
      result.childAssemblyId,
      RECOVERED_CHILD_ID,
    );

    assert.equal(
      result.idempotentRecovery,
      true,
    );
  },
);


test(
  "Q14ag31B preserves reversed original pair orientation",
  async () => {
    const mock =
      makeSupabase([
        claimRow({
          selected_first_evidence_id:
            REPLACEMENT_ID,

          selected_second_evidence_id:
            HISTORICAL_ID,
        }),
      ]);


    const result =
      await claimHsppReconstructionExecutionIntent({
        supabase:
          mock.client,

        ...request({
          selectedFirstEvidenceId:
            REPLACEMENT_ID,

          selectedSecondEvidenceId:
            HISTORICAL_ID,
        }),
      });


    assert.deepEqual(
      [
        result.selectedFirstEvidenceId,
        result.selectedSecondEvidenceId,
      ],
      [
        REPLACEMENT_ID,
        HISTORICAL_ID,
      ],
    );

    assert.equal(
      result.historicalEvidenceId,
      HISTORICAL_ID,
    );

    assert.equal(
      result.replacementEvidenceId,
      REPLACEMENT_ID,
    );
  },
);


test(
  "Q14ag31B rejects a selected pair that is not exactly the historical and replacement identities",
  async () => {
    const mock =
      makeSupabase([
        claimRow(),
      ]);


    await assert.rejects(
      () =>
        claimHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          ...request({
            selectedSecondEvidenceId:
              OTHER_EVIDENCE_ID,
          }),
        }),
      /selected pair must contain exactly/i,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag31B rejects invalid immutable evidence fingerprints before the RPC",
  async () => {
    const mock =
      makeSupabase([
        claimRow(),
      ]);


    await assert.rejects(
      () =>
        claimHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          ...request({
            historicalEvidenceIntegrityFingerprint:
              "A".repeat(64),
          }),
        }),
      /lowercase SHA-256 fingerprint/,
    );


    assert.equal(
      mock.calls.length,
      0,
    );
  },
);


test(
  "Q14ag31B requires exactly one returned claim row",
  async () => {
    const zero =
      makeSupabase([]);

    await assert.rejects(
      () =>
        claimHsppReconstructionExecutionIntent({
          supabase:
            zero.client,

          ...request(),
        }),
      /exactly one row/,
    );


    const two =
      makeSupabase([
        claimRow(),
        claimRow(),
      ]);

    await assert.rejects(
      () =>
        claimHsppReconstructionExecutionIntent({
          supabase:
            two.client,

          ...request(),
        }),
      /exactly one row/,
    );
  },
);


test(
  "Q14ag31B rejects immutable decision echo drift",
  async () => {
    const mock =
      makeSupabase([
        claimRow({
          membership_policy_version:
            "unexpected-membership-policy",
        }),
      ]);


    await assert.rejects(
      () =>
        claimHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          ...request(),
        }),
      /mismatched membership_policy_version/,
    );
  },
);


test(
  "Q14ag31B rejects an unsupported returned intent version",
  async () => {
    const mock =
      makeSupabase([
        claimRow({
          intent_version:
            "unexpected-intent-version",
        }),
      ]);


    await assert.rejects(
      () =>
        claimHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          ...request(),
        }),
      /unsupported reconstruction execution-intent version/,
    );
  },
);


test(
  "Q14ag31B rejects a fresh claim that changes the proposed child UUID",
  async () => {
    const mock =
      makeSupabase([
        claimRow({
          child_assembly_id:
            RECOVERED_CHILD_ID,

          idempotent_recovery:
            false,
        }),
      ]);


    await assert.rejects(
      () =>
        claimHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          ...request(),
        }),
      /newly claimed reconstruction intent must preserve/i,
    );
  },
);


test(
  "Q14ag31B requires a valid created timestamp and boolean recovery flag",
  async () => {
    const badTimestamp =
      makeSupabase([
        claimRow({
          created_at:
            "not-a-timestamp",
        }),
      ]);


    await assert.rejects(
      () =>
        claimHsppReconstructionExecutionIntent({
          supabase:
            badTimestamp.client,

          ...request(),
        }),
      /created_at must be a valid timestamp/,
    );


    const badBoolean =
      makeSupabase([
        claimRow({
          idempotent_recovery:
            "true",
        }),
      ]);


    await assert.rejects(
      () =>
        claimHsppReconstructionExecutionIntent({
          supabase:
            badBoolean.client,

          ...request(),
        }),
      /idempotent_recovery must be boolean/,
    );
  },
);


test(
  "Q14ag31B propagates the Q14ag31A RPC error without a fallback mutation",
  async () => {
    const expected =
      new Error(
        "database claim failed",
      );

    const mock =
      makeSupabase(
        null,
        expected,
      );


    await assert.rejects(
      () =>
        claimHsppReconstructionExecutionIntent({
          supabase:
            mock.client,

          ...request(),
        }),
      (error) =>
        error === expected,
    );


    assert.equal(
      mock.calls.length,
      1,
    );
  },
);

