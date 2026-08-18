import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL(
    "../app/api/fleet/cron/route-risk-shadow-model-health/route.ts",
    import.meta.url
  ),
  "utf8"
);

test("model-health cron is protected by HarborGuard cron authorization", () => {
  assert.match(
    source,
    /process\.env\.CRON_SECRET/
  );

  assert.match(
    source,
    /request\.headers\.get\(\s*"authorization"\s*\)/
  );

  assert.match(
    source,
    /`Bearer \$\{cronSecret\}`/
  );

  assert.match(
    source,
    /Unauthorized cron request/
  );
});

test("model-health cron uses service-role configuration and server-controlled organization identity", () => {
  assert.match(
    source,
    /NEXT_PUBLIC_SUPABASE_URL/
  );

  assert.match(
    source,
    /SUPABASE_SERVICE_ROLE_KEY/
  );

  assert.match(
    source,
    /ROUTE_RISK_MODEL_HEALTH_ORGANIZATION_ID/
  );

  assert.match(
    source,
    /persistSession:\s*false/
  );

  assert.match(
    source,
    /autoRefreshToken:\s*false/
  );
});

test("model-health cron resolves the current shadow model rather than accepting lifecycle identity from the request", () => {
  assert.match(
    source,
    /readRouteRiskShadowModelArtifact/
  );

  assert.match(
    source,
    /artifact\.registryId/
  );

  assert.match(
    source,
    /artifact\.trainingRunId/
  );

  assert.doesNotMatch(
    source,
    /searchParams\.get\(\s*"modelRegistryId"\s*\)/
  );

  assert.doesNotMatch(
    source,
    /searchParams\.get\(\s*"trainingRunId"\s*\)/
  );
});

test("model-health cron derives deterministic scheduled evidence windows server-side", () => {
  assert.match(
    source,
    /deriveRouteRiskShadowModelHealthScheduledWindows/
  );

  assert.match(
    source,
    /const scheduledWindows\s*=\s*deriveRouteRiskShadowModelHealthScheduledWindows\(\)/
  );

  assert.match(
    source,
    /referenceStart,[\s\S]*referenceEnd,[\s\S]*recentStart,[\s\S]*recentEnd,[\s\S]*scheduledWindows/
  );

  assert.doesNotMatch(
    source,
    /searchParams\.get\(\s*"referenceStart"\s*\)/
  );

  assert.doesNotMatch(
    source,
    /searchParams\.get\(\s*"referenceEnd"\s*\)/
  );

  assert.doesNotMatch(
    source,
    /searchParams\.get\(\s*"recentStart"\s*\)/
  );

  assert.doesNotMatch(
    source,
    /searchParams\.get\(\s*"recentEnd"\s*\)/
  );

  assert.match(
    source,
    /windowPolicy:\s*\{[\s\S]*version:[\s\S]*scheduledWindows\.policyVersion[\s\S]*anchorUtcDayStart:[\s\S]*scheduledWindows\.anchorUtcDayStart\.toISOString\(\)/
  );
});

test("model-health cron reads immutable shadow evaluations for the resolved model identity", () => {
  assert.match(
    source,
    /\.from\(\s*"route_risk_shadow_evaluations"\s*\)/
  );

  assert.match(
    source,
    /\.eq\(\s*"organization_id",\s*organizationId\s*\)/
  );

  assert.match(
    source,
    /\.eq\(\s*"model_registry_id",\s*artifact\.registryId\s*\)/
  );

  assert.match(
    source,
    /\.eq\(\s*"training_run_id",\s*artifact\.trainingRunId\s*\)/
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

test("model-health cron computes descriptive evidence and persists one immutable observation", () => {
  assert.match(
    source,
    /analyzeRouteRiskShadowModelHealth/
  );

  assert.match(
    source,
    /assessRouteRiskShadowModelHealthEvidence/
  );

  assert.match(
    source,
    /persistRouteRiskShadowModelHealthObservation/
  );

  assert.match(
    source,
    /modelHealth,\s*evidenceAssessment/
  );
});

test("model-health cron safely skips persistence when no shadow model exists", () => {
  assert.match(
    source,
    /if\s*\(\s*!artifact\s*\)/
  );

  assert.match(
    source,
    /"no_shadow_model"/
  );

  assert.match(
    source,
    /persisted:\s*false/
  );
});

test("model-health cron creates no statistical, drift, retraining, lifecycle, or Route Safety authority", () => {
  assert.doesNotMatch(
    source,
    /\bHEALTHY\b|\bDEGRADED\b|\bDRIFTED\b/
  );

  assert.doesNotMatch(
    source,
    /retrainingDecision|activationDecision|rolloutReady/
  );

  assert.doesNotMatch(
    source,
    /\.update\(/
  );

  assert.doesNotMatch(
    source,
    /\.delete\(/
  );

  assert.match(
    source,
    /does not establish statistical sufficiency/
  );

  assert.match(
    source,
    /does not classify model health or drift/
  );

  assert.match(
    source,
    /does not trigger retraining/
  );

  assert.match(
    source,
    /does not approve or activate a model/
  );

  assert.match(
    source,
    /does not modify production Route Safety/
  );

  assert.match(
    source,
    /not automatically scheduled/
  );
});
