import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("Q11 is an explicitly versioned Q10-to-Q4 routing boundary", () => {
  assert.match(
    source,
    /hspp-sealed-assembly-corroborated-operational-assessment-routing-runner-v1/,
  );

  assert.match(
    source,
    /runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting/,
  );
});

test("Q11 invokes Q10 exactly once", () => {
  const calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyCorroboratedAssessmentOperationalAuthorityRouting\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("Q11 contains exactly one Q4 assessment call site", () => {
  const calls =
    executableSource.match(
      /\bassessHsppCorroboratedOperationalAuthority\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("Q11 preserves caller-owned assessedAt unchanged through Q10", () => {
  assert.match(source, /assessedAt:\s*string/);

  assert.match(executableSource, /assessedAt:\s*input\.assessedAt/);

  assert.doesNotMatch(executableSource, /\bDate\.now\s*\(/);

  assert.doesNotMatch(executableSource, /\bnew\s+Date\s*\(/);

  assert.doesNotMatch(executableSource, /\.toISOString\s*\(/);
});

test("Q11 denied preparation returns before the eligible Q4 branch", () => {
  const denied =
    /\bif\s*\(\s*authorityRoutingRun\.branch\s*===\s*"MEMBER_CORROBORATION_DENIED"\s*\)/m.exec(
      executableSource,
    );

  const eligible =
    /\bif\s*\(\s*authorityRoutingRun\.branch\s*===\s*"MEMBER_CORROBORATION_ELIGIBLE"\s*\)/m.exec(
      executableSource,
    );

  assert.ok(denied);

  assert.ok(eligible);

  const deniedReturn = executableSource.indexOf("return {", denied.index);

  const q4Call = executableSource.indexOf(
    "assessHsppCorroboratedOperationalAuthority(",
    eligible.index,
  );

  assert.ok(deniedReturn > denied.index);

  assert.ok(eligible.index > deniedReturn);

  assert.ok(q4Call > eligible.index);
});

test("Q11 passes the exact Q10 authority decision into Q4", () => {
  assert.match(
    executableSource,
    /assessHsppCorroboratedOperationalAuthority\s*\(\s*\{\s*authorityDecision\s*,?\s*\}\s*\)/m,
  );
});

test("Q11 does not pre-filter B11G2 candidate versus denial state", () => {
  assert.doesNotMatch(executableSource, /authorityDecision\.(state|reason)/);

  assert.doesNotMatch(executableSource, /"OPERATIONAL_AUTHORITY_CANDIDATE"/);

  assert.doesNotMatch(executableSource, /"OPERATIONAL_AUTHORITY_DENIED"/);
});

test("Q11 retains complete Q10 and Q4 provenance", () => {
  for (const marker of [
    "authorityRoutingRun",
    "authorityRoutingRunnerVersion",
    "authorityDecision",
    "operationalAssessment",
    "operationalAssessmentPolicyVersion",
    "organizationId",
    "assemblyId",
    "targetMemberOrdinal",
  ]) {
    assert.match(source, new RegExp(`\\b${marker}\\b`));
  }

  assert.match(source, /authorityDecision:\s*null/);

  assert.match(source, /operationalAssessment:\s*null/);
});

test("Q11 does not bypass Q10 by invoking lower corroboration or authority stages", () => {
  for (const forbidden of [
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

test("Q11 does not invoke legacy Q5 or persistence Q6 Q7", () => {
  for (const forbidden of [
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessment\s*\(/,
    /\bpersistHsppCorroboratedOperationalAssessment\s*\(/,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistence\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("Q11 contains no generic assessment persistence or direct database implementation", () => {
  assert.doesNotMatch(executableSource, /\bapplyHsppAssessmentDecision\s*\(/);

  assert.doesNotMatch(
    executableSource,
    /\.(from|select|insert|update|upsert|delete|rpc)\s*\(/,
  );
});

test("Q11 itself constructs no operational downstream or VERIFIED grant", () => {
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

test("Q11 introduces no API UI cron queue retry or scheduler execution", () => {
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
