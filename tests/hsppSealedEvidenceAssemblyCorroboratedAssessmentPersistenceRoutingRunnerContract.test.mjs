import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("Q9 is an explicitly versioned sibling persistence-routing boundary", () => {
  assert.match(
    source,
    /hspp-sealed-assembly-corroborated-assessment-persistence-routing-runner-v1/,
  );

  assert.match(
    source,
    /runHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistenceRouting/,
  );
});

test("Q9 invokes B07P exactly once", () => {
  const calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyCorroboratedAssessment\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("Q9 contains exactly one positive B11F6 call and one denied Q8 call site", () => {
  const positiveCalls =
    executableSource.match(
      /await\s+persistHsppCorroboratedMemberAssessment\s*\(/g,
    ) ?? [];

  const deniedCalls =
    executableSource.match(
      /await\s+persistHsppDeniedCorroboratedMemberAssessment\s*\(/g,
    ) ?? [];

  assert.equal(positiveCalls.length, 1);

  assert.equal(deniedCalls.length, 1);
});

test("Q9 makes the persistence call sites mutually exclusive by B11F4 state", () => {
  /*
   * Match the semantic branch independent of Prettier whitespace.
   *
   * The previous Q9 gate incorrectly searched for one exact newline
   * layout. Prettier is allowed to place this condition on one line.
   */
  const eligibleBranch =
    /\bif\s*\(\s*preparation\.branch\s*===\s*"MEMBER_CORROBORATION_ELIGIBLE"\s*\)/m.exec(
      executableSource,
    );

  assert.ok(eligibleBranch);

  const branchIndex = eligibleBranch.index;

  const positiveIndex = executableSource.indexOf(
    "await persistHsppCorroboratedMemberAssessment(",
  );

  const positiveReturnIndex = executableSource.indexOf(
    "return {",
    positiveIndex,
  );

  const deniedIndex = executableSource.indexOf(
    "await persistHsppDeniedCorroboratedMemberAssessment(",
  );

  assert.ok(positiveIndex > branchIndex);

  assert.ok(positiveReturnIndex > positiveIndex);

  assert.ok(deniedIndex > positiveReturnIndex);
});

test("Q9 passes the exact B07P decision and assessment to either persistence primitive", () => {
  const decisionPasses =
    executableSource.match(
      /corroborationDecision:\s*preparation\.corroborationDecision/g,
    ) ?? [];

  const assessmentPasses =
    executableSource.match(/assessment:\s*preparation\.assessment/g) ?? [];

  assert.equal(decisionPasses.length, 2);

  assert.equal(assessmentPasses.length, 2);
});

test("Q9 preserves caller-controlled assessedAt without creating wall-clock identity", () => {
  assert.match(source, /assessedAt:\s*string/);

  const persistencePasses =
    executableSource.match(/assessedAt:\s*preparation\.assessedAt/g) ?? [];

  assert.equal(persistencePasses.length, 2);

  assert.match(executableSource, /input\.assessedAt/);

  assert.doesNotMatch(executableSource, /\bDate\.now\s*\(/);

  assert.doesNotMatch(executableSource, /\bnew\s+Date\s*\(/);

  assert.doesNotMatch(executableSource, /\.toISOString\s*\(/);
});

test("Q9 returns a discriminated result with complete B07P and persistence provenance", () => {
  for (const field of [
    "branch",
    "persistenceVersion",
    "persistenceResult",
    "corroboratedAssessmentRun",
    "corroboratedAssessmentRunnerVersion",
    "memberCorroborationRunnerVersion",
    "memberCorroborationPolicyVersion",
    "corroboratedAssessmentPolicyVersion",
    "organizationId",
    "assemblyId",
    "targetMemberOrdinal",
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }

  assert.match(source, /branch:\s*"MEMBER_CORROBORATION_ELIGIBLE"/);

  assert.match(source, /branch:\s*"MEMBER_CORROBORATION_DENIED"/);
});

test("Q9 does not call Q2 or absorb B11F4 B11F5 assessment internals", () => {
  assert.doesNotMatch(
    executableSource,
    /\brunHsppSealedEvidenceAssemblyCorroboratedAssessmentPersistence\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /\bevaluateHsppMemberCorroboration\s*\(/,
  );

  assert.doesNotMatch(executableSource, /\bassessHsppCorroboratedMember\s*\(/);
});

test("Q9 contains no generic apply or direct database implementation", () => {
  assert.doesNotMatch(executableSource, /\bapplyHsppAssessmentDecision\s*\(/);

  assert.doesNotMatch(
    executableSource,
    /\.(from|select|insert|update|upsert|delete|rpc)\s*\(/,
  );
});

test("Q9 stops before operational-authority policy and downstream orchestration", () => {
  assert.doesNotMatch(
    executableSource,
    /\bevaluateHsppCorroboratedOperationalAuthority\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /\bassessHsppCorroboratedOperationalAuthority\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /\bpersistHsppCorroboratedOperationalAssessment\s*\(/,
  );
});

test("Q9 constructs no operational Crowd training validation or VERIFIED grant", () => {
  for (const forbidden of [
    /\boperationalEligible\s*:\s*true/,
    /\bcrowdEligible\s*:\s*true/,
    /\btrainingEligible\s*:\s*true/,
    /\bvalidationEligible\s*:\s*true/,
    /\btrustState\s*:\s*"VERIFIED"/,
    /OPERATIONAL_AUTHORITY_REVOKED/,
  ]) {
    assert.doesNotMatch(executableSource, forbidden);
  }
});

test("Q9 introduces no API UI cron queue or scheduler execution", () => {
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
