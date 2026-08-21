import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyAuthority.ts",
  "utf8",
);

/*
 * Executable-source view:
 *
 * Contract checks that count calls or prohibit executable coupling
 * must ignore explanatory comments. B07H intentionally documents
 * several downstream functions that it does NOT invoke.
 */
const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B07H is explicitly versioned", () => {
  assert.match(source, /HSPP_SEALED_ASSEMBLY_AUTHORITY_RUNNER_VERSION/);

  assert.match(source, /hspp-sealed-assembly-authority-runner-v1/);
});

test("B07H composes B07G exactly once", () => {
  const calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyDecisionPersistence\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("B07H evaluates B11F1 exactly once", () => {
  const calls =
    executableSource.match(/\bevaluateHsppAssemblyAuthority\s*\(/g) ?? [];

  assert.equal(calls.length, 1);
});

test("B07H passes the exact B07G persisted decision into B11F1", () => {
  assert.match(
    executableSource,
    /evaluateHsppAssemblyAuthority\s*\(\s*decisionPersistence\.persistedDecision\s*,?\s*\)/s,
  );
});

test("B07H preserves complete B07G and authority provenance", () => {
  assert.match(executableSource, /decisionPersistence,/);

  assert.match(executableSource, /authorityDecision,/);

  assert.match(
    executableSource,
    /decisionPersistenceRunnerVersion:\s*decisionPersistence\.runnerVersion/s,
  );

  assert.match(
    executableSource,
    /authorityPolicyVersion:\s*authorityDecision\.policyVersion/s,
  );
});

test("B07H performs no direct database access", () => {
  const forbidden = [
    /\.from\s*\(/,
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

test("B07H does not absorb B11F2 assessment-context construction", () => {
  assert.doesNotMatch(
    executableSource,
    /\bbuildHsppAssemblyAssessmentInput\s*\(/,
  );

  assert.doesNotMatch(executableSource, /\bHsppAssemblyAssessmentMember\b/);
});

test("B07H does not persist or apply member assessment", () => {
  assert.doesNotMatch(
    executableSource,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
  );

  assert.doesNotMatch(executableSource, /\bapplyHsppAssessmentDecision\s*\(/);
});

test("B07H grants no operational or downstream eligibility", () => {
  assert.doesNotMatch(executableSource, /operationalEligible\s*:/);

  assert.doesNotMatch(executableSource, /crowdEligible\s*:/);

  assert.doesNotMatch(executableSource, /trainingEligible\s*:/);

  assert.doesNotMatch(executableSource, /validationEligible\s*:/);
});

test("B07H contains no API cron or scheduling behavior", () => {
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
