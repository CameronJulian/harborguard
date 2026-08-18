import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/api/fleet/route-risk-shadow-model-health/route.ts",
  "utf8"
);

test(
  "standalone model health resolves one open evidence cycle for exact model identity",
  () => {
    assert.match(
      source,
      /\.from\(\s*"route_risk_shadow_evidence_cycles"\s*\)[\s\S]*?\.select\(\s*"id"\s*\)[\s\S]*?\.eq\(\s*"organization_id",\s*organizationId\s*\)[\s\S]*?\.eq\(\s*"model_registry_id",\s*modelRegistryId\.value\s*\)[\s\S]*?\.eq\(\s*"training_run_id",\s*trainingRunId\.value\s*\)[\s\S]*?\.is\(\s*"ended_at",\s*null\s*\)[\s\S]*?\.maybeSingle\(\)/
    );
  }
);

test(
  "standalone model health fails closed without an open evidence cycle",
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

    assert.match(
      source,
      /status:\s*409/
    );
  }
);

test(
  "standalone model-health windows are scoped to the resolved evidence cycle",
  () => {
    assert.match(
      source,
      /const readWindow[\s\S]*?\.from\(\s*"route_risk_shadow_evaluations"\s*\)[\s\S]*?\.eq\(\s*"organization_id",\s*organizationId\s*\)[\s\S]*?\.eq\(\s*"model_registry_id",\s*modelRegistryId\.value\s*\)[\s\S]*?\.eq\(\s*"training_run_id",\s*trainingRunId\.value\s*\)[\s\S]*?\.eq\(\s*"evidence_cycle_id",\s*evidenceCycleId\s*\)[\s\S]*?\.gte\(\s*"outcome_completed_at"/
    );
  }
);

test(
  "reference and recent windows share the same cycle-scoped reader",
  () => {
    assert.match(
      source,
      /await Promise\.all\(\s*\[\s*readWindow\([\s\S]*?referenceStart\.date[\s\S]*?referenceEnd\.date[\s\S]*?\)[\s\S]*?readWindow\([\s\S]*?recentStart\.date[\s\S]*?recentEnd\.date/
    );
  }
);

test(
  "standalone model health reports consumed evidence-cycle identity",
  () => {
    assert.match(
      source,
      /modelIdentity:\s*\{[\s\S]*?modelRegistryId:[\s\S]*?trainingRunId:[\s\S]*?evidenceCycleId/
    );
  }
);

test(
  "open-cycle scoping creates no lifecycle or production mutation authority",
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

    assert.doesNotMatch(
      source,
      /HEALTHY|DEGRADED|DRIFTED/
    );
  }
);
