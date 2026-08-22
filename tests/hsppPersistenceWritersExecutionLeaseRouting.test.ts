import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_RPC,
  HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_VERSION,
} from "../lib/hspp/applyHsppAssessmentDecisionUnderExecutionLease";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  type HsppMemberCorroborationDecision,
} from "../lib/hspp/evaluateHsppMemberCorroboration";

import {
  HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
  assessHsppCorroboratedMember,
} from "../lib/hspp/assessHsppCorroboratedMember";

import {
  HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,
  persistHsppCorroboratedMemberAssessment,
} from "../lib/hspp/persistHsppCorroboratedMemberAssessment";

import {
  persistHsppDeniedCorroboratedMemberAssessment,
} from "../lib/hspp/persistHsppDeniedCorroboratedMemberAssessment";

import {
  HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,
  type HsppCorroboratedOperationalAuthorityDecision,
} from "../lib/hspp/evaluateHsppCorroboratedOperationalAuthority";

import {
  HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,
  assessHsppCorroboratedOperationalAuthority,
} from "../lib/hspp/assessHsppCorroboratedOperationalAuthority";

import {
  persistHsppCorroboratedOperationalAssessment,
} from "../lib/hspp/persistHsppCorroboratedOperationalAssessment";

const organizationId =
  "11111111-1111-1111-1111-111111111111";

const assemblyId =
  "22222222-2222-2222-2222-222222222222";

const leaseToken =
  "33333333-3333-3333-3333-333333333333";

const evidenceId =
  "44444444-4444-4444-4444-444444444444";

const supportingEvidenceId =
  "55555555-5555-5555-5555-555555555555";

const assemblyDecisionId =
  "66666666-6666-6666-6666-666666666666";

const otherAssemblyId =
  "77777777-7777-7777-7777-777777777777";

const integrityFingerprint =
  "a".repeat(64);

const assessedAt =
  "2026-08-22T10:00:00.000Z";

type RpcCall = {
  name: string;
  args: Record<string, unknown>;
};

