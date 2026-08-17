import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routePath =
  "app/api/fleet/route-risk-shadow-model-health/route.ts";

const source =
  fs.readFileSync(routePath, "utf8");

test("model-health API is organization scoped and reads immutable shadow evaluations", () => {
  assert.match(
    source,
    /requireOrganization/
  );

  assert.match(
    source,
    /route_risk_shadow_evaluations/
  );

  assert.match(
    source,
    /\.eq\(\s*"organization_id"/
  );

  assert.match(
    source,
    /predicted_probability/
  );

  assert.match(
    source,
    /observed_adverse_event/
  );
});

test("model-health API requires one explicit model identity", () => {
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
    /\.eq\(\s*"model_registry_id"/
  );

  assert.match(
    source,
    /\.eq\(\s*"training_run_id"/
  );
});

test("model-health API requires explicit non-overlapping evidence windows", () => {
  assert.match(source, /referenceStart/);
  assert.match(source, /referenceEnd/);
  assert.match(source, /recentStart/);
  assert.match(source, /recentEnd/);

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
});

test("model-health API delegates interpretation to the descriptive-only analyzer", () => {
  assert.match(
    source,
    /analyzeRouteRiskShadowModelHealth/
  );

  assert.doesNotMatch(
    source,
    /HEALTHY|DEGRADED|DRIFTED/
  );

  assert.doesNotMatch(
    source,
    /\.insert\(|\.update\(|\.delete\(/
  );
});
