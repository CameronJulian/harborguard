import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const evaluator =
  fs.readFileSync(
    "lib/hspp/evaluateHsppPostPositiveMemberUnsuitability.ts",
    "utf8",
  );

test(
  "post-positive evaluator reuses canonical operational-use policy",
  () => {
    assert.match(
      evaluator,
      /decideHsppOperationalUse/,
    );

    assert.match(
      evaluator,
      /decideHsppOperationalUse\(\s*currentEvidence\s*,?\s*\)/,
    );
  },
);

test(
  "post-positive evaluator uses exact Q14v policy identity",
  () => {
    assert.match(
      evaluator,
      /hspp-post-positive-member-unsuitability-v1/,
    );

    assert.match(
      evaluator,
      /POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION/,
    );
  },
);

test(
  "post-positive evaluator distinguishes suitable unsuitable and indeterminate",
  () => {
    assert.match(
      evaluator,
      /"SUITABLE"/,
    );

    assert.match(
      evaluator,
      /"UNSUITABLE"/,
    );

    assert.match(
      evaluator,
      /"INDETERMINATE"/,
    );
  },
);

test(
  "irreversible v1 unsuitability requires current integrity loss",
  () => {
    assert.match(
      evaluator,
      /CURRENT_INTEGRITY_IDENTITY_CHANGED/,
    );

    assert.match(
      evaluator,
      /CURRENT_INTEGRITY_NOT_VERIFIED/,
    );

    assert.match(
      evaluator,
      /currentEvidence\.evidence\.integrityFingerprint\s*!==\s*workItem\.integrityFingerprint/,
    );

    assert.match(
      evaluator,
      /currentEvidence\.verification\.status\s*!==\s*"MATCH"/,
    );
  },
);

test(
  "ordinary operational denials remain indeterminate",
  () => {
    assert.match(
      evaluator,
      /CURRENT_VALIDATION_NOT_VALIDATED/,
    );

    assert.match(
      evaluator,
      /CURRENT_ASSESSMENT_MISSING/,
    );

    assert.match(
      evaluator,
      /CURRENT_TRUST_NOT_OPERATIONAL/,
    );

    assert.match(
      evaluator,
      /CURRENT_OPERATIONAL_NOT_ELIGIBLE/,
    );
  },
);

test(
  "pure evaluator has no persistence network lease reservoir or reconstruction authority",
  () => {
    assert.doesNotMatch(
      evaluator,
      /supabase/,
    );

    assert.doesNotMatch(
      evaluator,
      /\.rpc\(/,
    );

    assert.doesNotMatch(
      evaluator,
      /\.from\(/,
    );

    assert.doesNotMatch(
      evaluator,
      /persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease/,
    );

    assert.doesNotMatch(
      evaluator,
      /persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease/,
    );

    assert.doesNotMatch(
      evaluator,
      /acquireHsppAssemblyAssessmentExecutionLease/,
    );

    assert.doesNotMatch(
      evaluator,
      /runHsppReservoirReevaluation/,
    );

    assert.doesNotMatch(
      evaluator,
      /runHsppReconstructionActivationCycle/,
    );
  },
);
