import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/registerRouteRiskModelCandidate.ts",
      import.meta.url
    ),
    "utf8"
  );

test("candidate registration delegates only to the controlled database RPC", () => {
  assert.match(
    source,
    /register_route_risk_model_candidate/
  );

  assert.match(
    source,
    /\.rpc\(\s*ROUTE_RISK_MODEL_CANDIDATE_REGISTRATION_RPC/
  );

  assert.match(
    source,
    /p_training_run_id:\s*normalizedTrainingRunId/
  );

  assert.match(
    source,
    /p_organization_id:\s*normalizedOrganizationId/
  );
});

test("candidate registration validates required immutable identities", () => {
  assert.match(
    source,
    /requireNonEmptyString\(\s*organizationId,\s*"organizationId"\s*\)/
  );

  assert.match(
    source,
    /requireNonEmptyString\(\s*trainingRunId,\s*"trainingRunId"\s*\)/
  );
});

test("candidate registration fails closed on RPC errors", () => {
  assert.match(
    source,
    /if\s*\(\s*error\s*\)\s*\{\s*throw error;\s*\}/
  );
});

test("candidate registration validates returned registry identity", () => {
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
    /typeof row\.lifecycle_status !== "string"/
  );

  assert.match(
    source,
    /returned an invalid registry record/
  );
});

test("candidate registration rejects mismatched organization or training run", () => {
  assert.match(
    source,
    /row\.organization_id !==\s*normalizedOrganizationId/
  );

  assert.match(
    source,
    /returned the wrong organization/
  );

  assert.match(
    source,
    /row\.training_run_id !==\s*normalizedTrainingRunId/
  );

  assert.match(
    source,
    /returned the wrong training run/
  );
});

test("candidate registration exposes lifecycle identity without creating lifecycle authority", () => {
  assert.match(
    source,
    /registryId:\s*row\.id/
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
    /approved_at|rejected_at|shadow_started_at|activated_at|retired_at/
  );

  assert.doesNotMatch(
    source,
    /retrainingDecision|activationDecision|rolloutReady/
  );
});

test("candidate registration documents its non-authoritative boundary", () => {
  assert.match(
    source,
    /does not train a model/
  );

  assert.match(
    source,
    /does not approve or reject a candidate/
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
    /does not select a production threshold/
  );

  assert.match(
    source,
    /does not modify production Route Safety behavior/
  );
});
