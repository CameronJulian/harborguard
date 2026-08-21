import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION,
  type HsppAssemblyCorroborationSupportResult,
} from "../lib/hspp/evaluateHsppAssemblyCorroborationSupport";

import {
  evaluateHsppMemberCorroboration,
  type EvaluateHsppMemberCorroborationInput,
} from "../lib/hspp/evaluateHsppMemberCorroboration";

const fingerprintA =
  "a".repeat(64);

const fingerprintB =
  "b".repeat(64);

const fingerprintC =
  "c".repeat(64);

function support():
  HsppAssemblyCorroborationSupportResult {
  return {
    policyVersion:
      HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION,

    state:
      "CORROBORATION_SUPPORTED",

    reason:
      "SUPPORTED_ASSESSMENT_CONTEXT",

    organizationId:
      "org-1",

    assemblyId:
      "assembly-1",

    assemblyDecisionId:
      "decision-1",

    assessmentContextVersion:
      "hspp-assembly-assessment-input-v1",

    evidenceCount:
      2,

    evidenceIds: [
      "evidence-a",
      "evidence-b",
    ],

    authority:
      "NONE",
  };
}

function input():
  EvaluateHsppMemberCorroborationInput {
  return {
    corroborationSupport:
      support(),

    targetEvidenceId:
      "evidence-a",

    targetIntegrityFingerprint:
      fingerprintA,

    members: [
      {
        evidenceId:
          "evidence-a",

        integrityFingerprint:
          fingerprintA,

        sourceProvider:
          "HERE",

        sourceClass:
          "external-intelligence",

        observedAt:
          "2026-08-21T09:00:00.000Z",

        integrityStatus:
          "MATCH",

        validationState:
          "VALIDATED",
      },
      {
        evidenceId:
          "evidence-b",

        integrityFingerprint:
          fingerprintB,

        sourceProvider:
          "TOMTOM",

        sourceClass:
          "external-intelligence",

        observedAt:
          "2026-08-21T09:01:00.000Z",

        integrityStatus:
          "MATCH",

        validationState:
          "VALIDATED",
      },
    ],

    relations: [
      {
        leftEvidenceId:
          "evidence-a",

        rightEvidenceId:
          "evidence-b",

        membershipEligible:
          true,

        membershipPolicyVersion:
          "hspp-assembly-membership-v1",

        canonicalRelation:
          "AGREE",
      },
    ],
  };
}

test(
  "independent compatible support makes target member eligible",
  () => {
    const result =
      evaluateHsppMemberCorroboration(
        input()
      );

    assert.equal(
      result.state,
      "MEMBER_CORROBORATION_ELIGIBLE"
    );

    assert.equal(
      result.reason,
      "INDEPENDENT_SUPPORT_PRESENT"
    );

    assert.deepEqual(
      result.supportingEvidenceIds,
      [
        "evidence-b",
      ]
    );

    assert.equal(
      result.independentSupportCount,
      1
    );

    assert.equal(
      result.authority,
      "NONE"
    );
  }
);

test(
  "unsupported B11F3 policy version fails closed",
  () => {
    const value =
      input();

    value.corroborationSupport = {
      ...value.corroborationSupport,

      policyVersion:
        "unsupported-version" as
          typeof HSPP_ASSEMBLY_CORROBORATION_SUPPORT_VERSION,
    };

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.state,
      "MEMBER_CORROBORATION_DENIED"
    );

    assert.equal(
      result.reason,
      "UNSUPPORTED_CORROBORATION_SUPPORT_VERSION"
    );
  }
);

test(
  "B11F3 no-support state fails closed",
  () => {
    const value =
      input();

    value.corroborationSupport = {
      ...value.corroborationSupport,

      state:
        "CORROBORATION_NOT_SUPPORTED",

      reason:
        "INSUFFICIENT_EVIDENCE",
    };

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.reason,
      "ASSEMBLY_CORROBORATION_NOT_SUPPORTED"
    );
  }
);

test(
  "target must be exact immutable assembly member",
  () => {
    const value =
      input();

    value.targetIntegrityFingerprint =
      fingerprintC;

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.reason,
      "TARGET_IDENTITY_MISMATCH"
    );
  }
);

