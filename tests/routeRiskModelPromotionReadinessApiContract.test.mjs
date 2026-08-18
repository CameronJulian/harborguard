import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routePath =
  "app/api/fleet/route-risk-model-promotion-readiness/route.ts";

const source =
  fs.readFileSync(
    routePath,
    "utf8"
  );

test("promotion readiness API uses authenticated organization boundary", () => {
  assert.match(
    source,
    /requireOrganization/
  );

  assert.match(
    source,
    /@\/lib\/server-auth/
  );

  assert.match(
    source,
    /\.eq\(\s*"organization_id",\s*organizationId\s*\)/
  );
});

test("promotion readiness API requires exact candidate identity", () => {
  assert.match(
    source,
    /modelRegistryId/
  );

  assert.match(
    source,
    /trainingRunId/
  );

  assert.match(
    source,
    /route_risk_model_registry/
  );

  assert.match(
    source,
    /\.eq\(\s*"id",\s*validatedModelRegistryId\s*\)/
  );

  assert.match(
    source,
    /\.eq\(\s*"training_run_id",\s*validatedTrainingRunId\s*\)/
  );

  assert.match(
    source,
    /lifecycle_status !==\s*"shadow"/
  );
});

test("promotion evidence is assembled from persisted prediction snapshot and completed outcome provenance", () => {
  assert.match(
    source,
    /route_risk_shadow_predictions/
  );

  assert.match(
    source,
    /production_snapshot_id/
  );

  assert.match(
    source,
    /route_prediction_snapshots/
  );

  assert.match(
    source,
    /vehicle_id, trip_id/
  );

  assert.match(
    source,
    /route_prediction_outcomes/
  );

  assert.match(
    source,
    /completed_at/
  );

  assert.match(
    source,
    /route_risk_shadow_evaluations/
  );

  assert.match(
    source,
    /shadow_prediction_id/
  );

  assert.match(
    source,
    /evaluationIdByPredictionId/
  );

  assert.match(
    source,
    /analyzeRouteRiskModelPromotionEvidence/
  );
});

test("unevaluated completed predictions remain eligible promotion evidence", () => {
  assert.match(
    source,
    /evaluationId:\s*evaluationIdByPredictionId\.get\([\s\S]*?\)\s*\?\?\s*null/
  );

  assert.doesNotMatch(
    source,
    /filter\([\s\S]*?evaluationIdByPredictionId\.has/
  );
});

test("model health reuses explicit non-overlapping evidence windows", () => {
  assert.match(
    source,
    /referenceStart/
  );

  assert.match(
    source,
    /referenceEnd/
  );

  assert.match(
    source,
    /recentStart/
  );

  assert.match(
    source,
    /recentEnd/
  );

  assert.match(
    source,
    /referenceEnd must be earlier than or equal to recentStart/
  );

  assert.match(
    source,
    /\.gte\(\s*"outcome_completed_at"/
  );

  assert.match(
    source,
    /\.lte\(\s*"outcome_completed_at"/
  );

  assert.match(
    source,
    /analyzeRouteRiskShadowModelHealth/
  );

  assert.match(
    source,
    /assessRouteRiskShadowModelHealthEvidence/
  );
});

test("promotion readiness composes explicit policy and descriptive assessor", () => {
  assert.match(
    source,
    /readRouteRiskModelPromotionReadinessPolicy/
  );

  assert.match(
    source,
    /assessRouteRiskModelPromotionReadiness/
  );

  assert.match(
    source,
    /HUMAN_REVIEW_INPUT_ONLY_NO_ACTIVATION_AUTHORITY/
  );
});

test("promotion readiness API creates no lifecycle or production mutation authority", () => {
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
    /decideRouteRiskModelCandidate/
  );

  assert.doesNotMatch(
    source,
    /startRouteRiskModelShadow/
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY/
  );
});
