import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("Q12 is an explicitly versioned Q11-to-Q6 persistence-routing boundary", () => {
  assert.match(
    source,
    /hspp-sealed-assembly-corroborated-operational-assessment-persistence-routing-runner-v1/,
  );

  assert.match(
    source,
    /runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting/,
  );
});

test("Q12 invokes Q11 exactly once", () => {
  const calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("Q12 contains exactly one Q6 persistence call site", () => {
  const calls =
    executableSource.match(
      /await\s+persistHsppCorroboratedOperationalAssessment\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("Q12 preserves caller-owned assessedAt through Q11 and Q6", () => {
  assert.match(source, /assessedAt:\s*string/);

  const passes =
    executableSource.match(
      /assessedAt:\s*(?:input\.assessedAt|preparation\.assessedAt)/g,
    ) ?? [];

  assert.equal(passes.length, 2);

  assert.doesNotMatch(executableSource, /\bDate\.now\s*\(/);

  assert.doesNotMatch(executableSource, /\bnew\s+Date\s*\(/);

  assert.doesNotMatch(executableSource, /\.toISOString\s*\(/);
});

test("Q12 denied branch returns before the Q6 persistence call", () => {
  const denied =
    /\bif\s*\(\s*preparation\.branch\s*===\s*"MEMBER_CORROBORATION_DENIED"\s*\)/m.exec(
      executableSource,
    );

  assert.ok(denied);

  const deniedReturn = executableSource.indexOf("return {", denied.index);

  const q6Call = executableSource.indexOf(
    "await persistHsppCorroboratedOperationalAssessment(",
  );

  assert.ok(deniedReturn > denied.index);

  assert.ok(q6Call > deniedReturn);
});

test("Q12 passes exact Q11 authority decision assessment and assessedAt into Q6", () => {
  assert.match(
    executableSource,
    /authorityDecision:\s*preparation\.authorityDecision/,
  );

  assert.match(executableSource, /assessment:\s*preparation\.assessment/);

  assert.match(executableSource, /assessedAt:\s*preparation\.assessedAt/);
});

test("Q12 does not inspect or reconstruct Q4 success or denial policy", () => {
  assert.doesNotMatch(
    executableSource,
    /assessment\.(operationalEligible|reason|trustState)/,
  );

  assert.doesNotMatch(
    executableSource,
    /CORROBORATED_OPERATIONAL_AUTHORITY_(GRANTED|DENIED)/,
  );

  assert.doesNotMatch(
    executableSource,
    /\bassessHsppCorroboratedOperationalAuthority\s*\(/,
  );
});

test("Q12 does not create negative operational-assessment persistence", () => {
  assert.doesNotMatch(
    executableSource,
    /persistHsppDeniedCorroboratedOperationalAssessment/,
  );

  assert.doesNotMatch(executableSource, /OPERATIONAL_AUTHORITY_REVOKED/);
});

test("Q12 does not replay Q7 Q5 or lower orchestration", () => {
  for (const forbidden of [
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedAssessment\s*\(/,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
    /\bpersistHsppDeniedCorroboratedMemberAssessment\s*\(/,
    /\bevaluateHsppCorroboratedOperationalAuthority\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("Q12 contains no generic assessment persistence or direct database implementation", () => {
  assert.doesNotMatch(executableSource, /\bapplyHsppAssessmentDecision\s*\(/);

  assert.doesNotMatch(
    executableSource,
    /\.(from|select|insert|update|upsert|delete|rpc)\s*\(/,
  );
});

test("Q12 constructs no downstream or VERIFIED grant", () => {
  for (const forbidden of [
    /\boperationalEligible\s*:\s*true/,
    /\bcrowdEligible\s*:\s*true/,
    /\btrainingEligible\s*:\s*true/,
    /\bvalidationEligible\s*:\s*true/,
    /\btrustState\s*:\s*"VERIFIED"/,
    /\bauthority\s*:\s*"GRANTED"/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("Q12 introduces no API UI cron queue retry or scheduler execution", () => {
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
