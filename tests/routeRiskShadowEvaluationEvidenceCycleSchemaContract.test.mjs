import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260818111500_bind_route_risk_shadow_evaluations_to_evidence_cycles.sql",
    import.meta.url
  ),
  "utf8"
);

test(
  "shadow evaluations gain explicit evidence-cycle provenance",
  () => {
    assert.match(
      source,
      /alter table public\.route_risk_shadow_evaluations[\s\S]*add column evidence_cycle_id uuid/
    );
  }
);

test(
  "historical evaluation rows remain valid during schema introduction",
  () => {
    assert.doesNotMatch(
      source,
      /evidence_cycle_id uuid not null/i
    );

    assert.doesNotMatch(
      source,
      /alter column evidence_cycle_id set not null/i
    );
  }
);

test(
  "evaluation cycle identity is bound to exact model training and organization identity",
  () => {
    assert.match(
      source,
      /foreign key\s*\(\s*evidence_cycle_id,\s*model_registry_id,\s*training_run_id,\s*organization_id\s*\)/s
    );

    assert.match(
      source,
      /references public\.route_risk_shadow_evidence_cycles\s*\(\s*id,\s*model_registry_id,\s*training_run_id,\s*organization_id\s*\)/s
    );

    assert.match(
      source,
      /on delete restrict/
    );
  }
);

test(
  "evaluation cycle provenance has a cycle completion index",
  () => {
    assert.match(
      source,
      /create index route_risk_shadow_evaluations_cycle_completed_idx/
    );

    assert.match(
      source,
      /evidence_cycle_id,\s*outcome_completed_at desc/s
    );

    assert.match(
      source,
      /where evidence_cycle_id is not null/
    );
  }
);

test(
  "schema binding does not weaken one-evaluation-per-prediction identity",
  () => {
    assert.doesNotMatch(
      source,
      /drop constraint[\s\S]*route_risk_shadow_evaluations_shadow_prediction_unique/i
    );

    assert.doesNotMatch(
      source,
      /drop index/i
    );
  }
);

test(
  "schema binding creates no lifecycle or production Route Safety authority",
  () => {
    assert.doesNotMatch(
      source,
      /update\s+public\.route_risk_model_registry/i
    );

    assert.doesNotMatch(
      source,
      /route_prediction_snapshots[\s\S]*(insert|update|delete)/i
    );

    assert.doesNotMatch(
      source,
      /lifecycle_status\s*=/i
    );
  }
);
