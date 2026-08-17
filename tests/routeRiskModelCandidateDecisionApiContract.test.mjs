import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source =
  fs.readFileSync(
    new URL(
      "../app/api/fleet/route-risk-model-candidate-decision/route.ts",
      import.meta.url
    ),
    "utf8"
  );

test("candidate decision API uses HarborGuard authenticated organization boundary", () => {
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

test("candidate decision API accepts only explicit human lifecycle input", () => {
  assert.match(
    source,
    /registryId/
  );

  assert.match(
    source,
    /"approved"/
  );

  assert.match(
    source,
    /"rejected"/
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
    /decision must be approved or rejected/
  );

  assert.match(
    source,
    /rationale is required/
  );
});

test("candidate decision API delegates lifecycle authority to the authenticated helper", () => {
  assert.match(
    source,
    /decideRouteRiskModelCandidate\(\{/
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
    /decision:\s*decision as RouteRiskModelCandidateDecision/
  );

  assert.match(
    source,
    /rationale,/
  );
});

test("candidate decision API exposes the decided lifecycle record", () => {
  assert.match(
    source,
    /success:\s*true/
  );

  assert.match(
    source,
    /candidate:\s*result/
  );
});

test("candidate decision API maps authentication and authorization failures", () => {
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

test("candidate decision API creates no direct registry mutation authority", () => {
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

test("candidate decision API does not couple approval to shadow or production authority", () => {
  assert.doesNotMatch(
    source,
    /start_route_risk_model_shadow/
  );

  assert.doesNotMatch(
    source,
    /shadow_started_at|activated_at|retired_at/
  );

  assert.doesNotMatch(
    source,
    /activationDecision|rolloutReady|retrainingDecision/
  );

  assert.match(
    source,
    /does not enter shadow mode/i
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
