import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20260819201500_make_route_risk_activation_evidence_cycle_aware.sql",
      import.meta.url
    ),
    "utf8"
  );

test(
  "activation remains one authenticated owner-admin RPC",
  () => {
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
      /'owner',\s*'admin'/
    );

    assert.match(
      source,
      /grant execute[\s\S]*to authenticated/
    );

    assert.match(
      source,
      /revoke all[\s\S]*from service_role/
    );
  }
);

test(
  "activation still requires current shadow lifecycle status",
  () => {
    assert.match(
      source,
      /v_registry\.lifecycle_status <> 'shadow'/
    );

    assert.match(
      source,
      /must be in shadow lifecycle status before activation/
    );
  }
);

test(
  "activation requires and locks one open evidence cycle",
  () => {
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
      /cycle\.training_run_id\s*=\s*v_registry\.training_run_id/
    );

    assert.match(
      source,
      /cycle\.ended_at is null/
    );

    assert.match(
      source,
      /for update/
    );

    assert.match(
      source,
      /does not have an open evidence cycle/
    );
  }
);

test(
  "initial activation requires clean first-lifecycle attribution",
  () => {
    assert.match(
      source,
      /v_cycle\.cycle_kind = 'initial_shadow'/
    );

    assert.match(
      source,
      /v_cycle\.cycle_number <> 1/
    );

    assert.match(
      source,
      /v_registry\.activated_at is not null/
    );

    assert.match(
      source,
      /v_registry\.retired_at is not null/
    );

    assert.match(
      source,
      /'initial_activation'/
    );
  }
);

test(
  "revalidation activation requires historical activation and retirement attribution",
  () => {
    assert.match(
      source,
      /v_cycle\.cycle_kind = 'revalidation_shadow'/
    );

    assert.match(
      source,
      /v_cycle\.cycle_number <= 1/
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
      /v_registry\.retired_at is null/
    );

    assert.match(
      source,
      /v_registry\.retired_by is null/
    );

    assert.match(
      source,
      /'revalidation_activation'/
    );
  }
);

test(
  "reactivation snapshots old attribution before updating current registry state",
  () => {
    assert.match(
      source,
      /v_previous_activated_at\s*:=\s*v_registry\.activated_at/
    );

    assert.match(
      source,
      /v_previous_activated_by\s*:=\s*v_registry\.activated_by/
    );

    assert.match(
      source,
      /v_previous_retired_at\s*:=\s*v_registry\.retired_at/
    );

    assert.match(
      source,
      /v_previous_retired_by\s*:=\s*v_registry\.retired_by/
    );

    assert.match(
      source,
      /previousActivatedAt/
    );

    assert.match(
      source,
      /previousRetiredAt/
    );
  }
);

test(
  "activation closes the consumed evidence cycle atomically",
  () => {
    assert.match(
      source,
      /update public\.route_risk_shadow_evidence_cycles/
    );

    assert.match(
      source,
      /ended_at\s*=\s*v_activated_at/
    );

    assert.match(
      source,
      /end_reason\s*=/
    );

    assert.match(
      source,
      /where\s+id\s*=\s*v_cycle\.id[\s\S]*ended_at is null/
    );
  }
);

test(
  "reactivated registry returns to valid active current-state attribution",
  () => {
    const registryUpdate =
      source.match(
        /update public\.route_risk_model_registry[\s\S]*?where id =\s*v_registry\.id[\s\S]*?returning \*/
      );

    assert.ok(registryUpdate);

    assert.match(
      registryUpdate[0],
      /lifecycle_status\s*=\s*'active'/
    );

    assert.match(
      registryUpdate[0],
      /activated_at\s*=\s*v_activated_at/
    );

    assert.match(
      registryUpdate[0],
      /activated_by\s*=\s*v_actor_id/
    );

    assert.match(
      registryUpdate[0],
      /retired_at\s*=\s*null/
    );

    assert.match(
      registryUpdate[0],
      /retired_by\s*=\s*null/
    );
  }
);

test(
  "activation preserves immutable episode audit provenance",
  () => {
    assert.match(
      source,
      /insert into public\.audit_logs/
    );

    assert.match(
      source,
      /route_risk_model\.reactivated/
    );

    assert.match(
      source,
      /evidenceCycleId/
    );

    assert.match(
      source,
      /evidenceCycleNumber/
    );

    assert.match(
      source,
      /evidenceCycleKind/
    );

    assert.match(
      source,
      /previousActivatedAt/
    );

    assert.match(
      source,
      /previousRetiredAt/
    );
  }
);

test(
  "activation keeps incumbent retirement atomic",
  () => {
    assert.match(
      source,
      /v_previous_active\.activated_at is null/
    );

    assert.match(
      source,
      /v_previous_active\.retired_at is not null/
    );

    assert.match(
      source,
      /route_risk_model\.retired_for_activation/
    );

    assert.match(
      source,
      /replacementRegistryId/
    );
  }
);

test(
  "activation grants no automatic ML or production authority",
  () => {
    assert.match(
      source,
      /does NOT:[\s\S]*permit retired -> active directly/i
    );

    assert.match(
      source,
      /automatically select a model/i
    );

    assert.match(
      source,
      /automatically perform rollback/i
    );

    assert.match(
      source,
      /automatically promote a model/i
    );

    assert.match(
      source,
      /Route Safety production inference/i
    );

    assert.doesNotMatch(
      source,
      /scoreRouteRiskModel/
    );

    assert.doesNotMatch(
      source,
      /readRouteRiskShadowModelArtifact/
    );
  }
);
