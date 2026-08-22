import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyMemberCorroboration.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B07K is an explicitly versioned orchestration boundary", () => {
  assert.match(source, /hspp-sealed-assembly-member-corroboration-runner-v1/);

  assert.match(source, /runHsppSealedEvidenceAssemblyMemberCorroboration/);
});

test("B07K invokes B07J exactly once", () => {
  const calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyCorroborationSupport\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("B07K invokes N3 and existing B11F4 exactly once", () => {
  const reductions =
    executableSource.match(/\breduceHsppCanonicalPairRelation\s*\(/g) ?? [];

  const evaluations =
    executableSource.match(/\bevaluateHsppMemberCorroboration\s*\(/g) ?? [];

  assert.equal(reductions.length, 1);

  assert.equal(evaluations.length, 1);
});

test("B07K uses the exact retained B07J provenance paths", () => {
  assert.match(
    executableSource,
    /supportRun\s*\.assessmentContextRun\s*\.membershipRelation/s,
  );

  assert.match(
    executableSource,
    /supportRun\s*\.assessmentContextRun\s*\.authority\s*\.decisionPersistence\s*\.decisionRun\s*\.scanRun/s,
  );

  assert.match(executableSource, /scanRun\.read\.verifiedMembers/);

  assert.match(executableSource, /scanRun\.scan\.pairScans/);

  assert.match(executableSource, /supportRun\.corroborationSupport/);
});

test("B07K selects only deterministic persisted ordinal one", () => {
  assert.match(
    source,
    /HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL\s*=\s*1\s+as const/,
  );

  assert.match(
    executableSource,
    /member\.memberOrdinal\s*===\s*HSPP_SEALED_ASSEMBLY_MEMBER_CORROBORATION_TARGET_ORDINAL/,
  );

  assert.match(source, /exactly one verified member at ordinal 1/);
});

test("B07K maps B07D verified member metadata without database reread", () => {
  for (const field of [
    "evidenceId",
    "integrityFingerprint",
    "sourceProvider",
    "sourceClass",
    "observedAt",
    "integrityStatus",
    "validationState",
  ]) {
    assert.match(executableSource, new RegExp(`member\\.${field}`));
  }
});

test("B07K maps the exact persisted B11A2 relation into B11F4", () => {
  assert.match(
    executableSource,
    /leftEvidenceId:\s*membershipRelation\.firstEvidenceId/,
  );

  assert.match(
    executableSource,
    /rightEvidenceId:\s*membershipRelation\.secondEvidenceId/,
  );

  assert.match(
    executableSource,
    /membershipEligible:\s*membershipRelation\.membershipEligible/,
  );

  assert.match(
    executableSource,
    /membershipPolicyVersion:\s*membershipRelation\.membershipPolicyVersion/,
  );

  assert.match(
    executableSource,
    /canonicalRelation:\s*pairRelationReduction\.canonicalRelation/,
  );

  assert.doesNotMatch(executableSource, /membershipRelation\.membershipReason/);

  assert.doesNotMatch(executableSource, /membershipRelation\.distanceMeters/);

  assert.doesNotMatch(executableSource, /membershipRelation\.timeDeltaMs/);
});

test("B07K fails closed rather than fabricating absent B11A2 provenance", () => {
  assert.match(executableSource, /if\s*\(\s*!membershipRelation\s*\)/);

  assert.match(
    source,
    /requires persisted B11A2 membership relation provenance/,
  );

  assert.doesNotMatch(
    executableSource,
    /\bevaluateHsppAssemblyMembership\s*\(/,
  );
});

test("B07K grants no trust authority persistence or scheduling behavior", () => {
  for (const pattern of [
    /\bassessHsppCorroboratedMember\s*\(/,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
    /\bapplyHsppAssessmentDecision\s*\(/,
    /\btrustState\s*:/,
    /\boperationalEligible\s*:/,
    /\bcrowdEligible\s*:/,
    /\btrainingEligible\s*:/,
    /\bvalidationEligible\s*:/,
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
