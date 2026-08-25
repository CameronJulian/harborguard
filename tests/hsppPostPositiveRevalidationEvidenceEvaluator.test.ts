import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateHsppPostPositiveRevalidationEvidence,
  HSPP_POST_POSITIVE_REVALIDATION_DECISION,
  HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_TYPE,
  HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_VERSION,
  HSPP_POST_POSITIVE_REVALIDATION_PAYLOAD_SCHEMA_VERSION,
  HSPP_POST_POSITIVE_REVALIDATION_PERSISTENCE_REASON,
  HSPP_POST_POSITIVE_REVALIDATION_SOURCE_CLASS,
  HSPP_POST_POSITIVE_REVALIDATION_SOURCE_PROVIDER,
  HSPP_POST_POSITIVE_REVALIDATION_SOURCE_STREAM,
  HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_POLICY_VERSION,
} from "../lib/hspp/evaluateHsppPostPositiveRevalidationEvidence";

import type {
  ReadAndVerifyHsppEvidenceResult,
} from "../lib/hspp/readAndVerifyHsppEvidence";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "../lib/hspp/readHsppPostPositiveLifecycleWorkItems";


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

const R1_ID =
  "66666666-6666-4666-8666-666666666666";

const C_FINGERPRINT =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

const R1_FINGERPRINT =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const POSITIVE_AT =
  "2026-08-25T08:00:00.000Z";

const R1_AT =
  "2026-08-25T08:05:00.000Z";


function makeWorkItem(): HsppPostPositiveLifecycleWorkItem {
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
      C_FINGERPRINT,

    positiveAssessedAt:
      POSITIVE_AT,

    unsuitabilityCheckpointId:
      null,

    unsuitabilityObservedAt:
      null,

    unsuitabilityDecidedAt:
      null,

    workState:
      "REEVALUATION_REQUIRED",
  };
}


function makeR1(
  overrides: {
    evidence?: Record<string, unknown>;
    payload?: Record<string, unknown>;
    verification?: Extract<
      ReadAndVerifyHsppEvidenceResult,
      {
        found: true;
      }
    >["verification"];
  } = {},
): ReadAndVerifyHsppEvidenceResult {
  const evidence = {
    id:
      R1_ID,

    organizationId:
      ORGANIZATION_ID,

    protocolVersion:
      "hspp-v1",

    canonicalizationVersion:
      "hspp-canonical-json-v2",

    sourceClass:
      HSPP_POST_POSITIVE_REVALIDATION_SOURCE_CLASS,

    sourceProvider:
      HSPP_POST_POSITIVE_REVALIDATION_SOURCE_PROVIDER,

    sourceStream:
      HSPP_POST_POSITIVE_REVALIDATION_SOURCE_STREAM,

    sourceMessageId:
      "controlled-r1-001",

    observedAt:
      R1_AT,

    receivedAt:
      R1_AT,

    payloadSchemaVersion:
      HSPP_POST_POSITIVE_REVALIDATION_PAYLOAD_SCHEMA_VERSION,

    normalizedPayload: {
      subjectAssemblyId:
        ASSEMBLY_ID,

      subjectPositiveCheckpointId:
        POSITIVE_CHECKPOINT_ID,

      subjectEvidenceId:
        EVIDENCE_ID,

      subjectIntegrityFingerprint:
        C_FINGERPRINT,

      decision:
        HSPP_POST_POSITIVE_REVALIDATION_DECISION,

      unsuitabilityPolicyVersion:
        HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_POLICY_VERSION,

      unsuitabilityReason:
        HSPP_POST_POSITIVE_REVALIDATION_PERSISTENCE_REASON,

      ...overrides.payload,
    },

    integrityAlgorithm:
      "sha256",

    integrityFingerprint:
      R1_FINGERPRINT,

    integrityState:
      "VERIFIED",

    validationState:
      "UNVALIDATED",

    trustState:
      "UNASSESSED",

    operationalEligible:
      false,

    assessmentPolicyVersion:
      null,

    assessmentReason:
      null,

    assessedAt:
      null,

    derivationLineage: {
      parentEvidenceId:
        EVIDENCE_ID,

      parentIntegrityFingerprint:
        C_FINGERPRINT,

      derivationType:
        HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_TYPE,

      derivationVersion:
        HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_VERSION,
    },

    ...overrides.evidence,
  };

  return {
    found:
      true,

    evidence:
      evidence as never,

    verification:
      overrides.verification ?? {
        status:
          "MATCH",

        expectedFingerprint:
          R1_FINGERPRINT,

        actualFingerprint:
          R1_FINGERPRINT,
      },
  };
}


test(
  "canonical immutable R1 qualifies as policy-v2 unsuitability basis",
  () => {
    const result =
      evaluateHsppPostPositiveRevalidationEvidence({
        workItem:
          makeWorkItem(),

        revalidationEvidence:
          makeR1(),
      });

    assert.equal(
      result.state,
      "QUALIFYING_UNSUITABILITY_BASIS",
    );

    assert.equal(
      result.qualifiesUnsuitability,
      true,
    );

    assert.equal(
      result.policyVersion,
      "hspp-post-positive-member-unsuitability-v2",
    );

    assert.equal(
      result.revalidationEvidenceId,
      R1_ID,
    );

    assert.equal(
      result.revalidationIntegrityFingerprint,
      R1_FINGERPRINT,
    );

    assert.equal(
      result.observedAt,
      R1_AT,
    );
  },
);


