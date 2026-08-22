import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B7490-07Q2 is an explicitly versioned orchestration boundary", () => {
  assert.match(
    source,
    /hspp-sealed-assembly-corroborated-assessment-persistence-runner-v1/,
  );

  assert.match(
    source,
    /runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence/,
  );
});

test("B7490-07Q2 composes B07P then B11F6 exactly once", () => {
  const b07pCalls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyCorroboratedAssessment\s*\(/g,
    ) ?? [];

  const b11f6Calls =
    executableSource.match(
      /await\s+persistHsppCorroboratedMemberAssessment\s*\(/g,
    ) ?? [];

  assert.equal(b07pCalls.length, 1);

  assert.equal(b11f6Calls.length, 1);

  const b07pIndex = executableSource.indexOf(
    "await runHsppSealedEvidenceAssemblyCorroboratedAssessment(",
  );

  const b11f6Index = executableSource.indexOf(
    "await persistHsppCorroboratedMemberAssessment(",
  );

  assert.ok(b07pIndex >= 0);

  assert.ok(b11f6Index > b07pIndex);
});

test("B7490-07Q2 passes the exact B07P decision and assessment into B11F6", () => {
  assert.match(
    executableSource,
    /corroborationDecision:\s*preparation\.corroborationDecision/s,
  );

  assert.match(executableSource, /assessment:\s*preparation\.assessment/s);

  assert.match(
    executableSource,
    /const\s+corroborationDecision\s*=\s*corroboratedAssessmentRun\.memberCorroborationDecision/s,
  );

  assert.match(
    executableSource,
    /const\s+assessment\s*=\s*corroboratedAssessmentRun\.corroboratedAssessment/s,
  );
});

test("B7490-07Q2 preserves caller-controlled B11F6 retry identity", () => {
  assert.match(source, /\bassessedAt\s*:\s*string\s*;/);

  assert.match(executableSource, /input\.assessedAt/);

  assert.match(executableSource, /assessedAt:\s*preparation\.assessedAt/s);

  for (const forbidden of [
    /\bnew\s+Date\s*\(/,
    /\bDate\.now\s*\(/,
    /\.toISOString\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q2 preserves complete B07P and B11F6 provenance", () => {
  for (const field of [
    "corroboratedAssessmentRun",
    "persistedAssessment",
    "corroboratedAssessmentRunnerVersion",
    "memberCorroborationRunnerVersion",
    "memberCorroborationPolicyVersion",
    "corroboratedAssessmentPolicyVersion",
    "persistenceVersion",
    "organizationId",
    "assemblyId",
    "targetMemberOrdinal",
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }

  assert.match(
    source,
    /persistenceVersion:\s*persistedAssessment\.persistenceVersion/s,
  );
});

test("B7490-07Q2 contains no direct database persistence implementation", () => {
  for (const forbidden of [
    /\.from\s*\(/,
    /\.select\s*\(/,
    /\.insert\s*\(/,
    /\.update\s*\(/,
    /\.upsert\s*\(/,
    /\.delete\s*\(/,
    /\.rpc\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q2 does not absorb B11F4 B11F5 B11F6 internals or B11G2", () => {
  for (const forbidden of [
    /\bevaluateHsppMemberCorroboration\s*\(/,
    /\bassessHsppCorroboratedMember\s*\(/,
    /\bapplyHsppAssessmentDecision\s*\(/,
    /\bevaluateHsppCorroboratedOperationalAuthority\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q2 constructs no downstream trust or eligibility", () => {
  for (const forbidden of [
    /\btrustState\s*:/,
    /\boperationalEligible\s*:/,
    /\bcrowdEligible\s*:/,
    /\btrainingEligible\s*:/,
    /\bvalidationEligible\s*:/,
    /\bauthority\s*:\s*["'](?:GRANTED|OPERATIONAL)/,
    /\bVERIFIED\b/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q2 introduces no API UI cron queue retry or scheduling execution", () => {
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

test("B7490-07Q2 explicitly stops before B11G2 authority candidacy", () => {
  assert.match(source, /stops immediately after B11F6 persistence/i);

  assert.match(source, /does NOT/i);

  assert.match(source, /B11G2 operational-authority candidacy/i);
});
