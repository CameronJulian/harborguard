import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20260818080000_create_route_risk_shadow_evidence_cycles.sql",
      import.meta.url
    ),
    "utf8"
  );

test("shadow evidence cycle schema provides explicit immutable episode identity", () => {
  assert.match(
    source,
    /create table public\.route_risk_shadow_evidence_cycles/
  );

  assert.match(
    source,
    /id uuid primary key/
  );

  assert.match(
    source,
    /model_registry_id uuid not null/
  );

  assert.match(
    source,
    /training_run_id uuid not null/
  );

  assert.match(
    source,
    /cycle_number integer not null/
  );

  assert.match(
    source,
    /cycle_kind text not null/
  );

  assert.match(
    source,
    /started_at timestamptz not null/
  );
});

test("cycle identity remains bound to exact registry training and organization identity", () => {
  assert.match(
    source,
    /foreign key\s*\(\s*model_registry_id,\s*training_run_id,\s*organization_id\s*\)/
  );

  assert.match(
    source,
    /references public\.route_risk_model_registry\s*\(\s*id,\s*training_run_id,\s*organization_id\s*\)/
  );

  assert.match(
    source,
    /unique\s*\(\s*id,\s*model_registry_id,\s*training_run_id,\s*organization_id\s*\)/
  );
});

test("cycle numbers are positive and unique within one model registry", () => {
  assert.match(
    source,
    /cycle_number > 0/
  );

  assert.match(
    source,
    /unique\s*\(\s*model_registry_id,\s*cycle_number\s*\)/
  );
});

test("cycle schema distinguishes initial and revalidation shadow episodes", () => {
  assert.match(
    source,
    /'initial_shadow'/
  );

  assert.match(
    source,
    /'revalidation_shadow'/
  );

  assert.doesNotMatch(
    source,
    /'active'/
  );
});

test("at most one open cycle exists per model registry", () => {
  assert.match(
    source,
    /create unique index route_risk_shadow_evidence_cycles_one_open_per_model_idx/
  );

  assert.match(
    source,
    /where ended_at is null/
  );
});

test("cycle schema requires explicit rationale and coherent closure provenance", () => {
  assert.match(
    source,
    /rationale text not null/
  );

  assert.match(
    source,
    /length\(\s*btrim\(rationale\)\s*\) > 0/
  );

  assert.match(
    source,
    /ended_at is null[\s\S]*end_reason is null/
  );

  assert.match(
    source,
    /ended_at is not null[\s\S]*end_reason is not null/
  );

  assert.match(
    source,
    /started_at <= ended_at/
  );
});

test("cycle table remains read only to runtime roles", () => {
  assert.match(
    source,
    /revoke all[\s\S]*from public, anon, authenticated, service_role/
  );

  assert.match(
    source,
    /grant select[\s\S]*to authenticated/
  );

  assert.match(
    source,
    /grant select[\s\S]*to service_role/
  );

  assert.doesNotMatch(
    source,
    /grant insert/
  );

  assert.doesNotMatch(
    source,
    /grant update/
  );

  assert.doesNotMatch(
    source,
    /grant delete/
  );
});

test("cycle schema creates no lifecycle or production Route Safety authority", () => {
  assert.match(
    source,
    /does NOT:[\s\S]*move a model into shadow/i
  );

  assert.match(
    source,
    /reactivate a retired model/i
  );

  assert.match(
    source,
    /activate or retire any model/i
  );

  assert.match(
    source,
    /calculate promotion readiness/i
  );

  assert.match(
    source,
    /modify existing shadow predictions or evaluations/i
  );

  assert.match(
    source,
    /production Route Safety/i
  );

  assert.doesNotMatch(
    source,
    /update public\.route_risk_model_registry/i
  );

  assert.doesNotMatch(
    source,
    /route_prediction_snapshots/
  );

  assert.doesNotMatch(
    source,
    /route_risk_shadow_predictions\s*\(/i
  );

  assert.doesNotMatch(
    source,
    /route_risk_shadow_evaluations\s*\(/i
  );
});
