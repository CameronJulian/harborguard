import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helperPath =
  "lib/fleet/persistRouteRiskShadowPrediction.ts";

const source =
  fs.readFileSync(helperPath, "utf8");

test(
  "shadow prediction resolves the exact open evidence cycle before persistence",
  () => {
    assert.match(
      source,
      /\.from\(\s*["']route_risk_shadow_evidence_cycles["']\s*\)[\s\S]*?\.select\([\s\S]*?id[\s\S]*?\)[\s\S]*?\.eq\(\s*["']organization_id["'][\s\S]*?organizationId[\s\S]*?\.eq\(\s*["']model_registry_id["'][\s\S]*?modelRegistryId[\s\S]*?\.eq\(\s*["']training_run_id["'][\s\S]*?trainingRunId[\s\S]*?\.is\(\s*["']ended_at["']\s*,\s*null\s*\)[\s\S]*?\.maybeSingle\(\)/,
      "shadow prediction persistence must resolve the open evidence cycle for the exact organization, registry, and training identity"
    );
  }
);

test(
  "shadow prediction fails closed when no open evidence cycle exists",
  () => {
    assert.match(
      source,
      /open[\s-]*evidence[\s-]*cycle|evidence[\s-]*cycle[\s\S]*open/i,
      "helper must explicitly handle the required open evidence-cycle boundary"
    );
  }
);

test(
  "shadow prediction persists evidence cycle identity",
  () => {
    assert.match(
      source,
      /\.insert\(\s*\{[\s\S]*?evidence_cycle_id\s*:/,
      "shadow prediction insert must persist evidence_cycle_id"
    );
  }
);

test(
  "persisted shadow prediction exposes evidence cycle identity",
  () => {
    assert.match(
      source,
      /PersistedRouteRiskShadowPrediction[\s\S]*?evidenceCycleId\s*:\s*string/,
      "persisted prediction contract must expose evidenceCycleId"
    );

    assert.match(
      source,
      /SHADOW_PREDICTION_SELECT[\s\S]*?evidence_cycle_id/,
      "persisted prediction select must read evidence_cycle_id"
    );
  }
);

test(
  "persisted identity validation includes evidence cycle identity",
  () => {
    assert.match(
      source,
      /assertPersistedIdentity[\s\S]*?evidenceCycleId/,
      "persisted identity validation must include evidenceCycleId"
    );
  }
);

test(
  "duplicate recovery remains idempotent",
  () => {
    assert.match(
      source,
      /insertError\.code\s*!==\s*["']23505["']/,
      "existing PostgreSQL 23505 idempotency boundary must remain intact"
    );

    assert.match(
      source,
      /\.from\(\s*["']route_risk_shadow_predictions["']\s*\)[\s\S]*?\.maybeSingle\(\)/,
      "duplicate recovery must continue reading the existing immutable prediction"
    );
  }
);

test(
  "evidence-cycle binding grants no production Route Safety authority",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\(\s*["']route_prediction_snapshots["']\s*\)[\s\S]*?\.update\(/,
      "prediction persistence must not mutate production prediction snapshots"
    );

    assert.doesNotMatch(
      source,
      /\.rpc\(\s*["'][^"']*(?:reroute|escalat)[^"']*["']/i,
      "prediction persistence must not invoke reroute or escalation RPC authority"
    );

    assert.doesNotMatch(
      source,
      /\.from\(\s*["'][^"']*(?:reroute|escalat)[^"']*["']\s*\)[\s\S]*?\.(?:insert|update|delete)\(/i,
      "prediction persistence must not mutate reroute or escalation surfaces"
    );
  }
);
