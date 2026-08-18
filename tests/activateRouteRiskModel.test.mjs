import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/activateRouteRiskModel.ts",
      import.meta.url
    ),
    "utf8"
  );

test("activation helper delegates only to controlled authenticated RPC", () => {
  assert.match(
    source,
    /ROUTE_RISK_MODEL_ACTIVATION_RPC/
  );

  assert.match(
    source,
    /"activate_route_risk_model"/
  );

  assert.match(
    source,
    /await supabase\.rpc/
  );

  assert.match(
    source,
    /p_registry_id/
  );

  assert.match(
    source,
    /p_rationale/
  );

  assert.doesNotMatch(
    source,
    /\.from\(/
  );

  assert.doesNotMatch(
    source,
    /\.update\(/
  );

  assert.doesNotMatch(
    source,
    /\.insert\(/
  );

  assert.doesNotMatch(
    source,
    /\.delete\(/
  );
});

test("activation helper requires explicit registry identity and rationale", () => {
  assert.match(
    source,
    /requireNonEmptyString\([\s\S]*registryId/
  );

  assert.match(
    source,
    /requireNonEmptyString\([\s\S]*rationale/
  );
});

test("activation helper validates activated lifecycle identity", () => {
  assert.match(
    source,
    /expectedStatus:\s*\|\s*"active"\s*\|\s*"retired"/
  );

  assert.match(
    source,
    /activated_at/
  );

  assert.match(
    source,
    /activated\.registryId !==\s*normalizedRegistryId/
  );
});

test("activation helper validates optional incumbent retirement", () => {
  assert.match(
    source,
    /result\.retired !== null/
  );

  assert.match(
    source,
    /"retired"/
  );

  assert.match(
    source,
    /retired_at/
  );

  assert.match(
    source,
    /retired\.organizationId !==\s*activated\.organizationId/
  );

  assert.match(
    source,
    /retired\.registryId ===\s*activated\.registryId/
  );
});

test("activation helper fails closed on RPC errors", () => {
  assert.match(
    source,
    /if \(error\)\s*\{\s*throw error;/
  );

  assert.match(
    source,
    /invalid response/
  );

  assert.match(
    source,
    /invalid lifecycle record/
  );
});

test("activation helper creates no automatic readiness retraining or production authority", () => {
  assert.match(
    source,
    /does not calculate promotion readiness/i
  );

  assert.match(
    source,
    /does not automatically choose a model to activate/i
  );

  assert.match(
    source,
    /does not trigger retraining/i
  );

  assert.match(
    source,
    /does not select production thresholds/i
  );

  assert.match(
    source,
    /does not read an active model into Route Safety/i
  );

  assert.match(
    source,
    /does not modify production Route Safety scoring or decisions/i
  );

  assert.doesNotMatch(
    source,
    /readRouteRiskShadowModelArtifact/
  );

  assert.doesNotMatch(
    source,
    /scoreRouteRisk/
  );
});
