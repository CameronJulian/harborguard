import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL(
    "../lib/fleet/persistRouteRiskShadowModelHealthObservation.ts",
    import.meta.url
  ),
  "utf8"
);

test("persists immutable descriptive model-health observations", () => {
  assert.match(
    source,
    /\.from\(\s*"route_risk_shadow_model_health_observations"\s*\)/
  );

  assert.match(
    source,
    /\.insert\(\{/
  );

  assert.match(
    source,
    /organization_id:\s*normalizedOrganizationId/
  );

  assert.match(
    source,
    /model_registry_id:\s*normalizedModelRegistryId/
  );

  assert.match(
    source,
    /training_run_id:\s*normalizedTrainingRunId/
  );

  assert.match(
    source,
    /model_health:\s*normalizedModelHealth/
  );

  assert.match(
    source,
    /evidence_assessment:\s*normalizedEvidenceAssessment/
  );
});

test("derives persisted versions from the versioned result objects", () => {
  assert.match(
    source,
    /normalizedModelHealth\.analysisVersion/
  );

  assert.match(
    source,
    /normalizedEvidenceAssessment\.assessmentVersion/
  );

  assert.match(
    source,
    /analysis_version:\s*analysisVersion/
  );

  assert.match(
    source,
    /evidence_assessment_version:\s*evidenceAssessmentVersion/
  );
});

test("persists explicit non-overlapping evidence windows", () => {
  assert.match(
    source,
    /reference_start:\s*referenceStartIso/
  );

  assert.match(
    source,
    /reference_end:\s*referenceEndIso/
  );

  assert.match(
    source,
    /recent_start:\s*recentStartIso/
  );

  assert.match(
    source,
    /recent_end:\s*recentEndIso/
  );

  assert.match(
    source,
    /referenceStart must be earlier than or equal to referenceEnd/
  );

  assert.match(
    source,
    /recentStart must be earlier than or equal to recentEnd/
  );

  assert.match(
    source,
    /referenceEnd must be earlier than or equal to recentStart/
  );
});

test("duplicate observation identity is recovered idempotently", () => {
  assert.match(
    source,
    /insertError\.code !== "23505"/
  );

  assert.match(
    source,
    /\.maybeSingle\(\)/
  );

  assert.match(
    source,
    /\.eq\(\s*"organization_id"/
  );

  assert.match(
    source,
    /\.eq\(\s*"model_registry_id"/
  );

  assert.match(
    source,
    /\.eq\(\s*"training_run_id"/
  );

  assert.match(
    source,
    /\.eq\(\s*"analysis_version"/
  );

  assert.match(
    source,
    /\.eq\(\s*"evidence_assessment_version"/
  );

  assert.match(
    source,
    /status:\s*"existing"/
  );
});

test("helper creates no drift, retraining, lifecycle, or Route Safety authority", () => {
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
    /\bHEALTHY\b|\bDEGRADED\b|\bDRIFTED\b/
  );

  assert.doesNotMatch(
    source,
    /retrainingDecision|activationDecision|rolloutReady/
  );

  assert.match(
    source,
    /does not establish statistical sufficiency/
  );

  assert.match(
    source,
    /does not classify drift\/degradation/
  );

  assert.match(
    source,
    /does not trigger retraining/
  );

  assert.match(
    source,
    /does not mutate model lifecycle state/
  );

  assert.match(
    source,
    /does not affect production Route Safety/
  );
});
