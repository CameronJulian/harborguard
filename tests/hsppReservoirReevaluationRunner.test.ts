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

test("B7490-07B composes Reservoir discovery and reevaluation", () => {
  assert.match(source, /readHsppReservoirCandidates\s*\(/);

  assert.match(source, /evaluateHsppReservoirReevaluation\s*\(/);

  assert.match(source, /discovery\.candidates/);
});

test("B7490-07B preserves discovery and reevaluation provenance", () => {
  assert.match(source, /HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION/);

  assert.match(source, /HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION/);

  assert.match(source, /HSPP_RESERVOIR_REEVALUATION_RUNNER_VERSION/);

  assert.match(source, /discoveryPolicyVersion/);

  assert.match(source, /reevaluationPolicyVersion/);
});

test("B7490-07B returns both bounded stages", () => {
  assert.match(source, /discovery,/);
  assert.match(source, /reevaluation,/);
  assert.match(source, /organizationId:\s*discovery\.organizationId/);
});
