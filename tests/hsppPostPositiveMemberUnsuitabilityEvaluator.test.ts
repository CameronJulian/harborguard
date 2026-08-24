import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_PERSISTENCE_REASON,
  HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_POLICY_VERSION,
  evaluateHsppPostPositiveMemberUnsuitability,
} from "../lib/hspp/evaluateHsppPostPositiveMemberUnsuitability";

const ORGANIZATION_ID =
  "11111111-1111-4111-8111-111111111111";

const ASSEMBLY_ID =
  "22222222-2222-4222-8222-222222222222";

const MEMBERSHIP_ID =
  "33333333-3333-4333-8333-333333333333";

const EVIDENCE_ID =
  "44444444-4444-4444-8444-444444444444";

const POSITIVE_CHECKPOINT_ID =
  "55555555-5555-4555-8555-555555555555";

const FINGERPRINT =
  "a".repeat(64);

function createWorkItem(
  overrides: Record<string, unknown> = {},
) {
  return {
    positiveCheckpointId:
      POSITIVE_CHECKPOINT_ID,

    organizationId:
      ORGANIZATION_ID,

    assemblyId:
      ASSEMBLY_ID,

    membershipId:
      MEMBERSHIP_ID,

    evidenceId:
      EVIDENCE_ID,

    integrityFingerprint:
      FINGERPRINT,

    positiveAssessedAt:
      "2026-08-24T10:00:00.000Z",

    unsuitabilityCheckpointId:
      null,

    unsuitabilityObservedAt:
      null,

    unsuitabilityDecidedAt:
      null,

    workState:
      "REEVALUATION_REQUIRED",

    ...overrides,
  } as any;
}

type CurrentEvidenceOverrides = {
  evidence?:
    Record<string, unknown>;

  verification?:
    Record<string, unknown>;
};

function createCurrentEvidence(
  overrides:
    CurrentEvidenceOverrides = {},
) {
  const evidenceOverrides =
    overrides.evidence || {};

  const verificationOverrides =
    overrides.verification || {};

  return {
    found:
      true,

    evidence: {
      id:
        EVIDENCE_ID,

      organizationId:
        ORGANIZATION_ID,

      integrityFingerprint:
        FINGERPRINT,

      validationState:
        "VALIDATED",

      trustState:
        "CORROBORATED",

      operationalEligible:
        true,

      assessmentPolicyVersion:
        "hspp-corroborated-operational-assessment-v1",

      assessmentReason:
        "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",

      assessedAt:
        "2026-08-24T10:30:00.000Z",

      ...evidenceOverrides,
    },

    verification: {
      status:
        "MATCH",

      ...verificationOverrides,
    },
  } as any;
}

const OBSERVED_AT =
  "2026-08-24T11:00:00.000Z";

const DECIDED_AT =
  "2026-08-24T11:00:01.000Z";

test(
  "post-positive evaluator preserves a currently operational exact member",
  () => {
    const decision =
      evaluateHsppPostPositiveMemberUnsuitability({
        workItem:
          createWorkItem(),

        currentEvidence:
          createCurrentEvidence(),

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      });

    assert.equal(
      decision.policyVersion,
      HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_POLICY_VERSION,
    );

    assert.equal(
      decision.state,
      "SUITABLE",
    );

    assert.equal(
      decision.reason,
      "CURRENT_OPERATIONAL_USE_ALLOWED",
    );

    assert.equal(
      decision.persistenceReason,
      null,
    );
  },
);

test(
  "post-positive evaluator marks historical fingerprint drift unsuitable",
  () => {
    const decision =
      evaluateHsppPostPositiveMemberUnsuitability({
        workItem:
          createWorkItem(),

        currentEvidence:
          createCurrentEvidence({
            evidence: {
              integrityFingerprint:
                "b".repeat(64),
            },
          }),

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      });

    assert.equal(
      decision.state,
      "UNSUITABLE",
    );

    assert.equal(
      decision.reason,
      "CURRENT_INTEGRITY_IDENTITY_CHANGED",
    );

    assert.equal(
      decision.persistenceReason,
      HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_PERSISTENCE_REASON,
    );
  },
);

test(
  "post-positive evaluator marks failed current integrity verification unsuitable",
  () => {
    const decision =
      evaluateHsppPostPositiveMemberUnsuitability({
        workItem:
          createWorkItem(),

        currentEvidence:
          createCurrentEvidence({
            verification: {
              status:
                "MISMATCH",
            },
          }),

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      });

    assert.equal(
      decision.state,
      "UNSUITABLE",
    );

    assert.equal(
      decision.reason,
      "CURRENT_INTEGRITY_NOT_VERIFIED",
    );

    assert.equal(
      decision.persistenceReason,
      HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_PERSISTENCE_REASON,
    );
  },
);

