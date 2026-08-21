import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_MEMBER_CORROBORATION_VERSION,
  type HsppMemberCorroborationDecision,
} from "../lib/hspp/evaluateHsppMemberCorroboration";

import {
  HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION,
  assessHsppCorroboratedMember,
} from "../lib/hspp/assessHsppCorroboratedMember";

const fingerprint =
  "a".repeat(64);

function eligible():
  HsppMemberCorroborationDecision {
  return {
    policyVersion:
      HSPP_MEMBER_CORROBORATION_VERSION,

    state:
      "MEMBER_CORROBORATION_ELIGIBLE",

    reason:
      "INDEPENDENT_SUPPORT_PRESENT",

    organizationId:
      "org-1",

    assemblyId:
      "assembly-1",

    assemblyDecisionId:
      "decision-1",

    targetEvidenceId:
      "evidence-a",

    targetIntegrityFingerprint:
      fingerprint,

    supportingEvidenceIds: [
      "evidence-b",
    ],

    independentSupportCount:
      1,

    authority:
      "NONE",
  };
}

test(
  "eligible independently supported member becomes CORROBORATED",
  () => {
    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          eligible(),
      });

    assert.equal(
      result.policyVersion,
      HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION
    );

    assert.equal(
      result.trustState,
      "CORROBORATED"
    );

    assert.equal(
      result.reason,
      "INDEPENDENT_CORROBORATION_ACCEPTED"
    );
  }
);

test(
  "CORROBORATED trust grants no operational authority",
  () => {
    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          eligible(),
      });

    assert.equal(
      result.operationalEligible,
      false
    );

    assert.equal(
      result.crowdEligible,
      false
    );

    assert.equal(
      result.trainingEligible,
      false
    );

    assert.equal(
      result.validationEligible,
      false
    );
  }
);

test(
  "denied member remains UNASSESSED",
  () => {
    const decision = {
      ...eligible(),

      state:
        "MEMBER_CORROBORATION_DENIED" as const,

      reason:
        "NO_INDEPENDENT_SUPPORT" as const,

      supportingEvidenceIds:
        [],

      independentSupportCount:
        0,
    };

    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED"
    );

    assert.equal(
      result.reason,
      "INDEPENDENT_CORROBORATION_DENIED"
    );
  }
);

test(
  "unsupported B11F4 policy version fails closed",
  () => {
    const decision = {
      ...eligible(),

      policyVersion:
        "unsupported-version" as
          typeof HSPP_MEMBER_CORROBORATION_VERSION,
    };

    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED"
    );
  }
);

test(
  "non-NONE upstream authority fails closed",
  () => {
    const decision = {
      ...eligible(),

      authority:
        "UNSAFE" as "NONE",
    };

    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED"
    );
  }
);

test(
  "invalid target fingerprint fails closed",
  () => {
    const decision = {
      ...eligible(),

      targetIntegrityFingerprint:
        "INVALID",
    };

    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED"
    );
  }
);

test(
  "zero independent support fails closed",
  () => {
    const decision = {
      ...eligible(),

      supportingEvidenceIds:
        [],

      independentSupportCount:
        0,
    };

    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED"
    );
  }
);

test(
  "support cardinality mismatch fails closed",
  () => {
    const decision = {
      ...eligible(),

      independentSupportCount:
        2,
    };

    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED"
    );
  }
);

test(
  "target cannot appear as its own supporter",
  () => {
    const decision = {
      ...eligible(),

      supportingEvidenceIds: [
        "evidence-a",
      ],
    };

    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED"
    );
  }
);

test(
  "duplicate supporter identity fails closed",
  () => {
    const decision = {
      ...eligible(),

      supportingEvidenceIds: [
        "evidence-b",
        "evidence-b",
      ],

      independentSupportCount:
        2,
    };

    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    assert.equal(
      result.trustState,
      "UNASSESSED"
    );
  }
);

test(
  "multiple independent supporters preserve same controlled trust result",
  () => {
    const decision = {
      ...eligible(),

      supportingEvidenceIds: [
        "evidence-b",
        "evidence-c",
      ],

      independentSupportCount:
        2,
    };

    const result =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    assert.equal(
      result.trustState,
      "CORROBORATED"
    );

    assert.equal(
      result.operationalEligible,
      false
    );
  }
);

test(
  "assessment is deterministic and does not mutate B11F4 decision",
  () => {
    const decision =
      eligible();

    const before =
      structuredClone(
        decision
      );

    const first =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    const second =
      assessHsppCorroboratedMember({
        corroborationDecision:
          decision,
      });

    assert.deepEqual(
      first,
      second
    );

    assert.deepEqual(
      decision,
      before
    );
  }
);