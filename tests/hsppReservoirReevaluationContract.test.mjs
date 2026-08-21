import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const path = "lib/hspp/evaluateHsppReservoirReevaluation.ts";

const source = fs.readFileSync(path, "utf8");

test("B07A defines an explicitly versioned Lifeguard reevaluation policy", () => {
  assert.match(source, /HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION/);

  assert.match(source, /hspp-reservoir-reevaluation-v1/);
});

test("B07A has an explicit pair-comparison ceiling", () => {
  assert.match(source, /HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS/);

  assert.match(source, /100/);
});

test("B07A reuses existing assembly membership policy", () => {
  assert.match(source, /evaluateHsppAssemblyMembership/);
});

test("B07A remains pure and database mutation free", () => {
  assert.doesNotMatch(
    source,
    /supabase|\.from\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(|fetch\(/i,
  );
});

test("B07A does not create assembly or downstream authority", () => {
  assert.match(source, /does NOT/i);

  assert.match(source, /create or modify an evidence assembly/);

  assert.match(source, /grant Route Safety authority/);

  assert.match(source, /grant Crowd Intelligence eligibility/);

  assert.match(source, /grant ML training or validation eligibility/);
});

test("B07A defines deterministic reevaluation states", () => {
  assert.match(source, /NO_COUNTERPART/);

  assert.match(source, /MEMBERSHIP_DENIED/);

  assert.match(source, /ASSEMBLY_CANDIDATE/);
});

test("B07A does not schedule itself", () => {
  assert.match(source, /does NOT/i);

  assert.match(source, /schedule itself/);

  assert.doesNotMatch(source, /CRON_SECRET/);
});
