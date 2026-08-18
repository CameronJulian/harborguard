import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/readRouteRiskModelPromotionReadinessPolicy.ts",
      import.meta.url
    ),
    "utf8"
  );

test("promotion policy configuration names every required explicit policy input", () => {
  const expectedKeys = [
    "ROUTE_RISK_PROMOTION_POLICY_VERSION",
    "ROUTE_RISK_PROMOTION_MIN_EVALUATED_PREDICTIONS",
    "ROUTE_RISK_PROMOTION_MIN_UNIQUE_VEHICLES",
    "ROUTE_RISK_PROMOTION_MIN_EVIDENCE_SPAN_DAYS",
    "ROUTE_RISK_PROMOTION_MIN_EVALUATION_COVERAGE_RATE",
    "ROUTE_RISK_PROMOTION_MAX_LARGEST_VEHICLE_SHARE",
  ];

  for (const key of expectedKeys) {
    assert.match(
      source,
      new RegExp(key)
    );
  }
});

test("promotion policy loader requires every value rather than supplying hidden defaults", () => {
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

test("promotion policy loader validates integer count policy fields", () => {
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

  assert.match(
    source,
    /keys\.minimumEvaluatedPredictions/
  );

  assert.match(
    source,
    /keys\.minimumUniqueVehicles/
  );
});

test("promotion policy loader validates evidence span independently from count fields", () => {
  assert.match(
    source,
    /function parseNonNegativeNumber/
  );

  assert.match(
    source,
    /keys\.minimumEvidenceSpanDays/
  );
});

test("promotion policy loader validates every rate inside the closed zero-to-one interval", () => {
  assert.match(
    source,
    /function parseRate/
  );

  assert.match(
    source,
    /value < 0\s*\|\|\s*value > 1/
  );

  assert.match(
    source,
    /keys\.minimumEvaluationCoverageRate/
  );

  assert.match(
    source,
    /keys\.maximumLargestVehicleShare/
  );
});

test("promotion policy loader returns the existing assessor policy contract", () => {
  assert.match(
    source,
    /RouteRiskModelPromotionReadinessPolicy/
  );

  assert.match(
    source,
    /policyVersion:/
  );

  assert.match(
    source,
    /minimumEvaluatedPredictions:/
  );

  assert.match(
    source,
    /minimumUniqueVehicles:/
  );

  assert.match(
    source,
    /minimumEvidenceSpanDays:/
  );

  assert.match(
    source,
    /minimumEvaluationCoverageRate:/
  );

  assert.match(
    source,
    /maximumLargestVehicleShare:/
  );
});

test("promotion policy loader remains server-side configuration without lifecycle authority", () => {
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
    /activationDecision|retrainingDecision|rolloutReady/
  );

  assert.doesNotMatch(
    source,
    /activated_at|retired_at|shadow_started_at/
  );
});

test("promotion policy loader documents that it invents no thresholds and performs no readiness decision", () => {
  assert.match(
    source,
    /does not define or invent promotion thresholds/i
  );

  assert.match(
    source,
    /Every policy value must be supplied explicitly by configuration/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*select statistical thresholds/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*assess promotion readiness itself/i
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
