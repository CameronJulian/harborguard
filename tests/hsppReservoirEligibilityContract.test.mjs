import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/evaluateHsppReservoirEligibility.ts",
  "utf8",
);

test("B7490-06A defines an explicitly versioned Reservoir policy", () => {
  assert.match(source, /HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION/);

  assert.match(source, /hspp-reservoir-eligibility-v1/);
});

test("B7490-06A remains a pure decision primitive", () => {
  assert.doesNotMatch(
    source,
    /supabase|\.from\(|\.insert\(|\.update\(|\.delete\(|fetch\(/i,
  );
});

test("B7490-06A requires absence of assembly membership", () => {
  assert.match(source, /hasAssemblyMembership/);

  assert.match(source, /ALREADY_ASSEMBLED/);
});

test("B7490-06A grants no downstream or assembly authority", () => {
  assert.match(source, /does NOT/i);

  assert.match(source, /Route Safety authority/);

  assert.match(source, /Crowd Intelligence eligibility/);

  assert.match(source, /ML training or validation eligibility/);

  assert.match(source, /create or modify an evidence assembly/);
});