function createFencedRpcMock() {
  const calls: RpcCall[] = [];

  const supabase = {
    rpc(
      name: string,
      args: Record<string, unknown>,
    ) {
      calls.push({
        name,
        args,
      });

      return {
        async maybeSingle() {
          return {
            data: {
              evidence_id:
                args.p_evidence_id,

              trust_state:
                args.p_trust_state,

              operational_eligible:
                args.p_operational_eligible,

              crowd_eligible:
                args.p_crowd_eligible,

              training_eligible:
                args.p_training_eligible,

              validation_eligible:
                args.p_validation_eligible,

              assessment_policy_version:
                args.p_assessment_policy_version,

              assessment_reason:
                args.p_assessment_reason,

              assessed_at:
                args.p_assessed_at,
            },

            error: null,
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

function assertFencedCall(
  call: RpcCall,
  expected: {
    trustState: string;
    operationalEligible: boolean;
    policyVersion: string;
    reason: string;
  },
) {
  assert.equal(
    call.name,
    HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_RPC,
  );

  assert.equal(
    call.args.p_organization_id,
    organizationId,
  );

  assert.equal(
    call.args.p_assembly_id,
    assemblyId,
  );

  assert.equal(
    call.args.p_lease_token,
    leaseToken,
  );

  assert.equal(
    call.args.p_evidence_id,
    evidenceId,
  );

  assert.equal(
    call.args.p_integrity_fingerprint,
    integrityFingerprint,
  );

  assert.equal(
    call.args.p_trust_state,
    expected.trustState,
  );

  assert.equal(
    call.args.p_operational_eligible,
    expected.operationalEligible,
  );

  assert.equal(
    call.args.p_crowd_eligible,
    false,
  );

  assert.equal(
    call.args.p_training_eligible,
    false,
  );

  assert.equal(
    call.args.p_validation_eligible,
    false,
  );

  assert.equal(
    call.args.p_assessment_policy_version,
    expected.policyVersion,
  );

  assert.equal(
    call.args.p_assessment_reason,
    expected.reason,
  );

  assert.equal(
    call.args.p_assessed_at,
    assessedAt,
  );
}

function deniedDecision():
  HsppMemberCorroborationDecision {
  return {
    policyVersion:
      HSPP_MEMBER_CORROBORATION_VERSION,

    state:
      "MEMBER_CORROBORATION_DENIED",

    reason:
      "NO_INDEPENDENT_SUPPORT",

    organizationId,

    assemblyId,

    assemblyDecisionId,

    targetEvidenceId:
      evidenceId,

    targetIntegrityFingerprint:
      integrityFingerprint,

    supportingEvidenceIds:
      [],

    independentSupportCount:
      0,

    authority:
      "NONE",
  };
}

function eligibleDecision():
  HsppMemberCorroborationDecision {
  return {
    policyVersion:
      HSPP_MEMBER_CORROBORATION_VERSION,

    state:
      "MEMBER_CORROBORATION_ELIGIBLE",

    reason:
      "INDEPENDENT_SUPPORT_PRESENT",

    organizationId,

    assemblyId,

    assemblyDecisionId,

    targetEvidenceId:
      evidenceId,

    targetIntegrityFingerprint:
      integrityFingerprint,

    supportingEvidenceIds: [
      supportingEvidenceId,
    ],

    independentSupportCount:
      1,

    authority:
      "NONE",
  };
}

function operationalAuthorityDecision():
  HsppCorroboratedOperationalAuthorityDecision {
  return {
    policyVersion:
      HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    state:
      "OPERATIONAL_AUTHORITY_CANDIDATE",

    reason:
      "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET",

    organizationId,

    assemblyId,

    assemblyDecisionId,

    evidenceId,

    integrityFingerprint,

    supportingEvidenceIds: [
      supportingEvidenceId,
    ],

    independentSupportCount:
      1,

    sourcePersistenceVersion:
      HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,

    sourceAssessmentPolicyVersion:
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState:
      "CORROBORATED",

    authority:
      "NONE",
  };
}

test(
  "Q8 uses fenced assessment persistence when execution ownership is supplied",
  async () => {
    const decision =
      deniedDecision();

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    const mock =
      createFencedRpcMock();

    const result =
      await persistHsppDeniedCorroboratedMemberAssessment({
        supabase:
          mock.supabase,

        corroborationDecision:
          decision,

        assessment,

        assessedAt,

        executionLease: {
          assemblyId,
          leaseToken,
        },
      });

    assert.equal(
      mock.calls.length,
      1,
    );

    assertFencedCall(
      mock.calls[0],
      {
        trustState:
          "UNASSESSED",

        operationalEligible:
          false,

        policyVersion:
          HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

        reason:
          "INDEPENDENT_CORROBORATION_DENIED",
      },
    );

    assert.equal(
      (
        result.applied as {
          writerVersion?: string;
        }
      ).writerVersion,
      HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_VERSION,
    );
  },
);

test(
  "B11F6 uses fenced assessment persistence when execution ownership is supplied",
  async () => {
    const decision =
      eligibleDecision();

    const assessment =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    const mock =
      createFencedRpcMock();

    const result =
      await persistHsppCorroboratedMemberAssessment({
        supabase:
          mock.supabase,

        corroborationDecision:
          decision,

        assessment,

        assessedAt,

        executionLease: {
          assemblyId,
          leaseToken,
        },
      });

    assert.equal(
      mock.calls.length,
      1,
    );

    assertFencedCall(
      mock.calls[0],
      {
        trustState:
          "CORROBORATED",

        operationalEligible:
          false,

        policyVersion:
          HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

        reason:
          "INDEPENDENT_CORROBORATION_ACCEPTED",
      },
    );

    assert.equal(
      (
        result.applied as {
          writerVersion?: string;
        }
      ).writerVersion,
      HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_VERSION,
    );
  },
);

test(
  "Q6 uses fenced assessment persistence when execution ownership is supplied",
  async () => {
    const authorityDecision =
      operationalAuthorityDecision();

    const assessment =
      assessHsppCorroboratedOperationalAuthority({
        authorityDecision,
      });

    const mock =
      createFencedRpcMock();

    const result =
      await persistHsppCorroboratedOperationalAssessment({
        supabase:
          mock.supabase,

        authorityDecision,

        assessment,

        assessedAt,

        executionLease: {
          assemblyId,
          leaseToken,
        },
      });

    assert.equal(
      mock.calls.length,
      1,
    );

    assertFencedCall(
      mock.calls[0],
      {
        trustState:
          "CORROBORATED",

        operationalEligible:
          true,

        policyVersion:
          HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,

        reason:
          "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",
      },
    );

    assert.equal(
      (
        result.applied as {
          writerVersion?: string;
        }
      ).writerVersion,
      HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_VERSION,
    );
  },
);

test(
  "Q8 B11F6 and Q6 reject an execution lease for a different assembly before database use",
  async () => {
    let databaseCalls =
      0;

    const poisonSupabase = {
      rpc() {
        databaseCalls += 1;

        throw new Error(
          "database should not be used",
        );
      },

      from() {
        databaseCalls += 1;

        throw new Error(
          "database should not be used",
        );
      },
    };

    const executionLease = {
      assemblyId:
        otherAssemblyId,

      leaseToken,
    };

    const denied =
      deniedDecision();

    await assert.rejects(
      () =>
        persistHsppDeniedCorroboratedMemberAssessment({
          supabase:
            poisonSupabase,

          corroborationDecision:
            denied,

          assessment:
            assessHsppCorroboratedMember({
              corroborationDecision:
                denied,
            }),

          assessedAt,

          executionLease,
        }),
      /execution lease assembly identity/i,
    );

    const eligible =
      eligibleDecision();

    await assert.rejects(
      () =>
        persistHsppCorroboratedMemberAssessment({
          supabase:
            poisonSupabase,

          corroborationDecision:
            eligible,

          assessment:
            assessHsppCorroboratedMember({
              corroborationDecision:
                eligible,
            }),

          assessedAt,

          executionLease,
        }),
      /execution lease assembly identity/i,
    );

    const authorityDecision =
      operationalAuthorityDecision();

    await assert.rejects(
      () =>
        persistHsppCorroboratedOperationalAssessment({
          supabase:
            poisonSupabase,

          authorityDecision,

          assessment:
            assessHsppCorroboratedOperationalAuthority({
              authorityDecision,
            }),

          assessedAt,

          executionLease,
        }),
      /execution lease assembly identity/i,
    );

    assert.equal(
      databaseCalls,
      0,
    );
  },
);
