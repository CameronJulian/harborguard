import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/reduceHsppCanonicalPairRelation.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B7490-07N3 is an explicitly versioned pair-relation boundary", () => {
  assert.match(source, /hspp-canonical-pair-relation-reduction-v1/);

  assert.match(source, /reduceHsppCanonicalPairRelation/);
});

test("B7490-07N3 consumes the existing B11C pair scan", () => {
  assert.match(source, /HsppAssemblyPairScan/);

  assert.match(executableSource, /pairScan\.comparisons/);

  assert.match(executableSource, /pairScan\.contradictory/);
});

test("B7490-07N3 preserves conflict then agreement then unknown precedence", () => {
  const conflictIndex = executableSource.indexOf("if (conflictCount > 0)");

  const agreementIndex = executableSource.indexOf(
    "else if (agreementCount > 0)",
  );

  assert.ok(conflictIndex >= 0, "conflict reduction must exist");

  assert.ok(
    agreementIndex > conflictIndex,
    "agreement must be evaluated only after conflict",
  );

  assert.match(executableSource, /canonicalRelation[\s\S]*"UNKNOWN"/);

  assert.match(executableSource, /canonicalRelation[\s\S]*"CONFLICT"/);

  assert.match(executableSource, /canonicalRelation[\s\S]*"AGREE"/);
});

test("B7490-07N3 rejects internally inconsistent B11C provenance", () => {
  assert.match(executableSource, /pairScan\.contradictory\s*!==\s*hasConflict/);

  assert.match(
    source,
    /contradictory flag does not match its comparison outcomes/,
  );
});

test("B7490-07N3 grants no trust or authority", () => {
  assert.match(source, /authority:\s*"NONE"/);

  assert.doesNotMatch(executableSource, /\btrustState\s*:/);

  assert.doesNotMatch(executableSource, /\boperationalEligible\s*:/);

  assert.doesNotMatch(executableSource, /\bcrowdEligible\s*:/);

  assert.doesNotMatch(executableSource, /\btrainingEligible\s*:/);

  assert.doesNotMatch(executableSource, /\bvalidationEligible\s*:/);
});

test("B7490-07N3 does not absorb B11A2 B11F4 or persistence", () => {
  for (const pattern of [
    /\bevaluateHsppAssemblyMembership\s*\(/,
    /\bevaluateHsppCanonicalContradiction\s*\(/,
    /\bscanHsppEvidenceAssembly\s*\(/,
    /\bevaluateHsppMemberCorroboration\s*\(/,
    /\bassessHsppCorroboratedMember\s*\(/,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
    /\bapplyHsppAssessmentDecision\s*\(/,
    /\.\s*from\s*\(\s*["'`]/,
    /\.select\s*\(/,
    /\.insert\s*\(/,
    /\.update\s*\(/,
    /\.upsert\s*\(/,
    /\.delete\s*\(/,
    /\.rpc\s*\(/,
    /\bfetch\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, pattern);
  }
});
