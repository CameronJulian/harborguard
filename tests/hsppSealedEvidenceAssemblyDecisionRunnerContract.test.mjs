import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyDecision.ts",
  "utf8",
);

test("B07F is explicitly versioned", () => {
  assert.match(source, /HSPP_SEALED_ASSEMBLY_DECISION_RUNNER_VERSION/);

  assert.match(source, /hspp-sealed-assembly-decision-runner-v1/);
});

test("B07F composes B07E then B11D exactly once", () => {
  const scanRuns =
    source.match(/await\s+runHsppSealedEvidenceAssemblyScan\s*\(/g) ?? [];

  const decisions = source.match(/\bevaluateHsppAssemblyDecision\s*\(/g) ?? [];

  assert.equal(scanRuns.length, 1);

  assert.equal(decisions.length, 1);

  assert.match(
    source,
    /evaluateHsppAssemblyDecision\(\s*scanRun\.scan\s*,?\s*\)/s,
  );
});

test("B07F preserves complete scan-run and decision provenance", () => {
  assert.match(source, /HSPP_SEALED_ASSEMBLY_SCAN_RUNNER_VERSION/);

  assert.match(source, /HSPP_ASSEMBLY_DECISION_VERSION/);

  assert.match(source, /scanRunnerVersion:\s*scanRun\.runnerVersion/s);

  assert.match(source, /readerVersion:\s*scanRun\.readerVersion/s);

  assert.match(source, /scanVersion:\s*scanRun\.scanVersion/s);

  assert.match(source, /decisionPolicyVersion:\s*decision\.policyVersion/s);

  assert.match(source, /scanRun,/);

  assert.match(source, /decision,/);
});

test("B07F does not persist B11E decisions", () => {
  assert.doesNotMatch(source, /\bpersistHsppAssemblyDecision\s*\(/);

  assert.doesNotMatch(
    source,
    /\.from\s*\(\s*["']hspp_assembly_decisions["']\s*\)/,
  );
});

test("B07F does not absorb assembly authority or assessment stages", () => {
  assert.doesNotMatch(source, /\bevaluateHsppAssemblyAuthority\s*\(/);

  assert.doesNotMatch(source, /\bpersistHsppCorroboratedMemberAssessment\s*\(/);

  assert.doesNotMatch(source, /\bapplyHsppAssessmentDecision\s*\(/);
});

test("B07F contains no direct database mutation", () => {
  const forbidden = [
    /\.insert\s*\(/,
    /\.update\s*\(/,
    /\.upsert\s*\(/,
    /\.delete\s*\(/,
    /\.rpc\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});

test("B07F grants no downstream authority", () => {
  assert.match(source, /does NOT/i);

  assert.match(source, /Route Safety authority/);

  assert.match(source, /Crowd Intelligence eligibility/);

  assert.match(source, /ML training or validation eligibility/);
});

test("B07F introduces no API cron retry or scheduling behavior", () => {
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
