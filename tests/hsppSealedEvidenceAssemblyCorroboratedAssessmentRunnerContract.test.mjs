import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyCorroboratedAssessment.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B07P is an explicitly versioned orchestration boundary", () => {
  assert.match(
    source,
    /hspp-sealed-assembly-corroborated-assessment-runner-v1/,
  );

  assert.match(source, /runHsppSealedEvidenceAssemblyCorroboratedAssessment/);
});

test("B07P invokes committed B07K exactly once", () => {
  const calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyMemberCorroboration\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("B07P invokes the existing B11F5 policy exactly once", () => {
  const calls =
    executableSource.match(/\bassessHsppCorroboratedMember\s*\(/g) ?? [];

  assert.equal(calls.length, 1);
});

test("B07P passes the exact B11F4 decision into B11F5", () => {
  assert.match(
    executableSource,
    /const\s+memberCorroborationDecision\s*=\s*memberCorroborationRun\.memberCorroborationDecision/,
  );

  assert.match(
    executableSource,
    /corroborationDecision:\s*memberCorroborationDecision/,
  );

  assert.doesNotMatch(executableSource, /memberCorroborationDecision\s*=\s*\{/);
});

test("B07P delegates eligible and denied decisions to B11F5 without prefiltering", () => {
  assert.doesNotMatch(executableSource, /memberCorroborationDecision\.state/);

  assert.doesNotMatch(executableSource, /memberCorroborationDecision\.reason/);

  assert.doesNotMatch(executableSource, /MEMBER_CORROBORATION_ELIGIBLE/);

  assert.doesNotMatch(executableSource, /MEMBER_CORROBORATION_DENIED/);
});

test("B07P retains the complete B07K B11F4 and B11F5 provenance", () => {
  for (const field of [
    "memberCorroborationRun",
    "memberCorroborationDecision",
    "corroboratedAssessment",
    "memberCorroborationRunnerVersion",
    "memberCorroborationPolicyVersion",
    "corroboratedAssessmentPolicyVersion",
    "organizationId",
    "assemblyId",
    "targetMemberOrdinal",
  ]) {
    assert.match(source, new RegExp(`\\b${field}\\b`));
  }
});

test("B07P stops before B11F6 persistence and assessment application", () => {
  for (const pattern of [
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
    /\bapplyHsppAssessmentDecision\s*\(/,
    /\bevaluateHsppMemberCorroboration\s*\(/,
    /\.\s*from\s*\(\s*["'`]/,
    /\.select\s*\(/,
    /\.insert\s*\(/,
    /\.update\s*\(/,
    /\.upsert\s*\(/,
    /\.delete\s*\(/,
    /\.rpc\s*\(/,
    /\bfetch\s*\(/,
  ]) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test("B07P does not reconstruct trust or downstream eligibility", () => {
  for (const pattern of [
    /\btrustState\s*:/,
    /\boperationalEligible\s*:/,
    /\bcrowdEligible\s*:/,
    /\btrainingEligible\s*:/,
    /\bvalidationEligible\s*:/,
    /\bVERIFIED\b/,
  ]) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test("B07P introduces no API UI cron queue retry or scheduling behavior", () => {
  for (const pattern of [
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bfetch\s*\(/,
    /\bsetTimeout\s*\(/,
    /\bsetInterval\s*\(/,
    /\bcron\b/i,
    /\bqueue\b/i,
    /\bretry\b/i,
    /\bschedule\b/i,
  ]) {
    assert.doesNotMatch(executableSource, pattern);
  }
});
