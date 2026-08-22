import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/persistHsppDeniedCorroboratedMemberAssessment.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

test("B7490-07Q8 defines an explicitly versioned denied persistence boundary", () => {
  assert.match(source, /HSPP_DENIED_CORROBORATED_MEMBER_PERSISTENCE_VERSION/);

  assert.match(source, /hspp-denied-corroborated-member-persistence-v1/);

  assert.match(source, /persistHsppDeniedCorroboratedMemberAssessment/);
});

test("B7490-07Q8 consumes exact existing B11F4 and B11F5 contracts", () => {
  assert.match(source, /HsppMemberCorroborationDecision/);

  assert.match(source, /HsppCorroboratedMemberAssessment/);

  assert.match(source, /HSPP_MEMBER_CORROBORATION_VERSION/);

  assert.match(source, /HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION/);
});

test("B7490-07Q8 reconstructs canonical B11F5 exactly once", () => {
  const calls =
    executableSource.match(/\bassessHsppCorroboratedMember\s*\(/g) ?? [];

  assert.equal(calls.length, 1);

  assert.match(executableSource, /corroborationDecision:\s*corroboration/s);
});

test("B7490-07Q8 accepts only canonical denied B11F4 and UNASSESSED B11F5", () => {
  assert.match(
    executableSource,
    /corroboration\.state\s*!==[\s\S]*"MEMBER_CORROBORATION_DENIED"/,
  );

  assert.match(executableSource, /"INDEPENDENT_SUPPORT_PRESENT"/);

  assert.match(
    executableSource,
    /expectedAssessment\.trustState\s*!==[\s\S]*"UNASSESSED"/,
  );

  assert.match(
    executableSource,
    /expectedAssessment\.reason\s*!==[\s\S]*"INDEPENDENT_CORROBORATION_DENIED"/,
  );
});

test("B7490-07Q8 requires safe immutable identity and canonical denied support shape", () => {
  assert.match(executableSource, /corroboration\.organizationId\.trim\s*\(\)/);

  assert.match(executableSource, /corroboration\.assemblyId\.trim\s*\(\)/);

  assert.match(
    executableSource,
    /corroboration\.assemblyDecisionId\.trim\s*\(\)/,
  );

  assert.match(
    executableSource,
    /corroboration\.targetEvidenceId\.trim\s*\(\)/,
  );

  assert.match(
    executableSource,
    /corroboration\.targetIntegrityFingerprint\.trim\s*\(\)/,
  );

  assert.match(executableSource, /\^\[a-f0-9\]\{64\}\$/);

  assert.match(executableSource, /supportingEvidenceIds\.length\s*!==\s*0/);

  assert.match(executableSource, /independentSupportCount\s*!==\s*0/);
});

test("B7490-07Q8 requires caller-controlled deterministic assessedAt", () => {
  assert.match(source, /assessedAt:\s*string/);

  assert.match(
    executableSource,
    /normalizeAssessedAt\s*\(\s*input\.assessedAt/s,
  );

  assert.match(executableSource, /parsed\.toISOString\s*\(\)/);

  assert.doesNotMatch(executableSource, /Date\.now\s*\(/);

  assert.doesNotMatch(executableSource, /assessedAt\s*=\s*new\s+Date/);
});

test("B7490-07Q8 delegates mutation to generic assessment apply exactly once", () => {
  const calls =
    executableSource.match(/\bawait\s+applyHsppAssessmentDecision\s*\(/g) ?? [];

  assert.equal(calls.length, 1);
});

test("B7490-07Q8 passes exact tenant evidence fingerprint assessment and retry identity", () => {
  assert.match(executableSource, /organizationId,/);

  assert.match(executableSource, /evidenceId,/);

  assert.match(executableSource, /integrityFingerprint,/);

  assert.match(executableSource, /assessment,/);

  assert.match(executableSource, /assessedAt,/);
});

test("B7490-07Q8 verifies the persisted fail-closed result", () => {
  assert.match(executableSource, /applied\.evidenceId\s*!==[\s\S]*evidenceId/);

  assert.match(executableSource, /applied\.assessedAt\s*!==[\s\S]*assessedAt/);

  assert.match(
    executableSource,
    /applied\.trustState\s*!==[\s\S]*"UNASSESSED"/,
  );

  assert.match(
    executableSource,
    /applied\.operationalEligible\s*!==[\s\S]*false/,
  );

  assert.match(
    executableSource,
    /applied\.policyVersion\s*!==[\s\S]*HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION/,
  );

  assert.match(
    executableSource,
    /applied\.reason\s*!==[\s\S]*"INDEPENDENT_CORROBORATION_DENIED"/,
  );
});

test("B7490-07Q8 contains no direct database mutation implementation", () => {
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

test("B7490-07Q8 does not bypass into positive corroborated or operational orchestration", () => {
  const forbidden = [
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
    /\bevaluateHsppCorroboratedOperationalAuthority\s*\(/,
    /\bassessHsppCorroboratedOperationalAuthority\s*\(/,
    /\bpersistHsppCorroboratedOperationalAssessment\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test("B7490-07Q8 grants nothing and invents no revocation trust state", () => {
  assert.doesNotMatch(executableSource, /\boperationalEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\bcrowdEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\btrainingEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\bvalidationEligible\s*:\s*true/);

  assert.doesNotMatch(executableSource, /\btrustState\s*:\s*"VERIFIED"/);

  assert.doesNotMatch(executableSource, /OPERATIONAL_AUTHORITY_REVOKED/);
});

test("B7490-07Q8 introduces no API UI cron queue retry scheduler or production consumer", () => {
  const forbidden = [
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bcron\b/i,
    /\bqueue\b/i,
    /\bscheduler\b/i,
    /\broute-safety\b/i,
    /\bcrowd intelligence\b/i,
    /\btraining pipeline\b/i,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(executableSource, pattern);
  }
});