test(
  "target integrity must currently MATCH",
  () => {
    const value =
      input();

    value.members[0] = {
      ...value.members[0],

      integrityStatus:
        "MISMATCH",
    };

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.reason,
      "TARGET_INTEGRITY_NOT_MATCH"
    );
  }
);

test(
  "target must currently be VALIDATED",
  () => {
    const value =
      input();

    value.members[0] = {
      ...value.members[0],

      validationState:
        "UNASSESSED",
    };

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.reason,
      "TARGET_NOT_VALIDATED"
    );
  }
);

test(
  "same-provider agreement alone cannot corroborate target",
  () => {
    const value =
      input();

    value.members[1] = {
      ...value.members[1],

      sourceProvider:
        "HERE",
    };

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.state,
      "MEMBER_CORROBORATION_DENIED"
    );

    assert.equal(
      result.reason,
      "SAME_PROVIDER_ONLY"
    );
  }
);

test(
  "membership-ineligible agreement cannot corroborate target",
  () => {
    const value =
      input();

    value.relations[0] = {
      ...value.relations[0],

      membershipEligible:
        false,
    };

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.reason,
      "NO_INDEPENDENT_SUPPORT"
    );
  }
);

test(
  "UNKNOWN canonical relation cannot corroborate target",
  () => {
    const value =
      input();

    value.relations[0] = {
      ...value.relations[0],

      canonicalRelation:
        "UNKNOWN",
    };

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.reason,
      "NO_INDEPENDENT_SUPPORT"
    );
  }
);

test(
  "canonical conflict involving target fails closed",
  () => {
    const value =
      input();

    value.relations[0] = {
      ...value.relations[0],

      canonicalRelation:
        "CONFLICT",
    };

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.state,
      "MEMBER_CORROBORATION_DENIED"
    );

    assert.equal(
      result.reason,
      "TARGET_CONFLICT_PRESENT"
    );
  }
);

test(
  "supporter integrity failure cannot corroborate target",
  () => {
    const value =
      input();

    value.members[1] = {
      ...value.members[1],

      integrityStatus:
        "MISMATCH",
    };

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.reason,
      "NO_INDEPENDENT_SUPPORT"
    );
  }
);

test(
  "supporter must be validated",
  () => {
    const value =
      input();

    value.members[1] = {
      ...value.members[1],

      validationState:
        "UNASSESSED",
    };

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.equal(
      result.reason,
      "NO_INDEPENDENT_SUPPORT"
    );
  }
);

test(
  "multiple independent supporters are returned deterministically",
  () => {
    const value =
      input();

    value.corroborationSupport = {
      ...value.corroborationSupport,

      evidenceCount:
        3,

      evidenceIds: [
        "evidence-a",
        "evidence-b",
        "evidence-c",
      ],
    };

    value.members.push({
      evidenceId:
        "evidence-c",

      integrityFingerprint:
        fingerprintC,

      sourceProvider:
        "TRACCAR",

      sourceClass:
        "telematics",

      observedAt:
        "2026-08-21T09:02:00.000Z",

      integrityStatus:
        "MATCH",

      validationState:
        "VALIDATED",
    });

    value.relations = [
      {
        leftEvidenceId:
          "evidence-a",

        rightEvidenceId:
          "evidence-c",

        membershipEligible:
          true,

        membershipPolicyVersion:
          "hspp-assembly-membership-v1",

        canonicalRelation:
          "AGREE",
      },
      {
        leftEvidenceId:
          "evidence-a",

        rightEvidenceId:
          "evidence-b",

        membershipEligible:
          true,

        membershipPolicyVersion:
          "hspp-assembly-membership-v1",

        canonicalRelation:
          "AGREE",
      },
    ];

    const result =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.deepEqual(
      result.supportingEvidenceIds,
      [
        "evidence-b",
        "evidence-c",
      ]
    );

    assert.equal(
      result.independentSupportCount,
      2
    );
  }
);

test(
  "B11F4 is deterministic and does not mutate its input",
  () => {
    const value =
      input();

    const before =
      structuredClone(
        value
      );

    const first =
      evaluateHsppMemberCorroboration(
        value
      );

    const second =
      evaluateHsppMemberCorroboration(
        value
      );

    assert.deepEqual(
      first,
      second
    );

    assert.deepEqual(
      value,
      before
    );
  }
);