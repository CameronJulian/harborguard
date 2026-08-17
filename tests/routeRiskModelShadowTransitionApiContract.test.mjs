import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/route-risk-model-shadow-transition/route.ts",
      import.meta.url
    ),
    "utf8"
  );

test("shadow transition API uses HarborGuard authenticated organization boundary", () => {
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

test("shadow transition API requires explicit registry identity and human rationale", () => {
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

test("shadow transition API delegates only to the authenticated shadow helper", () => {
  assert.match(
    source,
    /startRouteRiskModelShadow\(\{/
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
});

test("shadow transition API exposes shadow lifecycle provenance", () => {
  assert.match(
    source,
    /success:\s*true/
  );

  assert.match(
    source,
    /shadow:\s*result/
  );
});

test("shadow transition API maps authentication and authorization failures", () => {
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
});

test("shadow transition API creates no direct registry mutation authority", () => {
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

test("shadow transition API does not couple lifecycle entry to inference or production authority", () => {
  assert.doesNotMatch(
    source,
    /persistRouteRiskShadowPrediction/
  );

  assert.doesNotMatch(
    source,
    /executeRouteRiskShadow/
  );

  assert.doesNotMatch(
    source,
    /activated_at|retired_at/
  );

  assert.doesNotMatch(
    source,
    /activationDecision|rolloutReady|retrainingDecision/
  );

  assert.match(
    source,
    /does not approve a candidate/i
  );

  assert.match(
    source,
    /does not perform shadow inference/i
  );

  assert.match(
    source,
    /does not write shadow predictions/i
  );

  assert.match(
    source,
    /does not activate or retire a model/i
  );

  assert.match(
    source,
    /does not select production thresholds/i
  );

  assert.match(
    source,
    /does not modify production Route Safety behavior/i
  );
});
