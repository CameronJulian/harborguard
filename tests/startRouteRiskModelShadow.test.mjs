import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/startRouteRiskModelShadow.ts",
      import.meta.url
    ),
    "utf8"
  );

test("shadow transition delegates only to the controlled authenticated RPC", () => {
  assert.match(
    source,
    /start_route_risk_model_shadow/
  );

  assert.match(
    source,
    /\.rpc\(\s*ROUTE_RISK_MODEL_SHADOW_TRANSITION_RPC/
  );

  assert.match(
    source,
    /p_registry_id:\s*normalizedRegistryId/
  );

  assert.match(
    source,
    /p_rationale:\s*normalizedRationale/
  );
});

test("shadow transition requires explicit registry identity and rationale", () => {
  assert.match(
    source,
    /requireNonEmptyString\(\s*registryId,\s*"registryId"\s*\)/
  );

  assert.match(
    source,
    /requireNonEmptyString\(\s*rationale,\s*"rationale"\s*\)/
  );
});

test("shadow transition fails closed on RPC errors", () => {
  assert.match(
    source,
    /if\s*\(\s*error\s*\)\s*\{\s*throw error;\s*\}/
  );
});

test("shadow transition validates the returned shadow lifecycle identity", () => {
  assert.match(
    source,
    /typeof row\.id !== "string"/
  );

  assert.match(
    source,
    /typeof row\.organization_id !== "string"/
  );

  assert.match(
    source,
    /typeof row\.training_run_id !== "string"/
  );

  assert.match(
    source,
    /row\.lifecycle_status !== "shadow"/
  );

  assert.match(
    source,
    /typeof row\.shadow_started_at !== "string"/
  );

  assert.match(
    source,
    /returned an invalid registry record/
  );
});

test("shadow transition rejects a mismatched registry response", () => {
  assert.match(
    source,
    /row\.id !==\s*normalizedRegistryId/
  );

  assert.match(
    source,
    /returned the wrong registry/
  );
});

test("shadow transition exposes lifecycle provenance without direct registry mutation", () => {
  assert.match(
    source,
    /registryId:\s*row\.id/
  );

  assert.match(
    source,
    /organizationId:\s*row\.organization_id/
  );

  assert.match(
    source,
    /trainingRunId:\s*row\.training_run_id/
  );

  assert.match(
    source,
    /lifecycleStatus:\s*"shadow"/
  );

  assert.match(
    source,
    /shadowStartedAt:\s*row\.shadow_started_at/
  );

  assert.doesNotMatch(
    source,
    /\.from\(\s*"route_risk_model_registry"\s*\)/
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
});

test("shadow transition creates no inference activation or Route Safety authority", () => {
  assert.doesNotMatch(
    source,
    /persistRouteRiskShadowPrediction/
  );

  assert.doesNotMatch(
    source,
    /activated_at|retired_at/
  );

  assert.doesNotMatch(
    source,
    /activationDecision|rolloutReady|retrainingDecision/
  );

  assert.match(
    source,
    /does not approve a candidate/
  );

  assert.match(
    source,
    /does not perform shadow inference/
  );

  assert.match(
    source,
    /does not write shadow predictions/
  );

  assert.match(
    source,
    /does not activate or retire a model/
  );

  assert.match(
    source,
    /does not select production thresholds/
  );

  assert.match(
    source,
    /does not modify production Route Safety behavior/
  );
});