test(
  "R1 must independently pass integrity verification",
  () => {
    const result =
      evaluateHsppPostPositiveRevalidationEvidence({
        workItem:
          makeWorkItem(),

        revalidationEvidence:
          makeR1({
            verification: {
              status:
                "MISMATCH",

              expectedFingerprint:
                R1_FINGERPRINT,

              actualFingerprint:
                "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
            },
          }),
      });

    assert.equal(
      result.state,
      "NON_QUALIFYING_REVALIDATION",
    );

    assert.equal(
      result.reason,
      "R1_INTEGRITY_NOT_VERIFIED",
    );
  },
);


test(
  "R1 must use exact immutable C lineage",
  () => {
    const result =
      evaluateHsppPostPositiveRevalidationEvidence({
        workItem:
          makeWorkItem(),

        revalidationEvidence:
          makeR1({
            evidence: {
              derivationLineage: {
                parentEvidenceId:
                  "77777777-7777-4777-8777-777777777777",

                parentIntegrityFingerprint:
                  C_FINGERPRINT,

                derivationType:
                  HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_TYPE,

                derivationVersion:
                  HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_VERSION,
              },
            },
          }),
      });

    assert.equal(
      result.reason,
      "R1_LINEAGE_MISMATCH",
    );

    assert.equal(
      result.qualifiesUnsuitability,
      false,
    );
  },
);


test(
  "R1 observation must be post-positive",
  () => {
    const result =
      evaluateHsppPostPositiveRevalidationEvidence({
        workItem:
          makeWorkItem(),

        revalidationEvidence:
          makeR1({
            evidence: {
              observedAt:
                "2026-08-25T07:59:59.999Z",
            },
          }),
      });

    assert.equal(
      result.reason,
      "R1_NOT_POST_POSITIVE",
    );
  },
);


test(
  "R1 requires canonical HarborGuard source identity",
  () => {
    const result =
      evaluateHsppPostPositiveRevalidationEvidence({
        workItem:
          makeWorkItem(),

        revalidationEvidence:
          makeR1({
            evidence: {
              sourceProvider:
                "untrusted-provider",
            },
          }),
      });

    assert.equal(
      result.reason,
      "R1_SOURCE_IDENTITY_MISMATCH",
    );
  },
);


test(
  "R1 requires the exact payload schema",
  () => {
    const result =
      evaluateHsppPostPositiveRevalidationEvidence({
        workItem:
          makeWorkItem(),

        revalidationEvidence:
          makeR1({
            evidence: {
              payloadSchemaVersion:
                "unsupported-r1-schema",
            },
          }),
      });

    assert.equal(
      result.reason,
      "R1_PAYLOAD_SCHEMA_MISMATCH",
    );
  },
);


test(
  "R1 payload must bind the exact H1 Q14p and C subject",
  () => {
    const result =
      evaluateHsppPostPositiveRevalidationEvidence({
        workItem:
          makeWorkItem(),

        revalidationEvidence:
          makeR1({
            payload: {
              subjectAssemblyId:
                "88888888-8888-4888-8888-888888888888",
            },
          }),
      });

    assert.equal(
      result.reason,
      "R1_PAYLOAD_SUBJECT_MISMATCH",
    );
  },
);


test(
  "R1 payload must explicitly commit to policy-v2 unsuitability",
  () => {
    const result =
      evaluateHsppPostPositiveRevalidationEvidence({
        workItem:
          makeWorkItem(),

        revalidationEvidence:
          makeR1({
            payload: {
              decision:
                "SUITABLE",
            },
          }),
      });

    assert.equal(
      result.reason,
      "R1_PAYLOAD_DECISION_MISMATCH",
    );
  },
);


test(
  "R1 payload rejects additional undeclared semantic fields",
  () => {
    const result =
      evaluateHsppPostPositiveRevalidationEvidence({
        workItem:
          makeWorkItem(),

        revalidationEvidence:
          makeR1({
            payload: {
              undeclaredAuthority:
                true,
            },
          }),
      });

    assert.equal(
      result.reason,
      "R1_PAYLOAD_SHAPE_INVALID",
    );
  },
);


test(
  "missing R1 remains non-qualifying rather than inventing unsuitability",
  () => {
    const result =
      evaluateHsppPostPositiveRevalidationEvidence({
        workItem:
          makeWorkItem(),

        revalidationEvidence: {
          found:
            false,

          evidence:
            null,

          verification:
            null,
        },
      });

    assert.equal(
      result.state,
      "NON_QUALIFYING_REVALIDATION",
    );

    assert.equal(
      result.reason,
      "R1_EVIDENCE_NOT_FOUND",
    );

    assert.equal(
      result.revalidationEvidenceId,
      null,
    );
  },
);


test(
  "R1 evaluator refuses already checkpointed cessation work",
  () => {
    const workItem =
      makeWorkItem();

    workItem.workState =
      "CESSATION_REQUIRED";

    workItem.unsuitabilityCheckpointId =
      "99999999-9999-4999-8999-999999999999";

    workItem.unsuitabilityObservedAt =
      R1_AT;

    workItem.unsuitabilityDecidedAt =
      R1_AT;

    assert.throws(
      () =>
        evaluateHsppPostPositiveRevalidationEvidence({
          workItem,
          revalidationEvidence:
            makeR1(),
        }),
      /REEVALUATION_REQUIRED/,
    );
  },
);
