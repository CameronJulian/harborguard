import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyDecisionPersistence.ts",
  "utf8",
);

test("B07G is explicitly versioned", () => {
  assert.match(
    source,
    /HSPP_SEALED_ASSEMBLY_DECISION_PERSISTENCE_RUNNER_VERSION/,
  );

  assert.match(source, /hspp-sealed-assembly-decision-persistence-runner-v1/);
});

test("B07G composes B07F then B11E exactly once", () => {
  const decisionRuns =
    source.match(/await\s+runHsppSealedEvidenceAssemblyDecision\s*\(/g) ?? [];

  const persistenceCalls =
    source.match(/await\s+persistHsppAssemblyDecision\s*\(/g) ?? [];

  assert.equal(decisionRuns.length, 1);

  assert.equal(persistenceCalls.length, 1);
});

test("B07G passes exact B07F identity scan and decision into B11E", () => {
  assert.match(source, /organizationId:\s*decisionRun\.organizationId/s);

  assert.match(source, /assemblyId:\s*decisionRun\.assemblyId/s);

  assert.match(source, /scan:\s*decisionRun\.scanRun\.scan/s);

  assert.match(source, /decision:\s*decisionRun\.decision/s);
});

test("B07G preserves B07F and B11E provenance", () => {
  assert.match(source, /decisionRun,/);

  assert.match(source, /persistedDecision,/);

  assert.match(
    source,
    /persistenceVersion:\s*persistedDecision\.persistenceVersion/s,
  );

  assert.match(source, /decisionRunnerVersion:\s*decisionRun\.runnerVersion/s);

  assert.match(source, /scanRunnerVersion:\s*decisionRun\.scanRunnerVersion/s);

  assert.match(source, /readerVersion:\s*decisionRun\.readerVersion/s);
});

test("B07G contains no direct database persistence implementation", () => {
  const forbidden = [
    /\.insert\s*\(/,
    /\.update\s*\(/,
    /\.upsert\s*\(/,
    /\.delete\s*\(/,
    /\.rpc\s*\(/,
    /\.from\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});

test("B07G does not reimplement B11C B11D or B11E", () => {
  assert.doesNotMatch(source, /\bscanHsppEvidenceAssembly\s*\(/);

  assert.doesNotMatch(source, /\bevaluateHsppAssemblyDecision\s*\(/);

  assert.doesNotMatch(source, /error\.code\s*!==?\s*["']23505["']/);

  assert.doesNotMatch(
    source,
    /hspp_assembly_decisions_logical_identity_unique/,
  );
});

test("B07G does not absorb downstream authority or assessment stages", () => {
  assert.doesNotMatch(source, /\bevaluateHsppAssemblyAuthority\s*\(/);

  assert.doesNotMatch(source, /\bpersistHsppCorroboratedMemberAssessment\s*\(/);

  assert.doesNotMatch(source, /\bapplyHsppAssessmentDecision\s*\(/);
});

test("B07G grants no trust eligibility or operational authority", () => {
  assert.match(source, /does NOT/i);

  assert.match(source, /Route Safety authority/);

  assert.match(source, /Crowd Intelligence eligibility/);

  assert.match(source, /ML training or validation eligibility/);

  assert.doesNotMatch(source, /operationalEligible\s*:/);

  assert.doesNotMatch(source, /crowdEligible\s*:/);

  assert.doesNotMatch(source, /trainingEligible\s*:/);

  assert.doesNotMatch(source, /validationEligible\s*:/);
});

test("B07G does not implement reversible lifecycle stages", () => {
  const forbidden = [
    /\bdisassemble\w*\s*\(/,
    /\bdetach\w*\s*\(/,
    /\breconstruct\w*\s*\(/,
    /\bsupersede\w*\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});

test("B07G introduces no API cron retry or scheduling execution", () => {
  const forbidden = [
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bCRON_SECRET\b/,
    /\bsetInterval\s*\(/,
    /\bsetTimeout\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});
