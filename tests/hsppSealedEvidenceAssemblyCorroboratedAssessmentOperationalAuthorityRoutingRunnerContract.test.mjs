import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("Q10 is an explicitly versioned Q9-to-B11G2 continuation boundary", () => {
  assert.match(
    source,
    /hspp-sealed-assembly-corroborated-assessment-operational-authority-routing-runner-v1/,
  );

  assert.match(
    source,
    /runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting/,
  );
});

test("Q10 invokes Q9 exactly once", () => {
  const calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("Q10 contains exactly one B11G2 call site", () => {
  const calls =
    executableSource.match(
      /\bevaluateHsppCorroboratedOperationalAuthority\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("Q10 passes caller-owned assessedAt unchanged into Q9", () => {
  assert.match(source, /assessedAt:\s*string/);

  assert.match(executableSource, /assessedAt:\s*input\.assessedAt/);

  assert.doesNotMatch(executableSource, /\bDate\.now\s*\(/);

  assert.doesNotMatch(executableSource, /\bnew\s+Date\s*\(/);

  assert.doesNotMatch(executableSource, /\.toISOString\s*\(/);
});

test("Q10 denied branch returns before the B11G2 call site", () => {
  const deniedBranch =
    /\bif\s*\(\s*preparation\.branch\s*===\s*"MEMBER_CORROBORATION_DENIED"\s*\)/m.exec(
      executableSource,
    );

  assert.ok(deniedBranch);

  const deniedIndex = deniedBranch.index;

  const deniedReturnIndex = executableSource.indexOf("return {", deniedIndex);

  const authorityIndex = executableSource.indexOf(
    "evaluateHsppCorroboratedOperationalAuthority(",
  );

  assert.ok(deniedReturnIndex > deniedIndex);

  assert.ok(authorityIndex > deniedReturnIndex);
});

test("Q10 passes the exact positive Q9 persistence result into B11G2", () => {
  assert.match(
    executableSource,
    /evaluateHsppCorroboratedOperationalAuthority\s*\(\s*preparation\.persistedAssessment\s*,?\s*\)/m,
  );
});

test("Q10 retains complete Q9 provenance on either branch", () => {
  assert.match(
    source,
    /persistenceRoutingRun:\s*HsppSealedEvidenceAssemblyCorroboratedAssessmentDeniedPersistenceRoutingResult/,
  );

  assert.match(
    source,
    /persistenceRoutingRun:\s*HsppSealedEvidenceAssemblyCorroboratedAssessmentPositivePersistenceRoutingResult/,
  );

  assert.match(source, /authorityDecision:\s*null/);

  assert.match(
    source,
    /authorityDecision:\s*HsppCorroboratedOperationalAuthorityDecision/,
  );

  assert.match(
    source,
    /authorityPolicyVersion:\s*typeof HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION/,
  );
});

test("Q10 does not call Q2 Q3 B07P B11F6 or Q8 directly", () => {
  for (const pattern of [
    /\brunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedAssessment\s*\(/,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
    /\bpersistHsppDeniedCorroboratedMemberAssessment\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test("Q10 does not absorb B11F4 B11F5 or generic assessment persistence", () => {
  for (const pattern of [
    /\bevaluateHsppMemberCorroboration\s*\(/,
    /\bassessHsppCorroboratedMember\s*\(/,
    /\bapplyHsppAssessmentDecision\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test("Q10 stops before Q4 Q5 Q6 and Q7", () => {
  for (const pattern of [
    /\bassessHsppCorroboratedOperationalAuthority\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment\s*\(/,
    /\bpersistHsppCorroboratedOperationalAssessment\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test("Q10 contains no direct database mutation implementation", () => {
  assert.doesNotMatch(
    executableSource,
    /\.(from|select|insert|update|upsert|delete|rpc)\s*\(/,
  );
});

test("Q10 constructs no authority or downstream eligibility grant", () => {
  for (const forbidden of [
    /\boperationalEligible\s*:\s*true/,
    /\bcrowdEligible\s*:\s*true/,
    /\btrainingEligible\s*:\s*true/,
    /\bvalidationEligible\s*:\s*true/,
    /\btrustState\s*:\s*"VERIFIED"/,
    /\bauthority\s*:\s*"GRANTED"/,
    /OPERATIONAL_AUTHORITY_GRANTED/,
    /OPERATIONAL_AUTHORITY_REVOKED/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("Q10 introduces no API UI cron queue retry or scheduler execution", () => {
  for (const forbidden of [
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bcron\b/i,
    /\bqueue\b/i,
    /\bscheduler\b/i,
    /\bsetTimeout\s*\(/,
    /\bsetInterval\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});
