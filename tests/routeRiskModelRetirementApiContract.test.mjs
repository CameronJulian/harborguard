import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/route-risk-model-retirement/route.ts",
      import.meta.url
    ),
    "utf8"
  );

test("retirement API uses HarborGuard authenticated organization boundary", () => {
  assert.match(
    source,
    /requireOrganization/
  );

  assert.match(
    source,
    /await requireOrganization\(\)/
  );

  assert.match(
    source,
    /requireRole\(\s*role,\s*\[\s*"owner",\s*"admin",?\s*\]\s*\)/
  );

  assert.doesNotMatch(
    source,
    /SUPABASE_SERVICE_ROLE_KEY/
  );

  assert.doesNotMatch(
    source,
    /createClient\(/
  );
});

test("retirement API requires explicit registry identity and human rationale", () => {
  assert.match(
    source,
    /registryId/
  );

  assert.match(
    source,
    /rationale/
  );

  assert.match(
    source,
    /registryId is required/
  );

  assert.match(
    source,
    /rationale is required/
  );
});

test("retirement API delegates lifecycle authority only to retirement helper", () => {
  assert.match(
    source,
    /retireRouteRiskModel\(\{/
  );

  assert.match(
    source,
    /supabase,/
  );

  assert.match(
    source,
    /registryId,/
  );

  assert.match(
    source,
    /rationale,/
  );

  assert.doesNotMatch(
    source,
    /\.rpc\(/
  );
});

test("retirement API exposes retired lifecycle provenance", () => {
  assert.match(
    source,
    /success:\s*true/
  );

  assert.match(
    source,
    /retirement:\s*result/
  );
});

test("retirement API maps authentication authorization lookup and lifecycle failures", () => {
  assert.match(
    source,
    /message === "Unauthorized"/
  );

  assert.match(
    source,
    /return 401/
  );

  assert.match(
    source,
    /message === "Permission denied"/
  );

  assert.match(
    source,
    /return 403/
  );

  assert.match(
    source,
    /was not found or is not accessible/
  );

  assert.match(
    source,
    /return 404/
  );

  assert.match(
    source,
    /must be active before retirement/
  );

  assert.match(
    source,
    /return 409/
  );
});

test("retirement API creates no direct registry mutation authority", () => {
  assert.doesNotMatch(
    source,
    /\.from\(\s*"route_risk_model_registry"\s*\)/
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
    /\.rpc\(/
  );
});

test("retirement API does not choose replacement rollback retraining or production usage", () => {
  assert.match(
    source,
    /does not select or activate a replacement model/i
  );

  assert.match(
    source,
    /does not reactivate a previously retired model/i
  );

  assert.match(
    source,
    /does not perform automatic rollback/i
  );

  assert.match(
    source,
    /does not trigger retraining/i
  );

  assert.match(
    source,
    /does not read lifecycle state into Route Safety/i
  );

  assert.match(
    source,
    /does not modify production Route Safety scoring/i
  );

  assert.doesNotMatch(
    source,
    /activateRouteRiskModel/
  );

  assert.doesNotMatch(
    source,
    /readRouteRiskShadowModelArtifact/
  );

  assert.doesNotMatch(
    source,
    /scoreRouteRisk/
  );

  assert.doesNotMatch(
    source,
    /route_prediction_snapshots/
  );
});
