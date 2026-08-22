import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B7490-07Q3 is an explicitly versioned orchestration boundary", () => {
  assert.match(
    source,
    /hspp-sealed-assembly-corroborated-operational-authority-runner-v1/,
  );

  assert.match(
    source,
    /runHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority/,
  );
});

test("B7490-07Q3 composes Q2 then B11G2 exactly once", () => {
  const q2Calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence\s*\(/g,
    ) ?? [];

  const b11g2Calls =
    executableSource.match(
      /evaluateHsppCorroboratedOperationalAuthority\s*\(/g,
    ) ?? [];

  assert.equal(q2Calls.length, 1);

  assert.equal(b11g2Calls.length, 1);

  const q2Index = executableSource.indexOf(
    "await runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence(",
  );

  const b11g2Index = executableSource.indexOf(
    "evaluateHsppCorroboratedOperationalAuthority(persistedAssessment)",
  );

  assert.ok(q2Index >= 0);

  assert.ok(b11g2Index > q2Index);
});

test("B7490-07Q3 preserves caller-controlled assessedAt through Q2", () => {
  assert.match(source, /\bassessedAt\s*:\s*string\s*;/);

  assert.match(executableSource, /assessedAt:\s*input\.assessedAt/s);

  for (const forbidden of [
    /\bnew\s+Date\s*\(/,
    /\bDate\.now\s*\(/,
    /\.toISOString\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q3 passes the exact Q2 persistedAssessment into B11G2", () => {
  assert.match(
    executableSource,
    /const\s+persistedAssessment\s*=\s*corroboratedAssessmentPersistence\.persistedAssessment/s,
  );

  assert.match(executableSource, /return\s+persistedAssessment\s*;/s);

  assert.match(
    executableSource,
    /evaluateHsppCorroboratedOperationalAuthority\s*\(\s*persistedAssessment\s*\)/s,
  );
});

test("B7490-07Q3 preserves complete Q2 and B11G2 provenance", () => {
  for (const field of [
    "corroboratedAssessmentPersistence",
    "authorityDecision",
    "corroboratedAssessmentPersistenceRunnerVersion",
    "authorityPolicyVersion",
    "organizationId",
    "assemblyId",
    "targetMemberOrdinal",
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }

  assert.match(
    executableSource,
    /corroboratedAssessmentPersistenceRunnerVersion:\s*corroboratedAssessmentPersistence\.runnerVersion/s,
  );

  assert.match(
    executableSource,
    /authorityPolicyVersion:\s*authorityDecision\.policyVersion/s,
  );
});

test("B7490-07Q3 performs no direct database access", () => {
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

test("B7490-07Q3 does not bypass Q2 by absorbing upstream B07P or B11F6 internals", () => {
  for (const forbidden of [
    /\brunHsppSealedEvidenceAssemblyCorroboratedAssessment\s*\(/,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
    /\bapplyHsppAssessmentDecision\s*\(/,
    /\bevaluateHsppMemberCorroboration\s*\(/,
    /\bassessHsppCorroboratedMember\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q3 does not implement an operational-authority grant", () => {
  for (const forbidden of [
    /\bgrantHsppOperationalAuthority\s*\(/,
    /\bgrantOperationalAuthority\s*\(/,
    /\bOPERATIONAL_AUTHORITY_GRANTED\b/,
    /\bauthority\s*:\s*["'](?:GRANTED|OPERATIONAL)["']/,
    /\boperationalEligible\s*:\s*true/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q3 creates no downstream Crowd ML validation or VERIFIED authority", () => {
  for (const forbidden of [
    /\bcrowdEligible\s*:\s*true/,
    /\btrainingEligible\s*:\s*true/,
    /\bvalidationEligible\s*:\s*true/,
    /\btrustState\s*:\s*["']VERIFIED["']/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q3 does not persist the B11G2 candidacy decision", () => {
  for (const forbidden of [
    /\bpersistHsppCorroboratedOperationalAuthority\s*\(/,
    /\bpersistHsppOperationalAuthority\s*\(/,
    /\bauthority_candidate\b/,
    /\bauthorityCandidate\s*:/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q3 introduces no API UI cron queue retry or scheduling execution", () => {
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

test("B7490-07Q3 explicitly stops after B11G2 candidacy evaluation", () => {
  assert.match(source, /stops immediately after B11G2 candidacy evaluation/i);

  assert.match(
    source,
    /OPERATIONAL_AUTHORITY_CANDIDATE is not an operational grant/i,
  );

  assert.match(source, /does NOT/i);
});
