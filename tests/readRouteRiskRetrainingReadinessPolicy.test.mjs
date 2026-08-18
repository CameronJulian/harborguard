import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/readRouteRiskRetrainingReadinessPolicy.ts",
      import.meta.url
    ),
    "utf8"
  );

test("retraining policy configuration names every required explicit policy input", () => {
  const expectedKeys = [
    "ROUTE_RISK_RETRAINING_POLICY_VERSION",
    "ROUTE_RISK_RETRAINING_MIN_TOTAL_EXAMPLES",
    "ROUTE_RISK_RETRAINING_MIN_TRAINING_EXAMPLES",
    "ROUTE_RISK_RETRAINING_MIN_VALIDATION_EXAMPLES",
    "ROUTE_RISK_RETRAINING_MIN_TEST_EXAMPLES",
    "ROUTE_RISK_RETRAINING_MIN_TRAINING_POSITIVE_EXAMPLES",
    "ROUTE_RISK_RETRAINING_MIN_TRAINING_NEGATIVE_EXAMPLES",
  ];

  for (const key of expectedKeys) {
    assert.match(
      source,
      new RegExp(key)
    );
  }
});

test("retraining policy loader requires every value rather than supplying hidden defaults", () => {
  assert.match(
    source,
    /function requireConfiguredValue/
  );

  assert.match(
    source,
    /\$\{key\} is not configured\./
  );

  assert.doesNotMatch(
    source,
    /\?\?\s*\d/
  );

  assert.doesNotMatch(
    source,
    /\|\|\s*\d/
  );
});

test("retraining policy loader validates every structural minimum as a non-negative integer", () => {
  assert.match(
    source,
    /function parseNonNegativeInteger/
  );

  assert.match(
    source,
    /!Number\.isInteger\(value\)/
  );

  assert.match(
    source,
    /value < 0/
  );

  const expectedProperties = [
    "minimumTotalExamples",
    "minimumTrainingExamples",
    "minimumValidationExamples",
    "minimumTestExamples",
    "minimumTrainingPositiveExamples",
    "minimumTrainingNegativeExamples",
  ];

  for (const property of expectedProperties) {
    assert.match(
      source,
      new RegExp(`keys\\.${property}`)
    );
  }
});

test("retraining policy loader returns the existing readiness policy contract", () => {
  assert.match(
    source,
    /RouteRiskRetrainingReadinessPolicy/
  );

  const expectedProperties = [
    "policyVersion",
    "minimumTotalExamples",
    "minimumTrainingExamples",
    "minimumValidationExamples",
    "minimumTestExamples",
    "minimumTrainingPositiveExamples",
    "minimumTrainingNegativeExamples",
  ];

  for (const property of expectedProperties) {
    assert.match(
      source,
      new RegExp(`${property}:`)
    );
  }
});

test("retraining policy loader remains server-side configuration without execution persistence or lifecycle authority", () => {
  assert.match(
    source,
    /import "server-only"/
  );

  assert.match(
    source,
    /process\.env/
  );

  assert.doesNotMatch(
    source,
    /\.from\(/
  );

  assert.doesNotMatch(
    source,
    /\.rpc\(/
  );

  assert.doesNotMatch(
    source,
    /\.insert\(/
  );

  assert.doesNotMatch(
    source,
    /\.update\(/
  );

  assert.doesNotMatch(
    source,
    /\.delete\(/
  );

  assert.doesNotMatch(
    source,
    /runPreparedRouteRiskOfflineTraining\(/
  );

  assert.doesNotMatch(
    source,
    /persistRouteRiskTrainingRun\(/
  );

  assert.doesNotMatch(
    source,
    /registerRouteRiskModelCandidate\(/
  );

  assert.doesNotMatch(
    source,
    /activated_at|retired_at|shadow_started_at/
  );
});

test("retraining policy loader documents that configured structural minimums establish no statistical claim", () => {
  assert.match(
    source,
    /does not define or invent retraining thresholds/i
  );

  assert.match(
    source,
    /Every policy value must be supplied explicitly by configuration/i
  );

  assert.match(
    source,
    /do not establish statistical[\s\S]*sufficiency/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*select statistical thresholds/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*establish statistical significance/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*execute training/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*activate or retire a model/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*modify production Route Safety behavior/i
  );
});
