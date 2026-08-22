import assert from "node:assert/strict";
import test from "node:test";

import { HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION } from "../lib/hspp/assessHsppCorroboratedMember";

import { HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION } from "../lib/hspp/persistHsppCorroboratedMemberAssessment";

import {
  HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,
  type HsppCorroboratedOperationalAuthorityDecision,
} from "../lib/hspp/evaluateHsppCorroboratedOperationalAuthority";

import {
  HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,
  assessHsppCorroboratedOperationalAuthority,
} from "../lib/hspp/assessHsppCorroboratedOperationalAuthority";

function candidate(
  overrides: Partial<HsppCorroboratedOperationalAuthorityDecision> = {},
): HsppCorroboratedOperationalAuthorityDecision {
  return {
    policyVersion: HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION,

    state: "OPERATIONAL_AUTHORITY_CANDIDATE",

    reason: "CORROBORATED_OPERATIONAL_PRECONDITIONS_MET",

    organizationId: "org-q4",

    assemblyId: "assembly-q4",

    assemblyDecisionId: "assembly-decision-q4",

    evidenceId: "target-evidence-q4",

    integrityFingerprint: "a".repeat(64),

    supportingEvidenceIds: ["support-evidence-q4"],

    independentSupportCount: 1,

    sourcePersistenceVersion: HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION,

    sourceAssessmentPolicyVersion: HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,

    trustState: "CORROBORATED",

    authority: "NONE",

    ...overrides,
  };
}

test("B7490-07Q4 grants operational eligibility only for the exact B11G2 candidate", () => {
  const result = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: candidate(),
  });

  assert.deepEqual(result, {
    policyVersion: HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION,

    trustState: "CORROBORATED",

    operationalEligible: true,

    crowdEligible: false,

    trainingEligible: false,

    validationEligible: false,

    reason: "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",
  });
});

test("B7490-07Q4 fails closed for a B11G2 denial while preserving established corroborated trust", () => {
  const denied = candidate({
    state: "OPERATIONAL_AUTHORITY_DENIED",

    reason: "TRUST_NOT_CORROBORATED",
  });

  const result = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: denied,
  });

  assert.equal(result.trustState, "CORROBORATED");

  assert.equal(result.operationalEligible, false);

  assert.equal(result.reason, "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED");

  assert.equal(result.crowdEligible, false);

  assert.equal(result.trainingEligible, false);

  assert.equal(result.validationEligible, false);
});

test("B7490-07Q4 rejects an unsupported B11G2 policy version", () => {
  const malformed = {
    ...candidate(),

    policyVersion: "unsupported-b11g2",
  } as unknown as HsppCorroboratedOperationalAuthorityDecision;

  const result = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: malformed,
  });

  assert.equal(result.operationalEligible, false);

  assert.equal(result.trustState, "CORROBORATED");

  assert.equal(result.reason, "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED");
});

test("B7490-07Q4 requires exact candidacy state reason authority and trust", () => {
  const malformedInputs: HsppCorroboratedOperationalAuthorityDecision[] = [
    {
      ...candidate(),

      reason: "TRUST_NOT_CORROBORATED",
    },

    {
      ...candidate(),

      authority: "OPERATIONAL",
    } as unknown as HsppCorroboratedOperationalAuthorityDecision,

    {
      ...candidate(),

      trustState: "VERIFIED",
    } as unknown as HsppCorroboratedOperationalAuthorityDecision,
  ];

  for (const authorityDecision of malformedInputs) {
    const result = assessHsppCorroboratedOperationalAuthority({
      authorityDecision,
    });

    assert.equal(result.operationalEligible, false);

    assert.equal(result.reason, "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED");
  }

  const invalidTrustResult = assessHsppCorroboratedOperationalAuthority({
    authorityDecision: malformedInputs[2],
  });

  assert.equal(invalidTrustResult.trustState, "UNASSESSED");
});

test("B7490-07Q4 requires the exact B11F6 persistence and B11F5 assessment provenance", () => {
  const malformedInputs: HsppCorroboratedOperationalAuthorityDecision[] = [
    {
      ...candidate(),

      sourcePersistenceVersion: "unsupported-persistence",
    },

    {
      ...candidate(),

      sourceAssessmentPolicyVersion: "unsupported-assessment",
    },
  ];

  for (const authorityDecision of malformedInputs) {
    const result = assessHsppCorroboratedOperationalAuthority({
      authorityDecision,
    });

    assert.equal(result.operationalEligible, false);

    assert.equal(result.reason, "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED");
  }
});

test("B7490-07Q4 validates immutable identity fingerprint and independent support", () => {
  const malformedInputs: HsppCorroboratedOperationalAuthorityDecision[] = [
    {
      ...candidate(),

      evidenceId: "   ",
    },

    {
      ...candidate(),

      integrityFingerprint: "INVALID",
    },

    {
      ...candidate(),

      independentSupportCount: 2,
    },

    {
      ...candidate(),

      supportingEvidenceIds: ["target-evidence-q4"],
    },

    {
      ...candidate(),

      supportingEvidenceIds: ["support-evidence-q4", "support-evidence-q4"],

      independentSupportCount: 2,
    },
  ];

  for (const authorityDecision of malformedInputs) {
    const result = assessHsppCorroboratedOperationalAuthority({
      authorityDecision,
    });

    assert.equal(result.operationalEligible, false);

    assert.equal(result.reason, "CORROBORATED_OPERATIONAL_AUTHORITY_DENIED");
  }
});

test("B7490-07Q4 assessment is deterministic and does not mutate the B11G2 decision", () => {
  const authorityDecision = candidate();

  const before = JSON.stringify(authorityDecision);

  const first = assessHsppCorroboratedOperationalAuthority({
    authorityDecision,
  });

  const second = assessHsppCorroboratedOperationalAuthority({
    authorityDecision,
  });

  assert.deepEqual(first, second);

  assert.equal(JSON.stringify(authorityDecision), before);
});
