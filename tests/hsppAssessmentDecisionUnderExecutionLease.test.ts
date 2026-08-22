import assert from "node:assert/strict";
import test from "node:test";

import {
  applyHsppAssessmentDecisionUnderExecutionLease,
  HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_RPC,
  HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_VERSION,
} from "../lib/hspp/applyHsppAssessmentDecisionUnderExecutionLease";

const organizationId =
  "11111111-1111-4111-8111-111111111111";

const assemblyId =
  "22222222-2222-4222-8222-222222222222";

const leaseToken =
  "33333333-3333-4333-8333-333333333333";

const evidenceId =
  "44444444-4444-4444-8444-444444444444";

const integrityFingerprint =
  "a".repeat(64);

const assessedAt =
  "2026-08-22T15:00:00.000Z";

const assessment = {
  trustState:
    "CORROBORATED" as const,

  operationalEligible:
    true,

  crowdEligible:
    false,

  trainingEligible:
    false,

  validationEligible:
    false,

  policyVersion:
    "hspp-test-assessment-v1",

  reason:
    "TEST_CORROBORATED",
};

const persistedRow = {
  evidence_id:
    evidenceId,

  trust_state:
    assessment.trustState,

  operational_eligible:
    assessment.operationalEligible,

  crowd_eligible:
    assessment.crowdEligible,

  training_eligible:
    assessment.trainingEligible,

  validation_eligible:
    assessment.validationEligible,

  assessment_policy_version:
    assessment.policyVersion,

  assessment_reason:
    assessment.reason,

  assessed_at:
    assessedAt,
};

function createSupabase(
  data: unknown = persistedRow,
  error: unknown = null
) {
  const calls: Array<{
    name: string;
    args: Record<string, unknown>;
  }> = [];

  const supabase = {
    rpc(
      name: string,
      args: Record<string, unknown>
    ) {
      calls.push({
        name,
        args,
      });

      return {
        async maybeSingle() {
          return {
            data,
            error,
          };
        },
      };
    },
  };

  return {
    supabase,
    calls,
  };
}

function input(
  supabase: any
) {
  return {
    supabase,
    organizationId,
    assemblyId,
    leaseToken,
    evidenceId,
    integrityFingerprint,
    assessment,
    assessedAt,
  };
}

test(
  "Q13e5a calls exactly the fenced assessment RPC with exact ownership and assessment identity",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    const result =
      await applyHsppAssessmentDecisionUnderExecutionLease(
        input(
          supabase as any
        )
      );

    assert.equal(
      calls.length,
      1
    );

    assert.equal(
      calls[0].name,
      HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_RPC
    );

    assert.deepEqual(
      calls[0].args,
      {
        p_organization_id:
          organizationId,

        p_assembly_id:
          assemblyId,

        p_lease_token:
          leaseToken,

        p_evidence_id:
          evidenceId,

        p_integrity_fingerprint:
          integrityFingerprint,

        p_trust_state:
          assessment.trustState,

        p_operational_eligible:
          assessment.operationalEligible,

        p_crowd_eligible:
          assessment.crowdEligible,

        p_training_eligible:
          assessment.trainingEligible,

        p_validation_eligible:
          assessment.validationEligible,

        p_assessment_policy_version:
          assessment.policyVersion,

        p_assessment_reason:
          assessment.reason,

        p_assessed_at:
          assessedAt,
      }
    );

    assert.deepEqual(
      result,
      {
        writerVersion:
          HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_VERSION,

        organizationId,

        assemblyId,

        evidenceId,

        trustState:
          assessment.trustState,

        operationalEligible:
          true,

        crowdEligible:
          false,

        trainingEligible:
          false,

        validationEligible:
          false,

        policyVersion:
          assessment.policyVersion,

        reason:
          assessment.reason,

        assessedAt,
      }
    );
  }
);

test(
  "Q13e5a propagates a fenced RPC ownership failure",
  async () => {
    const rpcError =
      new Error(
        "HSPP assessment execution lease is owned by another token"
      );

    const {
      supabase,
    } =
      createSupabase(
        null,
        rpcError
      );

    await assert.rejects(
      () =>
        applyHsppAssessmentDecisionUnderExecutionLease(
          input(
            supabase as any
          )
        ),
      /owned by another token/
    );
  }
);

test(
  "Q13e5a rejects an empty RPC result",
  async () => {
    const {
      supabase,
    } =
      createSupabase(
        null,
        null
      );

    await assert.rejects(
      () =>
        applyHsppAssessmentDecisionUnderExecutionLease(
          input(
            supabase as any
          )
        ),
      /returned no persisted assessment/
    );
  }
);

test(
  "Q13e5a rejects a persisted assessment that differs from the requested decision",
  async () => {
    const {
      supabase,
    } =
      createSupabase({
        ...persistedRow,

        crowd_eligible:
          true,
      });

    await assert.rejects(
      () =>
        applyHsppAssessmentDecisionUnderExecutionLease(
          input(
            supabase as any
          )
        ),
      /does not match the requested assessment decision/
    );
  }
);

test(
  "Q13e5a rejects an invalid lease token before any RPC call",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    await assert.rejects(
      () =>
        applyHsppAssessmentDecisionUnderExecutionLease({
          ...input(
            supabase as any
          ),

          leaseToken:
            "not-a-uuid",
        }),
      /leaseToken must be a UUID/
    );

    assert.equal(
      calls.length,
      0
    );
  }
);

test(
  "Q13e5a rejects an invalid fingerprint before any RPC call",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    await assert.rejects(
      () =>
        applyHsppAssessmentDecisionUnderExecutionLease({
          ...input(
            supabase as any
          ),

          integrityFingerprint:
            "BAD",
        }),
      /lowercase SHA-256/
    );

    assert.equal(
      calls.length,
      0
    );
  }
);

test(
  "Q13e5a requires caller-owned assessedAt and never generates it",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    await assert.rejects(
      () =>
        applyHsppAssessmentDecisionUnderExecutionLease({
          ...input(
            supabase as any
          ),

          assessedAt:
            "",
        }),
      /assessedAt is required/
    );

    assert.equal(
      calls.length,
      0
    );
  }
);

test(
  "Q13e5a rejects invalid assessment eligibility before any RPC call",
  async () => {
    const {
      supabase,
      calls,
    } =
      createSupabase();

    await assert.rejects(
      () =>
        applyHsppAssessmentDecisionUnderExecutionLease({
          ...input(
            supabase as any
          ),

          assessment: {
            ...assessment,

            operationalEligible:
              "yes" as any,
          },
        }),
      /eligibility values must be boolean/
    );

    assert.equal(
      calls.length,
      0
    );
  }
);
