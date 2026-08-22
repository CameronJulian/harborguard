import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B7490-07Q5 is an explicitly versioned orchestration boundary", () => {
  assert.match(
    source,
    /hspp-sealed-assembly-corroborated-operational-assessment-runner-v1/,
  );

  assert.match(
    source,
    /runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment/,
  );
});

test("B7490-07Q5 composes Q3 exactly once", () => {
  const calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("B7490-07Q5 invokes Q4 exactly once from the exact Q3 authority decision", () => {
  const assessmentCalls =
    executableSource.match(
      /assessHsppCorroboratedOperationalAuthority\s*\(/g,
    ) ?? [];

  assert.equal(assessmentCalls.length, 1);

  assert.match(
    executableSource,
    /const\s+authorityDecision\s*=\s*corroboratedOperationalAuthorityRun\.authorityDecision/s,
  );

  assert.match(
    executableSource,
    /assessHsppCorroboratedOperationalAuthority\s*\(\s*\{\s*authorityDecision,\s*\}\s*\)/s,
  );
});

test("B7490-07Q5 preserves caller-controlled assessedAt through Q3", () => {
  assert.match(source, /\bassessedAt\s*:\s*string\s*;/);

  assert.match(executableSource, /assessedAt:\s*input\.assessedAt/s);

  for (const forbidden of [
    /\bDate\.now\s*\(/,
    /\bnew\s+Date\s*\(/,
    /\.toISOString\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("B7490-07Q5 preserves complete Q3 Q4 and authority-decision provenance", () => {
  for (const field of [
    "corroboratedOperationalAuthorityRun",
    "authorityDecision",
    "operationalAssessment",
    "corroboratedOperationalAuthorityRunnerVersion",
    "authorityPolicyVersion",
    "operationalAssessmentPolicyVersion",
    "organizationId",
    "assemblyId",
    "targetMemberOrdinal",
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }
});

test("B7490-07Q5 performs no persistence or direct database access", () => {
  assert.doesNotMatch(executableSource, /\bapplyHsppAssessmentDecision\s*\(/);

  assert.doesNotMatch(executableSource, /\bpersistHspp[A-Za-z0-9_]*\s*\(/);

  assert.doesNotMatch(
    executableSource,
    /\.(from|select|insert|update|upsert|delete|rpc)\s*\(/,
  );
});

test("B7490-07Q5 does not bypass Q3 by directly invoking Q2 or B11G2", () => {
  assert.doesNotMatch(
    executableSource,
    /\brunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /\bevaluateHsppCorroboratedOperationalAuthority\s*\(/,
  );
});

test("B7490-07Q5 does not itself assign operational or downstream eligibility", () => {
  assert.doesNotMatch(executableSource, /\boperationalEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\bcrowdEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\btrainingEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\bvalidationEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\btrustState\s*:\s*"VERIFIED"/);
});

test("B7490-07Q5 introduces no API UI cron queue retry or scheduling execution", () => {
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

test("B7490-07Q5 explicitly stops before persistence", () => {
  assert.match(source, /stops immediately after the Q4 in-memory assessment/i);

  assert.match(source, /does NOT persist/i);

  assert.match(source, /production consumer/i);
});
