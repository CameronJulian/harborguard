import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/decideRouteRiskModelCandidate.ts",
      import.meta.url
    ),
    "utf8"
  );

test("candidate decision delegates only to the controlled authenticated RPC", () => {
  assert.match(
    source,
    /decide_route_risk_model_candidate/
  );

  assert.match(
    source,
    /\.rpc\(\s*ROUTE_RISK_MODEL_CANDIDATE_DECISION_RPC/
  );

  assert.match(
    source,
    /p_registry_id:\s*normalizedRegistryId/
  );

  assert.match(
    source,
    /p_decision:\s*normalizedDecision/
  );

  assert.match(
    source,
    /p_rationale:\s*normalizedRationale/
  );
});

test("candidate decision requires explicit registry decision and rationale", () => {
  assert.match(
    source,
    /requireNonEmptyString\(\s*registryId,\s*"registryId"\s*\)/
  );

  assert.match(
    source,
    /requireDecision\(\s*decision\s*\)/
  );

  assert.match(
    source,
    /requireNonEmptyString\(\s*rationale,\s*"rationale"\s*\)/
  );

  assert.match(
    source,
    /decision !== "approved"/
  );

  assert.match(
    source,
    /decision !== "rejected"/
  );
});

test("candidate decision fails closed on RPC errors", () => {
  assert.match(
    source,
    /if\s*\(\s*error\s*\)\s*\{\s*throw error;\s*\}/
  );
});

test("candidate decision validates returned lifecycle identity", () => {
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
    /row\.lifecycle_status !== "approved"/
  );

  assert.match(
    source,
    /row\.lifecycle_status !== "rejected"/
  );

  assert.match(
    source,
    /returned an invalid registry record/
  );
});

test("candidate decision rejects mismatched registry or decision response", () => {
  assert.match(
    source,
    /row\.id !==\s*normalizedRegistryId/
  );

  assert.match(
    source,
    /returned the wrong registry/
  );

  assert.match(
    source,
    /row\.lifecycle_status !==\s*normalizedDecision/
  );

  assert.match(
    source,
    /returned the wrong lifecycle status/
  );
});

test("candidate decision exposes result without creating direct lifecycle mutation authority", () => {
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
    /lifecycleStatus:\s*row\.lifecycle_status/
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

test("candidate decision creates no automatic shadow activation or Route Safety authority", () => {
  assert.doesNotMatch(
    source,
    /start_route_risk_model_shadow/
  );

  assert.doesNotMatch(
    source,
    /shadow_started_at|activated_at|retired_at/
  );

  assert.doesNotMatch(
    source,
    /activationDecision|rolloutReady|retrainingDecision/
  );

  assert.match(
    source,
    /does not inspect or override database evidence gates/
  );

  assert.match(
    source,
    /does not enter shadow mode/
  );

  assert.match(
    source,
    /does not activate or retire a model/
  );

  assert.match(
    source,
    /does not select production performance thresholds/
  );

  assert.match(
    source,
    /does not modify production Route Safety behavior/
  );
});
