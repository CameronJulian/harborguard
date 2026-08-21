import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroborationSupport.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B07J is explicitly versioned", () => {
  assert.match(
    source,
    /HSPP_SEALED_ASSEMBLY_CORROBORATION_SUPPORT_RUNNER_VERSION/,
  );

  assert.match(source, /hspp-sealed-assembly-corroboration-support-runner-v1/);
});

test("B07J invokes B07I exactly once", () => {
  const calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyAssessmentContext\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("B07J invokes B11F3 exactly once", () => {
  const calls =
    executableSource.match(
      /\bevaluateHsppAssemblyCorroborationSupport\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("B07J passes the exact B07I assessmentContext into B11F3", () => {
  assert.match(
    executableSource,
    /evaluateHsppAssemblyCorroborationSupport\s*\(\s*assessmentContextRun\.assessmentContext\s*,?\s*\)/s,
  );
});

test("B07J preserves B07I and B11F3 provenance", () => {
  assert.match(executableSource, /assessmentContextRun,/);

  assert.match(executableSource, /corroborationSupport,/);

  assert.match(
    executableSource,
    /assessmentContextRunnerVersion:\s*assessmentContextRun\.runnerVersion/s,
  );

  assert.match(
    executableSource,
    /corroborationSupportPolicyVersion:\s*corroborationSupport\.policyVersion/s,
  );
});

test("B07J performs no direct database access", () => {
  const forbidden = [
    /\.from\s*\(/,
    /\.select\s*\(/,
    /\.insert\s*\(/,
    /\.update\s*\(/,
    /\.upsert\s*\(/,
    /\.delete\s*\(/,
    /\.rpc\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test("B07J does not absorb B11F4 or B11F5", () => {
  assert.doesNotMatch(
    executableSource,
    /\bevaluateHsppMemberCorroboration\s*\(/,
  );

  assert.doesNotMatch(executableSource, /\bassessHsppCorroboratedMember\s*\(/);
});

test("B07J does not persist or apply assessment decisions", () => {
  assert.doesNotMatch(
    executableSource,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
  );

  assert.doesNotMatch(executableSource, /\bapplyHsppAssessmentDecision\s*\(/);
});

test("B07J grants no downstream eligibility or authority", () => {
  const forbidden = [
    /trustState\s*:/,
    /operationalEligible\s*:/,
    /crowdEligible\s*:/,
    /trainingEligible\s*:/,
    /validationEligible\s*:/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test("B07J introduces no API cron retry or scheduler behavior", () => {
  const forbidden = [
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bCRON_SECRET\b/,
    /\bsetInterval\s*\(/,
    /\bsetTimeout\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(executableSource, pattern);
  }
});
