import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20260818104500_add_initial_shadow_evidence_cycle_to_transition.sql",
      import.meta.url
    ),
    "utf8"
  );

test("shadow transition still owns only approved to shadow lifecycle entry", () => {
  assert.match(
    source,
    /v_registry\.lifecycle_status <> 'approved'/
  );

  assert.match(
    source,
    /lifecycle_status\s*=\s*'shadow'/
  );

  assert.doesNotMatch(
    source,
    /lifecycle_status\s*=\s*'active'/
  );

  assert.doesNotMatch(
    source,
    /lifecycle_status\s*=\s*'retired'/
  );
});

test("shadow transition creates exactly the initial evidence cycle", () => {
  assert.match(
    source,
    /insert into public\.route_risk_shadow_evidence_cycles/
  );

  assert.match(
    source,
    /cycle_number,[\s\S]*cycle_kind/
  );

  assert.match(
    source,
    /\n\s*1,\s*\n\s*'initial_shadow'/
  );

  assert.doesNotMatch(
    source,
    /'revalidation_shadow'/
  );
});

test("initial evidence cycle is bound to exact registry training and organization identity", () => {
  assert.match(
    source,
    /v_registry\.organization_id/
  );

  assert.match(
    source,
    /v_registry\.id/
  );

  assert.match(
    source,
    /v_training\.id/
  );

  assert.match(
    source,
    /v_shadow_started_at/
  );

  assert.match(
    source,
    /v_actor_id/
  );

  assert.match(
    source,
    /v_rationale/
  );
});

test("shadow transition refuses pre-existing cycle history", () => {
  assert.match(
    source,
    /from public\.route_risk_shadow_evidence_cycles as cycle/
  );

  assert.match(
    source,
    /cycle\.model_registry_id\s*=\s*v_registry\.id/
  );

  assert.match(
    source,
    /already has shadow evidence-cycle history/
  );
});

test("cycle creation remains inside the controlled database transaction", () => {
  const lifecycleUpdate =
    source.indexOf(
      "update public.route_risk_model_registry"
    );

  const cycleInsert =
    source.indexOf(
      "insert into public.route_risk_shadow_evidence_cycles"
    );

  const auditInsert =
    source.indexOf(
      "insert into public.audit_logs"
    );

  const functionEnd =
    source.indexOf(
      "end;\n$$;"
    );

  assert.ok(lifecycleUpdate >= 0);
  assert.ok(cycleInsert > lifecycleUpdate);
  assert.ok(auditInsert > cycleInsert);
  assert.ok(functionEnd > auditInsert);
});

test("audit provenance includes evidence-cycle identity", () => {
  assert.match(
    source,
    /'evidenceCycleId'/
  );

  assert.match(
    source,
    /v_cycle\.id/
  );

  assert.match(
    source,
    /'evidenceCycleNumber'/
  );

  assert.match(
    source,
    /v_cycle\.cycle_number/
  );

  assert.match(
    source,
    /'evidenceCycleKind'/
  );

  assert.match(
    source,
    /v_cycle\.cycle_kind/
  );
});

test("shadow transition retains authenticated owner admin database authority", () => {
  assert.match(
    source,
    /auth\.uid\(\)/
  );

  assert.match(
    source,
    /'owner'/
  );

  assert.match(
    source,
    /'admin'/
  );

  assert.match(
    source,
    /security definer/
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

test("initial cycle creation grants no inference activation or production authority", () => {
  assert.match(
    source,
    /does NOT:[\s\S]*perform ML inference/i
  );

  assert.match(
    source,
    /persist shadow predictions/i
  );

  assert.match(
    source,
    /calculate promotion readiness/i
  );

  assert.match(
    source,
    /activate or retire a model/i
  );

  assert.match(
    source,
    /modify production Route Safety decisions/i
  );

  assert.doesNotMatch(
    source,
    /route_prediction_snapshots/
  );
});
