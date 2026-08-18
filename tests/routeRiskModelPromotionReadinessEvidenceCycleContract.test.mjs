import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/api/fleet/route-risk-model-promotion-readiness/route.ts",
  "utf8"
);

test(
  "promotion readiness resolves one open evidence cycle for exact candidate identity",
  () => {
    assert.match(
      source,
      /\.from\(\s*"route_risk_shadow_evidence_cycles"\s*\)[\s\S]*?\.select\(\s*"id"\s*\)[\s\S]*?\.eq\(\s*"organization_id",\s*organizationId\s*\)[\s\S]*?\.eq\(\s*"model_registry_id",\s*validatedModelRegistryId\s*\)[\s\S]*?\.eq\(\s*"training_run_id",\s*validatedTrainingRunId\s*\)[\s\S]*?\.is\(\s*"ended_at",\s*null\s*\)[\s\S]*?\.maybeSingle\(\)/
    );
  }
);

test(
  "promotion readiness fails closed when open evidence-cycle identity is unavailable",
  () => {
    assert.match(
      source,
      /const evidenceCycleId\s*=\s*nonBlankString\(\s*openEvidenceCycleRow\?\.id\s*\)/
    );

    assert.match(
      source,
      /if\s*\(\s*!evidenceCycleId\s*\)/
    );

    assert.match(
      source,
      /does not have an open evidence cycle/
    );
  }
);

test(
  "promotion prediction denominator is scoped to exact evidence cycle",
  () => {
    assert.match(
      source,
      /\.from\(\s*"route_risk_shadow_predictions"\s*\)[\s\S]*?evidence_cycle_id[\s\S]*?\.eq\(\s*"evidence_cycle_id",\s*evidenceCycleId\s*\)/
    );

    assert.match(
      source,
      /row\.evidence_cycle_id/
    );

    assert.match(
      source,
      /rowEvidenceCycleId !== evidenceCycleId/
    );
  }
);

test(
  "promotion evaluation identity lookup is scoped to exact evidence cycle",
  () => {
    assert.match(
      source,
      /\.from\(\s*"route_risk_shadow_evaluations"\s*\)[\s\S]*?\.eq\(\s*"model_registry_id",\s*validatedModelRegistryId\s*\)[\s\S]*?\.eq\(\s*"training_run_id",\s*validatedTrainingRunId\s*\)[\s\S]*?\.eq\(\s*"evidence_cycle_id",\s*evidenceCycleId\s*\)[\s\S]*?\.in\(\s*"shadow_prediction_id"/
    );
  }
);

test(
  "promotion model-health windows consume the same exact evidence cycle",
  () => {
    assert.match(
      source,
      /const readModelHealthWindow[\s\S]*?\.from\(\s*"route_risk_shadow_evaluations"\s*\)[\s\S]*?\.eq\(\s*"evidence_cycle_id",\s*evidenceCycleId\s*\)[\s\S]*?\.gte\(\s*"outcome_completed_at"/
    );
  }
);

test(
  "promotion readiness reports the consumed evidence-cycle identity",
  () => {
    assert.match(
      source,
      /modelIdentity:\s*\{[\s\S]*?modelRegistryId:[\s\S]*?trainingRunId:[\s\S]*?evidenceCycleId/
    );
  }
);

test(
  "cycle scoping introduces no lifecycle or production mutation authority",
  () => {
    assert.doesNotMatch(
      source,
      /\.rpc\(/
    );

    assert.doesNotMatch(
      source,
      /\.insert\(/
    );

    assert.doesNotMatch(
      source,
      /\.update\(/
    );

    assert.doesNotMatch(
      source,
      /\.delete\(/
    );

    assert.doesNotMatch(
      source,
      /SUPABASE_SERVICE_ROLE_KEY/
    );
  }
);
