import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20260818071500_create_route_risk_model_retirement_rpc.sql",
      import.meta.url
    ),
    "utf8"
  );

test("retirement RPC is an authenticated owner-admin lifecycle boundary", () => {
  assert.match(
    source,
    /create or replace function public\.retire_route_risk_model/
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

test("retirement locks organization lifecycle state before mutation", () => {
  assert.match(
    source,
    /perform registry\.id[\s\S]*organization_id = v_actor_org_id[\s\S]*for update/
  );

  assert.match(
    source,
    /registry\.id = p_registry_id[\s\S]*registry\.organization_id =\s*v_actor_org_id/
  );
});

test("retirement permits only active to retired transition", () => {
  assert.match(
    source,
    /v_registry\.lifecycle_status <> 'active'/
  );

  assert.match(
    source,
    /lifecycle_status = 'retired'/
  );

  assert.match(
    source,
    /retired_at = v_retired_at/
  );

  assert.match(
    source,
    /retired_by = v_actor_id/
  );
});

test("retirement requires complete active lifecycle provenance", () => {
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
    /v_registry\.activated_at is null/
  );

  assert.match(
    source,
    /v_registry\.activated_by is null/
  );

  assert.match(
    source,
    /v_registry\.retired_at is not null/
  );

  assert.match(
    source,
    /v_registry\.retired_by is not null/
  );
});

test("retirement reconfirms immutable training artifact identity", () => {
  assert.match(
    source,
    /from public\.route_risk_training_runs as training/
  );

  assert.match(
    source,
    /training\.id =\s*v_registry\.training_run_id/
  );

  assert.match(
    source,
    /training\.organization_id =\s*v_registry\.organization_id/
  );
});

test("retirement records immutable audit provenance", () => {
  assert.match(
    source,
    /insert into public\.audit_logs/
  );

  assert.match(
    source,
    /route_risk_model\.retired/
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
    /activatedAt/
  );

  assert.match(
    source,
    /retiredAt/
  );

  assert.match(
    source,
    /rationale/
  );
});

test("retirement does not choose replacement reactivate rollback or control production inference", () => {
  assert.match(
    source,
    /does not select a replacement/i
  );

  assert.match(
    source,
    /reactivate retired models/i
  );

  assert.match(
    source,
    /automatic rollback/i
  );

  assert.match(
    source,
    /trigger retraining/i
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
