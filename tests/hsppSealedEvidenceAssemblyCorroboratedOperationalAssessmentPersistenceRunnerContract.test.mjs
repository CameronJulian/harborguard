import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B7490-07Q7 is an explicitly versioned persistence-runner boundary", () => {
  assert.match(
    source,
    /hspp-sealed-assembly-corroborated-operational-assessment-persistence-runner-v1/,
  );

  assert.match(
    source,
    /runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence/,
  );
});

test("B7490-07Q7 composes Q5 then Q6 exactly once", () => {
  const q5Calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment\s*\(/g,
    ) ?? [];

  const q6Calls =
    executableSource.match(
      /await\s+persistHsppCorroboratedOperationalAssessment\s*\(/g,
    ) ?? [];

  assert.equal(q5Calls.length, 1);

  assert.equal(q6Calls.length, 1);
});

test("B7490-07Q7 passes the exact Q5 authority decision and assessment into Q6", () => {
  assert.match(
    executableSource,
    /const\s+authorityDecision\s*=\s*operationalAssessmentRun\.authorityDecision/,
  );

  assert.match(
    executableSource,
    /const\s+assessment\s*=\s*operationalAssessmentRun\.operationalAssessment/,
  );

  assert.match(
    executableSource,
    /authorityDecision:\s*preparation\.authorityDecision/,
  );

  assert.match(executableSource, /assessment:\s*preparation\.assessment/);
});

test("B7490-07Q7 preserves caller-controlled retry identity through Q5 and Q6", () => {
  assert.match(source, /\bassessedAt\s*:\s*string\s*;/);

  const passthroughs =
    executableSource.match(/assessedAt:\s*input\.assessedAt/g) ?? [];

  assert.equal(passthroughs.length, 1);

  assert.match(
    executableSource,
    /prepareHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence\s*\(\s*operationalAssessmentRun,\s*input\.assessedAt,\s*\)/s,
  );

  assert.match(executableSource, /assessedAt:\s*preparation\.assessedAt/);

  assert.doesNotMatch(executableSource, /\bDate\.now\s*\(/);

  assert.doesNotMatch(executableSource, /\bnew\s+Date\s*\(/);

  assert.doesNotMatch(executableSource, /\.toISOString\s*\(/);
});

test("B7490-07Q7 preserves complete Q5 and Q6 provenance", () => {
  for (const field of [
    "operationalAssessmentRun",
    "persistedOperationalAssessment",
    "operationalAssessmentRunnerVersion",
    "persistenceVersion",
    "organizationId",
    "assemblyId",
    "targetMemberOrdinal",
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }
});

test("B7490-07Q7 contains no direct database or generic persistence implementation", () => {
  assert.doesNotMatch(executableSource, /\bapplyHsppAssessmentDecision\s*\(/);

  assert.doesNotMatch(
    executableSource,
    /\.(from|select|insert|update|upsert|delete|rpc)\s*\(/,
  );
});

test("B7490-07Q7 does not bypass Q5 or Q6 by rerunning lower authority stages", () => {
  assert.doesNotMatch(
    executableSource,
    /\bassessHsppCorroboratedOperationalAuthority\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /\bevaluateHsppCorroboratedOperationalAuthority\s*\(/,
  );
});

test("B7490-07Q7 constructs no trust or downstream eligibility", () => {
  assert.doesNotMatch(executableSource, /\boperationalEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\bcrowdEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\btrainingEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\bvalidationEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\btrustState\s*:\s*"VERIFIED"/);
});

test("B7490-07Q7 introduces no API UI cron queue retry or scheduler execution", () => {
  for (const forbidden of [
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bfetch\s*\(/,
    /\bsetTimeout\s*\(/,
    /\bsetInterval\s*\(/,
    /\bCRON_SECRET\b/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q7 explicitly stops immediately after Q6 persistence", () => {
  assert.match(source, /stops immediately after Q6 persistence/i);

  assert.match(source, /does NOT/i);
});
