import assert from "node:assert/strict";
import test from "node:test";

import {
  HSPP_ASSEMBLY_AUTHORITY_VERSION,
  type HsppAssemblyAuthorityDecision,
} from "../lib/hspp/evaluateHsppAssemblyAuthority";

import {
  buildHsppAssemblyAssessmentInput,
} from "../lib/hspp/buildHsppAssemblyAssessmentInput";

const fingerprintA =
  "a".repeat(64);

const fingerprintB =
  "b".repeat(64);

const fingerprintC =
  "c".repeat(64);

function candidate():
  HsppAssemblyAuthorityDecision {
  return {
    policyVersion:
      HSPP_ASSEMBLY_AUTHORITY_VERSION,

    state:
      "ASSESSMENT_CANDIDATE",

    reason:
      "CONSISTENT_ASSEMBLY_CANDIDATE",

    assemblyDecisionId:
      "decision-1",

    assemblyId:
      "assembly-1",

    organizationId:
      "org-1",

    sourcePersistenceVersion:
      "hspp-assembly-decision-persistence-v1",

    sourceDecisionPolicyVersion:
      "hspp-assembly-decision-v1",

    sourceDecisionState:
      "CONSISTENT",

    sourceDecisionReason:
      "CANONICAL_AGREEMENT_WITHOUT_CONFLICT",

    authority:
      "NONE",
  };
}

function members() {
  return [
    {
      organizationId:
        "org-1",

      assemblyId:
        "assembly-1",

      evidenceId:
        "evidence-1",

      integrityFingerprint:
        fingerprintA,

      memberOrdinal:
        1,
    },
    {
      organizationId:
        "org-1",

      assemblyId:
        "assembly-1",

      evidenceId:
        "evidence-2",

      integrityFingerprint:
        fingerprintB,

      memberOrdinal:
        2,
    },
  ];
}

test(
  "assessment candidate becomes deterministic assessment context",
  () => {
    const result =
      buildHsppAssemblyAssessmentInput({
        authorityDecision:
          candidate(),

        members:
          members(),
      });

    assert.equal(
      result.contextVersion,
      "hspp-assembly-assessment-input-v1"
    );

    assert.equal(
      result.organizationId,
      "org-1"
    );

    assert.equal(
      result.assemblyId,
      "assembly-1"
    );

    assert.equal(
      result.assemblyDecisionId,
      "decision-1"
    );

    assert.equal(
      result.authorityState,
      "ASSESSMENT_CANDIDATE"
    );

    assert.equal(
      result.evidenceCount,
      2
    );

    assert.equal(
      result.authority,
      "NONE"
    );
  }
);

test(
  "denied B11F1 authority cannot enter assessment adapter",
  () => {
    const denied = {
      ...candidate(),

      state:
        "DENIED" as const,

      reason:
        "ASSEMBLY_CONFLICTED" as const,
    };

    assert.throws(
      () =>
        buildHsppAssemblyAssessmentInput({
          authorityDecision:
            denied,

          members:
            members(),
        }),
      /not an assessment candidate/
    );
  }
);

test(
  "unsupported authority policy fails closed",
  () => {
    const invalid = {
      ...candidate(),

      policyVersion:
        "unsupported-version" as
          typeof HSPP_ASSEMBLY_AUTHORITY_VERSION,
    };

    assert.throws(
      () =>
        buildHsppAssemblyAssessmentInput({
          authorityDecision:
            invalid,

          members:
            members(),
        }),
      /Unsupported HSPP assembly authority policy version/
    );
  }
);

test(
  "non-NONE authority fails closed",
  () => {
    const invalid = {
      ...candidate(),

      authority:
        "UNSAFE" as "NONE",
    };

    assert.throws(
      () =>
        buildHsppAssemblyAssessmentInput({
          authorityDecision:
            invalid,

          members:
            members(),
        }),
      /requires authority NONE/
    );
  }
);

test(
  "single-member assembly cannot enter assessment context",
  () => {
    assert.throws(
      () =>
        buildHsppAssemblyAssessmentInput({
          authorityDecision:
            candidate(),

          members: [
            members()[0],
          ],
        }),
      /at least two evidence members/
    );
  }
);

