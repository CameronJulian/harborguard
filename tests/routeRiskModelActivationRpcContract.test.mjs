import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20260818063000_create_route_risk_model_activation_rpc.sql",
      import.meta.url
    ),
    "utf8"
  );

test("activation RPC is an authenticated owner-admin lifecycle boundary", () => {
  assert.match(
    source,
    /create or replace function public\.activate_route_risk_model/
  );

  assert.match(
    source,
    /auth\.uid\(\)/
  );

  assert.match(
    source,
    /profiles\.organization_id/
  );

  assert.match(
    source,
    /profiles\.role/
  );

  assert.match(
    source,
    /v_actor_role not in\s*\(\s*'owner',\s*'admin'\s*\)/
  );

  assert.match(
    source,
    /grant execute[\s\S]*to authenticated/
  );

  assert.match(
    source,
    /revoke all[\s\S]*from service_role/
  );
});

test("activation locks organization lifecycle state before mutation", () => {
  assert.match(
    source,
    /perform registry\.id[\s\S]*organization_id = v_actor_org_id[\s\S]*for update/
  );

  assert.match(
    source,
    /registry\.id = p_registry_id[\s\S]*registry\.organization_id = v_actor_org_id/
  );
});

test("activation permits only shadow to active transition", () => {
  assert.match(
    source,
    /v_registry\.lifecycle_status <> 'shadow'/
  );

  assert.match(
    source,
    /lifecycle_status = 'active'/
  );

  assert.match(
    source,
    /activated_at = v_activated_at/
  );

  assert.match(
    source,
    /activated_by = v_actor_id/
  );
});

test("activation requires complete prerequisite lifecycle provenance", () => {
  assert.match(
    source,
    /v_registry\.approved_at is null/
  );

  assert.match(
    source,
    /v_registry\.approved_by is null/
  );

  assert.match(
    source,
    /v_registry\.shadow_started_at is null/
  );

  assert.match(
    source,
    /v_registry\.rejected_at is not null/
  );

  assert.match(
    source,
    /v_registry\.activated_at is not null/
  );

  assert.match(
    source,
    /v_registry\.retired_at is not null/
  );
});

test("activation reconfirms immutable training artifact identity", () => {
  assert.match(
    source,
    /from public\.route_risk_training_runs as training/
  );

  assert.match(
    source,
    /training\.id = v_registry\.training_run_id/
  );

  assert.match(
    source,
    /training\.organization_id =\s*v_registry\.organization_id/
  );
});

test("activation atomically retires the previous active model", () => {
  assert.match(
    source,
    /registry\.lifecycle_status = 'active'/
  );

  const retireIndex =
    source.indexOf(
      "lifecycle_status = 'retired'"
    );

  const activateIndex =
    source.indexOf(
      "lifecycle_status = 'active'",
      retireIndex + 1
    );

  assert.ok(
    retireIndex >= 0,
    "incumbent retirement must exist"
  );

  assert.ok(
    activateIndex > retireIndex,
    "incumbent must be retired before challenger activation"
  );

  assert.match(
    source,
    /retired_at = v_activated_at/
  );

  assert.match(
    source,
    /retired_by = v_actor_id/
  );
});

test("activation records atomic lifecycle audit provenance", () => {
  assert.match(
    source,
    /insert into public\.audit_logs/
  );

  assert.match(
    source,
    /route_risk_model\.activated/
  );

  assert.match(
    source,
    /route_risk_model\.retired_for_activation/
  );

  assert.match(
    source,
    /previousLifecycleStatus/
  );

  assert.match(
    source,
    /newLifecycleStatus/
  );

  assert.match(
    source,
    /previousActiveRegistryId/
  );

  assert.match(
    source,
    /rationale/
  );
});

test("activation creates no automatic readiness retraining scheduling or Route Safety authority", () => {
  assert.match(
    source,
    /does not itself establish statistical readiness/i
  );

  assert.match(
    source,
    /select production thresholds/i
  );

  assert.match(
    source,
    /trigger retraining/i
  );

  assert.match(
    source,
    /schedule activation/i
  );

  assert.match(
    source,
    /connect registry state to Route Safety inference/i
  );

  assert.doesNotMatch(
    source,
    /route_prediction_snapshots/
  );

  assert.doesNotMatch(
    source,
    /route_risk_shadow_predictions/
  );

  assert.doesNotMatch(
    source,
    /route_risk_shadow_evaluations/
  );
});