test(
  "validation loss remains indeterminate rather than becoming Q14v automatically",
  () => {
    const decision =
      evaluateHsppPostPositiveMemberUnsuitability({
        workItem:
          createWorkItem(),

        currentEvidence:
          createCurrentEvidence({
            evidence: {
              validationState:
                "PENDING",
            },
          }),

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      });

    assert.equal(
      decision.state,
      "INDETERMINATE",
    );

    assert.equal(
      decision.reason,
      "CURRENT_VALIDATION_NOT_VALIDATED",
    );

    assert.equal(
      decision.persistenceReason,
      null,
    );
  },
);

test(
  "missing assessment provenance remains indeterminate",
  () => {
    const decision =
      evaluateHsppPostPositiveMemberUnsuitability({
        workItem:
          createWorkItem(),

        currentEvidence:
          createCurrentEvidence({
            evidence: {
              assessmentPolicyVersion:
                null,
            },
          }),

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      });

    assert.equal(
      decision.state,
      "INDETERMINATE",
    );

    assert.equal(
      decision.reason,
      "CURRENT_ASSESSMENT_MISSING",
    );

    assert.equal(
      decision.persistenceReason,
      null,
    );
  },
);

test(
  "non-operational trust remains indeterminate",
  () => {
    const decision =
      evaluateHsppPostPositiveMemberUnsuitability({
        workItem:
          createWorkItem(),

        currentEvidence:
          createCurrentEvidence({
            evidence: {
              trustState:
                "UNASSESSED",
            },
          }),

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      });

    assert.equal(
      decision.state,
      "INDETERMINATE",
    );

    assert.equal(
      decision.reason,
      "CURRENT_TRUST_NOT_OPERATIONAL",
    );

    assert.equal(
      decision.persistenceReason,
      null,
    );
  },
);

test(
  "operational eligibility denial remains indeterminate",
  () => {
    const decision =
      evaluateHsppPostPositiveMemberUnsuitability({
        workItem:
          createWorkItem(),

        currentEvidence:
          createCurrentEvidence({
            evidence: {
              operationalEligible:
                false,
            },
          }),

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      });

    assert.equal(
      decision.state,
      "INDETERMINATE",
    );

    assert.equal(
      decision.reason,
      "CURRENT_OPERATIONAL_NOT_ELIGIBLE",
    );

    assert.equal(
      decision.persistenceReason,
      null,
    );
  },
);

test(
  "missing evidence remains indeterminate",
  () => {
    const decision =
      evaluateHsppPostPositiveMemberUnsuitability({
        workItem:
          createWorkItem(),

        currentEvidence: {
          found:
            false,
        } as any,

        observedAt:
          OBSERVED_AT,

        decidedAt:
          DECIDED_AT,
      });

    assert.equal(
      decision.state,
      "INDETERMINATE",
    );

    assert.equal(
      decision.reason,
      "CURRENT_EVIDENCE_NOT_FOUND",
    );

    assert.equal(
      decision.persistenceReason,
      null,
    );
  },
);

test(
  "post-positive evaluator rejects an observation before the positive checkpoint",
  () => {
    assert.throws(
      () =>
        evaluateHsppPostPositiveMemberUnsuitability({
          workItem:
            createWorkItem(),

          currentEvidence:
            createCurrentEvidence(),

          observedAt:
            "2026-08-24T09:59:59.000Z",

          decidedAt:
            DECIDED_AT,
        }),
      /must not precede the prior positive assessment/,
    );
  },
);

test(
  "post-positive evaluator rejects a decision before its observation",
  () => {
    assert.throws(
      () =>
        evaluateHsppPostPositiveMemberUnsuitability({
          workItem:
            createWorkItem(),

          currentEvidence:
            createCurrentEvidence(),

          observedAt:
            OBSERVED_AT,

          decidedAt:
            "2026-08-24T10:59:59.000Z",
        }),
      /must not precede its observation/,
    );
  },
);

test(
  "post-positive evaluator refuses already checkpointed cessation work",
  () => {
    assert.throws(
      () =>
        evaluateHsppPostPositiveMemberUnsuitability({
          workItem:
            createWorkItem({
              workState:
                "CESSATION_REQUIRED",

              unsuitabilityCheckpointId:
                "66666666-6666-4666-8666-666666666666",

              unsuitabilityObservedAt:
                OBSERVED_AT,

              unsuitabilityDecidedAt:
                DECIDED_AT,
            }),

          currentEvidence:
            createCurrentEvidence(),

          observedAt:
            OBSERVED_AT,

          decidedAt:
            DECIDED_AT,
        }),
      /requires REEVALUATION_REQUIRED work/,
    );
  },
);
