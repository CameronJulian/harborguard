import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION,
  type HsppAssemblyAssessmentInput,
} from "../lib/hspp/buildHsppAssemblyAssessmentInput";

import {
  evaluateHsppAssemblyCorroborationSupport,
} from "../lib/hspp/evaluateHsppAssemblyCorroborationSupport";

const fingerprintA =
  "a".repeat(64);

const fingerprintB =
  "b".repeat(64);

function context():
  HsppAssemblyAssessmentInput {
  return {
    contextVersion:
      HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION,

    organizationId:
      "org-1",

    assemblyId:
      "assembly-1",

    assemblyDecisionId:
      "decision-1",

    authorityPolicyVersion:
      "hspp-assembly-authority-v1",

    authorityState:
      "ASSESSMENT_CANDIDATE",

    authorityReason:
      "CONSISTENT_ASSEMBLY_CANDIDATE",

    evidenceCount:
      2,

    evidence: [
      {
        evidenceId:
          "evidence-1",

        integrityFingerprint:
          fingerprintA,

        memberOrdinal:
          1,
      },
      {
        evidenceId:
          "evidence-2",

        integrityFingerprint:
          fingerprintB,

        memberOrdinal:
          2,
      },
    ],

    authority:
      "NONE",
  };
}

test(
  "valid B11F2 context supports later corroboration assessment",
  () => {
    const output =
      evaluateHsppAssemblyCorroborationSupport(
        context()
      );

    assert.equal(
      output.state,
      "CORROBORATION_SUPPORTED"
    );

    assert.equal(
      output.reason,
      "SUPPORTED_ASSESSMENT_CONTEXT"
    );

    assert.equal(
      output.authority,
      "NONE"
    );

    assert.deepEqual(
      output.evidenceIds,
      [
        "evidence-1",
        "evidence-2",
      ]
    );
  }
);

test(
  "unsupported B11F2 context version fails closed",
  () => {
    const input = {
      ...context(),

      contextVersion:
        "unsupported-context" as
          typeof HSPP_ASSEMBLY_ASSESSMENT_INPUT_VERSION,
    };

    const output =
      evaluateHsppAssemblyCorroborationSupport(
        input
      );

    assert.equal(
      output.state,
      "CORROBORATION_NOT_SUPPORTED"
    );

    assert.equal(
      output.reason,
      "UNSUPPORTED_ASSESSMENT_CONTEXT_VERSION"
    );
  }
);

test(
  "non-candidate context does not support corroboration",
  () => {
    const input = {
      ...context(),

      authorityState:
        "DENIED" as
          "ASSESSMENT_CANDIDATE",
    };

    const output =
      evaluateHsppAssemblyCorroborationSupport(
        input
      );

    assert.equal(
      output.state,
      "CORROBORATION_NOT_SUPPORTED"
    );

    assert.equal(
      output.reason,
      "ASSESSMENT_CONTEXT_NOT_CANDIDATE"
    );
  }
);

test(
  "non-NONE authority fails closed",
  () => {
    const input = {
      ...context(),

      authority:
        "UNSAFE" as "NONE",
    };

    const output =
      evaluateHsppAssemblyCorroborationSupport(
        input
      );

    assert.equal(
      output.state,
      "CORROBORATION_NOT_SUPPORTED"
    );

    assert.equal(
      output.reason,
      "AUTHORITY_NOT_NONE"
    );
  }
);

test(
  "single-member context cannot support corroboration",
  () => {
    const base =
      context();

    const input = {
      ...base,

      evidenceCount:
        1,

      evidence: [
        base.evidence[0],
      ],
    };

    const output =
      evaluateHsppAssemblyCorroborationSupport(
        input
      );

    assert.equal(
      output.state,
      "CORROBORATION_NOT_SUPPORTED"
    );

    assert.equal(
      output.reason,
      "INSUFFICIENT_EVIDENCE"
    );
  }
);

test(
  "evidence cardinality mismatch fails closed",
  () => {
    const input = {
      ...context(),

      evidenceCount:
        3,
    };

    const output =
      evaluateHsppAssemblyCorroborationSupport(
        input
      );

    assert.equal(
      output.state,
      "CORROBORATION_NOT_SUPPORTED"
    );

    assert.equal(
      output.reason,
      "INSUFFICIENT_EVIDENCE"
    );
  }
);

test(
  "invalid deterministic member ordinal fails closed",
  () => {
    const base =
      context();

    const input = {
      ...base,

      evidence: [
        base.evidence[0],
        {
          ...base.evidence[1],

          memberOrdinal:
            3,
        },
      ],
    };

    const output =
      evaluateHsppAssemblyCorroborationSupport(
        input
      );

    assert.equal(
      output.state,
      "CORROBORATION_NOT_SUPPORTED"
    );

    assert.equal(
      output.reason,
      "INVALID_EVIDENCE_MEMBERSHIP"
    );
  }
);

test(
  "invalid immutable fingerprint fails closed",
  () => {
    const base =
      context();

    const input = {
      ...base,

      evidence: [
        base.evidence[0],
        {
          ...base.evidence[1],

          integrityFingerprint:
            "INVALID",
        },
      ],
    };

    const output =
      evaluateHsppAssemblyCorroborationSupport(
        input
      );

    assert.equal(
      output.state,
      "CORROBORATION_NOT_SUPPORTED"
    );

    assert.equal(
      output.reason,
      "INVALID_EVIDENCE_MEMBERSHIP"
    );
  }
);

test(
  "duplicate evidence identity fails closed",
  () => {
    const base =
      context();

    const input = {
      ...base,

      evidence: [
        base.evidence[0],
        {
          ...base.evidence[1],

          evidenceId:
            "evidence-1",
        },
      ],
    };

    const output =
      evaluateHsppAssemblyCorroborationSupport(
        input
      );

    assert.equal(
      output.state,
      "CORROBORATION_NOT_SUPPORTED"
    );

    assert.equal(
      output.reason,
      "DUPLICATE_EVIDENCE_IDENTITY"
    );
  }
);

test(
  "support evaluation is deterministic and does not mutate context",
  () => {
    const input =
      context();

    const before =
      structuredClone(
        input
      );

    const first =
      evaluateHsppAssemblyCorroborationSupport(
        input
      );

    const second =
      evaluateHsppAssemblyCorroborationSupport(
        input
      );

    assert.deepEqual(
      first,
      second
    );

    assert.deepEqual(
      input,
      before
    );
  }
);