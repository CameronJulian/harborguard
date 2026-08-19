import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../supabase/migrations/20260819193000_create_route_risk_revalidation_shadow_transition_rpc.sql",
      import.meta.url
    ),
    "utf8"
  );

test(
  "revalidation transition is authenticated owner-admin authority",
  () => {
    assert.match(
      source,
      /create or replace function public\.start_route_risk_model_revalidation_shadow/
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
  "transition permits only retired to shadow",
  () => {
    assert.match(
      source,
      /v_registry\.lifecycle_status <> 'retired'/
    );

    assert.match(
      source,
      /lifecycle_status = 'shadow'/
    );

    assert.match(
      source,
      /previousLifecycleStatus'[\s\S]*'retired'/
    );

    assert.match(
      source,
      /newLifecycleStatus'[\s\S]*'shadow'/
    );
  }
);

test(
  "transition requires complete prior lifecycle provenance",
  () => {
    for (const field of [
      "approved_at",
      "approved_by",
      "shadow_started_at",
      "activated_at",
      "activated_by",
      "retired_at",
      "retired_by",
    ]) {
      assert.match(
        source,
        new RegExp(
          `v_registry\\.${field} is null`
        )
      );
    }
  }
);

test(
  "transition preserves historical activation and retirement attribution",
  () => {
    const updateMatch =
      source.match(
        /update public\.route_risk_model_registry[\s\S]*?returning \*/
      );

    assert.ok(updateMatch);

    const update =
      updateMatch[0];

    assert.doesNotMatch(
      update,
      /activated_at\s*=/
    );

    assert.doesNotMatch(
      update,
      /activated_by\s*=/
    );

    assert.doesNotMatch(
      update,
      /retired_at\s*=/
    );

    assert.doesNotMatch(
      update,
      /retired_by\s*=/
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
  "transition creates one new revalidation evidence cycle",
  () => {
    assert.match(
      source,
      /insert into public\.route_risk_shadow_evidence_cycles/
    );

    assert.match(
      source,
      /max\(cycle\.cycle_number\)/
    );

    assert.match(
      source,
      /'revalidation_shadow'/
    );

    assert.match(
      source,
      /v_cycle_number <= 1/
    );

    assert.match(
      source,
      /cycle\.ended_at is null/
    );
  }
);

test(
  "transition records immutable lifecycle audit provenance",
  () => {
    assert.match(
      source,
      /insert into public\.audit_logs/
    );

    assert.match(
      source,
      /route_risk_model\.revalidation_shadow_started/
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
  }
);

test(
  "transition creates no automatic rollback or production authority",
  () => {
    assert.match(
      source,
      /does not reactivate the model/i
    );

    assert.match(
      source,
      /automatically perform rollback/i
    );

    assert.match(
      source,
      /select a replacement model/i
    );

    assert.match(
      source,
      /production Route Safety/i
    );

    assert.doesNotMatch(
      source,
      /scoreRouteRisk/
    );

    assert.doesNotMatch(
      source,
      /route_prediction_snapshots/
    );
  }
);
