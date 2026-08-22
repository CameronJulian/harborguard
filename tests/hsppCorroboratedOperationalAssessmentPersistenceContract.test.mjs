import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/persistHsppCorroboratedOperationalAssessment.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B7490-07Q6 defines an explicitly versioned operational-assessment persistence boundary", () => {
  assert.match(
    source,
    /hspp-corroborated-operational-assessment-persistence-v1/,
  );

  assert.match(source, /persistHsppCorroboratedOperationalAssessment/);
});

test("B7490-07Q6 consumes the exact B11G2 decision and exact Q4 assessment", () => {
  assert.match(
    source,
    /authorityDecision:\s*HsppCorroboratedOperationalAuthorityDecision/,
  );

  assert.match(source, /assessment:\s*HsppCorroboratedOperationalAssessment/);
});

test("B7490-07Q6 independently reconstructs Q4 exactly once before persistence", () => {
  const calls =
    executableSource.match(
      /assessHsppCorroboratedOperationalAuthority\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);

  assert.match(
    executableSource,
    /const\s+expectedAssessment\s*=[\s\S]*assessHsppCorroboratedOperationalAuthority\s*\(\s*\{\s*authorityDecision,\s*\}\s*\)/,
  );

  assert.match(
    executableSource,
    /assessmentsMatch\s*\(\s*assessment,\s*expectedAssessment\s*,?\s*\)/,
  );
});

test("B7490-07Q6 persists only the exact positive Q4 operational decision", () => {
  assert.match(
    executableSource,
    /expectedAssessment\.trustState\s*!==[\s\r\n]*"CORROBORATED"/,
  );

  assert.match(
    executableSource,
    /expectedAssessment\.operationalEligible\s*!==[\s\r\n]*true/,
  );

  assert.match(
    executableSource,
    /expectedAssessment\.crowdEligible\s*!==[\s\r\n]*false/,
  );

  assert.match(
    executableSource,
    /expectedAssessment\.trainingEligible\s*!==[\s\r\n]*false/,
  );

  assert.match(
    executableSource,
    /expectedAssessment\.validationEligible\s*!==[\s\r\n]*false/,
  );

  assert.match(executableSource, /CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED/);
});

test("B7490-07Q6 requires and canonicalizes caller-owned assessedAt before persistence", () => {
  assert.match(source, /\bassessedAt\s*:\s*string\s*;/);

  assert.match(
    executableSource,
    /const\s+assessedAt\s*=[\s\r\n]*normalizeAssessedAt\s*\([\s\r\n]*input\?\.assessedAt/,
  );

  assert.doesNotMatch(
    executableSource,
    /assessedAt\s*=\s*new Date\s*\(\s*\)\s*\.toISOString/,
  );

  assert.doesNotMatch(executableSource, /\bDate\.now\s*\(/);
});

test("B7490-07Q6 calls the existing generic assessment mutation boundary exactly once", () => {
  const calls =
    executableSource.match(/await\s+applyHsppAssessmentDecision\s*\(/g) ?? [];

  assert.equal(calls.length, 1);
});

test("B7490-07Q6 delegates exact immutable evidence identity to generic persistence", () => {
  assert.match(
    executableSource,
    /organizationId,\s*[\r\n\s]*evidenceId,\s*[\r\n\s]*integrityFingerprint,\s*[\r\n\s]*assessment,\s*[\r\n\s]*assessedAt,/,
  );

  assert.match(source, /assemblyDecisionId/);

  assert.match(source, /supportingEvidenceIds/);

  assert.match(source, /independentSupportCount/);
});

test("B7490-07Q6 verifies the applied result matches Q4 and retry identity", () => {
  for (const pattern of [
    /applied\.evidenceId\s*!==[\s\r\n]*evidenceId/,
    /applied\.trustState\s*!==[\s\r\n]*"CORROBORATED"/,
    /applied\.operationalEligible\s*!==[\s\r\n]*true/,
    /applied\.policyVersion\s*!==[\s\r\n]*HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION/,
    /applied\.reason\s*!==[\s\r\n]*"CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED"/,
    /applied\.assessedAt\s*!==[\s\r\n]*assessedAt/,
  ]) {
    assert.match(executableSource, pattern);
  }
});

test("B7490-07Q6 creates no second direct Supabase mutation path", () => {
  assert.doesNotMatch(
    executableSource,
    /\.(from|select|insert|update|upsert|delete|rpc)\s*\(/,
  );
});

test("B7490-07Q6 does not generalize B11F6 or orchestrate Q5", () => {
  assert.doesNotMatch(
    executableSource,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment\s*\(/,
  );
});

test("B7490-07Q6 grants no Crowd ML validation or VERIFIED state", () => {
  assert.doesNotMatch(executableSource, /\bcrowdEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\btrainingEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\bvalidationEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\btrustState\s*:\s*"VERIFIED"/);
});

test("B7490-07Q6 introduces no API UI cron queue or scheduler execution", () => {
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
