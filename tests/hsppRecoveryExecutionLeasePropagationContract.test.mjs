import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const q12 = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting.ts",
  "utf8",
);

const q11 = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting.ts",
  "utf8",
);

const q10 = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting.ts",
  "utf8",
);

const q9 = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting.ts",
  "utf8",
);

test("Q12 Q11 Q10 and Q9 accept only optional recovery execution ownership", () => {
  for (const source of [q12, q11, q10, q9]) {
    assert.match(source, /HsppAssessmentExecutionLeaseContext/);
    assert.match(
      source,
      /executionLease\?\s*:\s*HsppAssessmentExecutionLeaseContext/,
    );

    assert.doesNotMatch(
      source,
      /\bacquireHsppAssemblyAssessmentExecutionLease\s*\(/,
    );
    assert.doesNotMatch(
      source,
      /\brenewHsppAssemblyAssessmentExecutionLease\s*\(/,
    );
    assert.doesNotMatch(
      source,
      /\breleaseHsppAssemblyAssessmentExecutionLease\s*\(/,
    );
  }
});

test("Q12 passes the exact recovery lease to Q11 and Q6", () => {
  const passes = q12.match(/executionLease:\s*input\.executionLease/g) ?? [];

  assert.equal(passes.length, 2);

  assert.match(
    q12,
    /runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting\s*\([\s\S]*?executionLease:\s*input\.executionLease/,
  );

  assert.match(
    q12,
    /persistHsppCorroboratedOperationalAssessment\s*\([\s\S]*?executionLease:\s*input\.executionLease/,
  );
});

test("Q11 passes the exact recovery lease to Q10", () => {
  const passes = q11.match(/executionLease:\s*input\.executionLease/g) ?? [];

  assert.equal(passes.length, 1);

  assert.match(
    q11,
    /runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting\s*\([\s\S]*?executionLease:\s*input\.executionLease/,
  );
});

test("Q10 passes the exact recovery lease to Q9", () => {
  const passes = q10.match(/executionLease:\s*input\.executionLease/g) ?? [];

  assert.equal(passes.length, 1);

  assert.match(
    q10,
    /runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting\s*\([\s\S]*?executionLease:\s*input\.executionLease/,
  );
});

test("Q9 passes the same recovery lease to both B11F6 and Q8", () => {
  const passes = q9.match(/executionLease:\s*input\.executionLease/g) ?? [];

  assert.equal(passes.length, 2);

  assert.match(
    q9,
    /persistHsppCorroboratedMemberAssessment\s*\([\s\S]*?executionLease:\s*input\.executionLease/,
  );

  assert.match(
    q9,
    /persistHsppDeniedCorroboratedMemberAssessment\s*\([\s\S]*?executionLease:\s*input\.executionLease/,
  );
});
