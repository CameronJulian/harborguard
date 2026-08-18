import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260818133000_create_route_risk_retraining_readiness_observations.sql";

const source =
  fs.readFileSync(
    migrationPath,
    "utf8"
  );

test(
  "schema creates immutable retraining-readiness observation history",
  () => {
    assert.match(
      source,
      /create table public\.route_risk_retraining_readiness_observations/
    );

    assert.match(
      source,
      /dataset_fingerprint text not null/
    );

    assert.match(
      source,
      /dataset_generated_at timestamptz not null/
    );

    assert.match(
      source,
      /previous_training_run_id uuid null/
    );

    assert.match(
      source,
      /assessment_version text not null/
    );

    assert.match(
      source,
      /policy_version text not null/
    );

    assert.match(
      source,
      /readiness_state text not null/
    );

    assert.match(
      source,
      /assessment jsonb not null/
    );
  }
);

test(
  "schema constrains exact readiness identity and assessment shape",
  () => {
    assert.match(
      source,
      /dataset_fingerprint ~ '\^\[0-9a-f\]\{64\}\$'/
    );

    assert.match(
      source,
      /readiness_state in\s*\(\s*'NOT_READY_FOR_TRAINING',\s*'READY_FOR_TRAINING'\s*\)/s
    );

    assert.match(
      source,
      /jsonb_typeof\(assessment\) = 'object'/
    );

    assert.match(
      source,
      /length\(btrim\(assessment_version\)\) > 0/
    );

    assert.match(
      source,
      /length\(btrim\(policy_version\)\) > 0/
    );
  }
);

test(
  "previous training identity is organization-bound to immutable training runs",
  () => {
    assert.match(
      source,
      /foreign key\s*\(\s*previous_training_run_id,\s*organization_id\s*\)\s*references public\.route_risk_training_runs\s*\(\s*id,\s*organization_id\s*\)/s
    );

    assert.match(
      source,
      /on delete restrict/
    );
  }
);

test(
  "observation identity is retry-safe for first and subsequent training histories",
  () => {
    assert.match(
      source,
      /create unique index route_risk_retraining_readiness_observations_identity_unique/
    );

    assert.match(
      source,
      /organization_id,[\s\S]*dataset_fingerprint,[\s\S]*dataset_generated_at,[\s\S]*coalesce\([\s\S]*previous_training_run_id,[\s\S]*00000000-0000-0000-0000-000000000000[\s\S]*assessment_version,[\s\S]*policy_version/
    );
  }
);

test(
  "retraining-readiness observations are immutable",
  () => {
    assert.match(
      source,
      /route_risk_retraining_readiness_observations are immutable and cannot be changed/
    );

    assert.match(
      source,
      /before update[\s\S]*route_risk_retraining_readiness_observations/
    );

    assert.match(
      source,
      /before delete[\s\S]*route_risk_retraining_readiness_observations/
    );
  }
);

test(
  "schema follows organization-scoped machine-owned ML evidence privileges",
  () => {
    assert.match(
      source,
      /enable row level security/
    );

    assert.match(
      source,
      /for select\s*to authenticated/
    );

    assert.match(
      source,
      /profiles\.organization_id/
    );

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
      /grant select, insert[\s\S]*to service_role/
    );
  }
);

test(
  "schema grants no training lifecycle statistical or Route Safety authority",
  () => {
    assert.match(
      source,
      /observational execution-control evidence only/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*establish statistical sufficiency/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*train a model/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*register or approve a model candidate/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*activate or retire a model/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*modify production Route Safety behavior/i
    );

    assert.doesNotMatch(
      source,
      /insert into public\.route_risk_model_registry/
    );

    assert.doesNotMatch(
      source,
      /update public\.route_risk_model_registry/
    );
  }
);
