import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const runnerPath = path.join(
  process.cwd(),
  "lib",
  "hspp",
  "runHsppReservoirReevaluation.ts",
);

const source = fs.readFileSync(runnerPath, "utf8");

test("B7490-07B remains a read/evaluate-only orchestration boundary", () => {
  const forbiddenDatabaseMutations = [
    /\.insert\s*\(/,
    /\.update\s*\(/,
    /\.upsert\s*\(/,
    /\.delete\s*\(/,
  ];

  for (const pattern of forbiddenDatabaseMutations) {
    assert.doesNotMatch(source, pattern);
  }
});

test("B7490-07B does not call downstream persistence or trust mutation primitives", () => {
  const forbiddenCalls = [
    /\bpersistHsppAssemblyDecision\s*\(/,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
    /\bapplyHsppAssessmentDecision\s*\(/,
  ];

  for (const pattern of forbiddenCalls) {
    assert.doesNotMatch(source, pattern);
  }
});

test("B7490-07B has no API, cron, or scheduling implementation", () => {
  const forbiddenExecutionPatterns = [
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bsetInterval\s*\(/,
    /\bsetTimeout\s*\(/,
    /\bCRON_SECRET\b/,
  ];

  for (const pattern of forbiddenExecutionPatterns) {
    assert.doesNotMatch(source, pattern);
  }
});

test("B7490-07B calls the discovery boundary exactly once", () => {
  const calls = source.match(/await\s+readHsppReservoirCandidates\s*\(/g) ?? [];

  assert.equal(calls.length, 1);
});

test("B7490-07B passes discovered candidates directly to B07A", () => {
  assert.match(
    source,
    /evaluateHsppReservoirReevaluation\s*\(\s*discovery\.candidates\s*,?\s*\)/s,
  );
});