test(
  "member organization must match authority provenance",
  () => {
    const invalid =
      members();

    invalid[1] = {
      ...invalid[1],

      organizationId:
        "org-2",
    };

    assert.throws(
      () =>
        buildHsppAssemblyAssessmentInput({
          authorityDecision:
            candidate(),

          members:
            invalid,
        }),
      /member organization does not match/
    );
  }
);

test(
  "member assembly must match authority provenance",
  () => {
    const invalid =
      members();

    invalid[1] = {
      ...invalid[1],

      assemblyId:
        "assembly-2",
    };

    assert.throws(
      () =>
        buildHsppAssemblyAssessmentInput({
          authorityDecision:
            candidate(),

          members:
            invalid,
        }),
      /member assembly does not match/
    );
  }
);

test(
  "invalid fingerprint fails closed",
  () => {
    const invalid =
      members();

    invalid[1] = {
      ...invalid[1],

      integrityFingerprint:
        "INVALID",
    };

    assert.throws(
      () =>
        buildHsppAssemblyAssessmentInput({
          authorityDecision:
            candidate(),

          members:
            invalid,
        }),
      /lowercase SHA-256/
    );
  }
);

test(
  "duplicate evidence identity fails closed",
  () => {
    const invalid =
      members();

    invalid[1] = {
      ...invalid[1],

      evidenceId:
        "evidence-1",
    };

    assert.throws(
      () =>
        buildHsppAssemblyAssessmentInput({
          authorityDecision:
            candidate(),

          members:
            invalid,
        }),
      /duplicate evidence identity/
    );
  }
);

test(
  "duplicate immutable fingerprint fails closed",
  () => {
    const invalid =
      members();

    invalid[1] = {
      ...invalid[1],

      integrityFingerprint:
        fingerprintA,
    };

    assert.throws(
      () =>
        buildHsppAssemblyAssessmentInput({
          authorityDecision:
            candidate(),

          members:
            invalid,
        }),
      /duplicate immutable evidence fingerprint/
    );
  }
);

test(
  "gapped member ordinals fail closed",
  () => {
    const invalid =
      members();

    invalid[1] = {
      ...invalid[1],

      memberOrdinal:
        3,
    };

    assert.throws(
      () =>
        buildHsppAssemblyAssessmentInput({
          authorityDecision:
            candidate(),

          members:
            invalid,
        }),
      /contiguous deterministic ordinals/
    );
  }
);

test(
  "input ordering does not change assessment context",
  () => {
    const ordered =
      members();

    const reversed = [
      ordered[1],
      ordered[0],
    ];

    assert.deepEqual(
      buildHsppAssemblyAssessmentInput({
        authorityDecision:
          candidate(),

        members:
          ordered,
      }),
      buildHsppAssemblyAssessmentInput({
        authorityDecision:
          candidate(),

        members:
          reversed,
      })
    );
  }
);

test(
  "three-member context preserves exact deterministic identities",
  () => {
    const inputMembers = [
      ...members(),
      {
        organizationId:
          "org-1",

        assemblyId:
          "assembly-1",

        evidenceId:
          "evidence-3",

        integrityFingerprint:
          fingerprintC,

        memberOrdinal:
          3,
      },
    ];

    const result =
      buildHsppAssemblyAssessmentInput({
        authorityDecision:
          candidate(),

        members:
          inputMembers,
      });

    assert.equal(
      result.evidenceCount,
      3
    );

    assert.deepEqual(
      result.evidence.map(
        item =>
          item.evidenceId
      ),
      [
        "evidence-1",
        "evidence-2",
        "evidence-3",
      ]
    );
  }
);

test(
  "adapter does not mutate authority or member inputs",
  () => {
    const authority =
      candidate();

    const inputMembers =
      members();

    const authorityBefore =
      structuredClone(
        authority
      );

    const membersBefore =
      structuredClone(
        inputMembers
      );

    buildHsppAssemblyAssessmentInput({
      authorityDecision:
        authority,

      members:
        inputMembers,
    });

    assert.deepEqual(
      authority,
      authorityBefore
    );

    assert.deepEqual(
      inputMembers,
      membersBefore
    );
  }
);