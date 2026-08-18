import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/retireRouteRiskModel.ts",
      import.meta.url
    ),
    "utf8"
  );

test("retirement helper delegates only to controlled authenticated RPC", () => {
  assert.match(
    source,
    /ROUTE_RISK_MODEL_RETIREMENT_RPC/
  );

  assert.match(
    source,
    /"retire_route_risk_model"/
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

test("retirement helper requires explicit registry identity and rationale", () => {
  assert.match(
    source,
    /requireNonEmptyString\([\s\S]*registryId/
  );

  assert.match(
    source,
    /requireNonEmptyString\([\s\S]*rationale/
  );
});

test("retirement helper validates retired lifecycle identity", () => {
  assert.match(
    source,
    /row\.lifecycle_status !== "retired"/
  );

  assert.match(
    source,
    /row\.activated_at/
  );

  assert.match(
    source,
    /row\.retired_at/
  );

  assert.match(
    source,
    /row\.id !== normalizedRegistryId/
  );
});

test("retirement helper fails closed on RPC or malformed response", () => {
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

  assert.match(
    source,
    /wrong registry/
  );
});

test("retirement helper creates no replacement rollback retraining or production authority", () => {
  assert.match(
    source,
    /does not select a replacement model/i
  );

  assert.match(
    source,
    /does not reactivate a retired model/i
  );

  assert.match(
    source,
    /does not perform automatic rollback/i
  );

  assert.match(
    source,
    /does not trigger retraining/i
  );

  assert.match(
    source,
    /does not read lifecycle state into Route Safety/i
  );

  assert.match(
    source,
    /does not alter production Route Safety scoring or decisions/i
  );

  assert.doesNotMatch(
    source,
    /activateRouteRiskModel/
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
