import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260818114500_harden_route_risk_shadow_evaluation_cycle_validation.sql",
    import.meta.url
  ),
  "utf8"
);

test(
  "new shadow evaluations require explicit evidence-cycle identity",
  () => {
    assert.match(
      source,
      /if new\.evidence_cycle_id is null then/
    );

    assert.match(
      source,
      /requires evidence-cycle identity/
    );
  }
);

test(
  "evaluation cycle must exactly match referenced prediction cycle",
  () => {
    assert.match(
      source,
      /prediction\.evidence_cycle_id\s*=\s*new\.evidence_cycle_id/
    );
  }
);

test(
  "existing prediction snapshot outcome and trip validation remains intact",
  () => {
    const required = [
      /prediction\.id\s*=\s*new\.shadow_prediction_id/,
      /prediction\.organization_id\s*=\s*new\.organization_id/,
      /prediction\.production_snapshot_id\s*=\s*new\.production_snapshot_id/,
      /prediction\.model_registry_id\s*=\s*new\.model_registry_id/,
      /prediction\.training_run_id\s*=\s*new\.training_run_id/,
      /prediction\.created_at\s*=\s*new\.prediction_created_at/,
      /prediction\.predicted_probability\s*=\s*new\.predicted_probability/,
      /snapshot\.trip_id\s*=\s*new\.trip_id/,
      /outcome\.trip_id\s*=\s*new\.trip_id/,
      /outcome\.completed_at\s*=\s*new\.outcome_completed_at/,
      /outcome\.adverse_event_occurred\s*=\s*new\.observed_adverse_event/,
      /trip\.organization_id\s*=\s*new\.organization_id/,
    ];

    for (const pattern of required) {
      assert.match(source, pattern);
    }
  }
);

test(
  "historical nullable rows are not rewritten",
  () => {
    assert.doesNotMatch(
      source,
      /update\s+public\.route_risk_shadow_evaluations/i
    );

    assert.doesNotMatch(
      source,
      /alter column evidence_cycle_id set not null/i
    );
  }
);

test(
  "trigger hardening preserves evaluation immutability and lifecycle isolation",
  () => {
    assert.doesNotMatch(
      source,
      /update\s+public\.route_risk_model_registry/i
    );

    assert.doesNotMatch(
      source,
      /lifecycle_status\s*=/i
    );

    assert.doesNotMatch(
      source,
      /(insert\s+into|update|delete\s+from)\s+public\.route_prediction_snapshots/i
    );
  }
);

test(
  "validation function keeps restricted execution surface",
  () => {
    assert.match(
      source,
      /revoke all[\s\S]*public\.validate_route_risk_shadow_evaluation_insert\(\)[\s\S]*from public, anon, authenticated/
    );
  }
);
