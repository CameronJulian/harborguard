import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/api/fleet/cron/route-risk-shadow-model-health/route.ts",
  "utf8"
);

test(
  "model-health cron resolves one open evidence cycle for the resolved shadow artifact",
  () => {
    assert.match(
      source,
      /\.from\(\s*"route_risk_shadow_evidence_cycles"\s*\)[\s\S]*?\.select\(\s*"id"\s*\)[\s\S]*?\.eq\(\s*"organization_id",\s*organizationId\s*\)[\s\S]*?\.eq\(\s*"model_registry_id",\s*artifact\.registryId\s*\)[\s\S]*?\.eq\(\s*"training_run_id",\s*artifact\.trainingRunId\s*\)[\s\S]*?\.is\(\s*"ended_at",\s*null\s*\)[\s\S]*?\.maybeSingle\(\)/
    );
  }
);

test(
  "cron safely skips persistence when current shadow artifact has no open evidence cycle",
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
      /"no_open_evidence_cycle"/
    );

    assert.match(
      source,
      /persisted:\s*false/
    );
  }
);

test(
  "cron model-health windows are scoped to the resolved evidence cycle",
  () => {
    assert.match(
      source,
      /const readWindow[\s\S]*?\.from\(\s*"route_risk_shadow_evaluations"\s*\)[\s\S]*?\.eq\(\s*"organization_id",\s*organizationId\s*\)[\s\S]*?\.eq\(\s*"model_registry_id",\s*artifact\.registryId\s*\)[\s\S]*?\.eq\(\s*"training_run_id",\s*artifact\.trainingRunId\s*\)[\s\S]*?\.eq\(\s*"evidence_cycle_id",\s*evidenceCycleId\s*\)[\s\S]*?\.gte\(\s*"outcome_completed_at"/
    );
  }
);

test(
  "cron reference and recent windows share the same cycle-scoped reader",
  () => {
    assert.match(
      source,
      /await Promise\.all\(\s*\[\s*readWindow\([\s\S]*?referenceStart\.date[\s\S]*?referenceEnd\.date[\s\S]*?\)[\s\S]*?readWindow\([\s\S]*?recentStart\.date[\s\S]*?recentEnd\.date/
    );
  }
);

test(
  "cron response reports consumed evidence-cycle identity",
  () => {
    assert.match(
      source,
      /modelIdentity:\s*\{[\s\S]*?modelRegistryId:[\s\S]*?trainingRunId:[\s\S]*?evidenceCycleId/
    );
  }
);

test(
  "cron continues resolving lifecycle identity server-side",
  () => {
    assert.match(
      source,
      /readRouteRiskShadowModelArtifact/
    );

    assert.doesNotMatch(
      source,
      /searchParams\.get\(\s*"evidenceCycleId"\s*\)/
    );

    assert.doesNotMatch(
      source,
      /searchParams\.get\(\s*"modelRegistryId"\s*\)/
    );

    assert.doesNotMatch(
      source,
      /searchParams\.get\(\s*"trainingRunId"\s*\)/
    );
  }
);

test(
  "cron cycle scoping creates no new lifecycle or Route Safety authority",
  () => {
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
  }
);
