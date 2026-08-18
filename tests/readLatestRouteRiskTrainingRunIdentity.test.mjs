import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/fleet/readLatestRouteRiskTrainingRunIdentity.ts",
    "utf8"
  );

test(
  "latest training identity reads immutable training runs only",
  () => {
    assert.match(
      source,
      /\.from\(\s*"route_risk_training_runs"\s*\)/
    );

    assert.match(
      source,
      /\.select\(\s*"id, organization_id, dataset_fingerprint, created_at"\s*\)/
    );

    assert.doesNotMatch(
      source,
      /route_risk_model_registry/
    );
  }
);

test(
  "latest training identity is scoped to the exact organization",
  () => {
    assert.match(
      source,
      /\.eq\(\s*"organization_id",\s*normalizedOrganizationId\s*\)/
    );

    assert.match(
      source,
      /persistedOrganizationId\s*!==\s*normalizedOrganizationId/
    );
  }
);

test(
  "latest training identity orders newest persisted run first",
  () => {
    assert.match(
      source,
      /\.order\(\s*"created_at",[\s\S]*?ascending:\s*false/
    );

    assert.match(
      source,
      /\.order\(\s*"id",[\s\S]*?ascending:\s*false/
    );

    assert.match(
      source,
      /\.limit\(1\)[\s\S]*?\.maybeSingle\(\)/
    );
  }
);

test(
  "latest training identity permits first-ever training",
  () => {
    assert.match(
      source,
      /if\s*\(\s*!data\s*\)\s*\{[\s\S]*?return null;/
    );
  }
);

test(
  "latest training identity returns readiness-compatible identity",
  () => {
    assert.match(
      source,
      /trainingRunId/
    );

    assert.match(
      source,
      /datasetFingerprint/
    );

    assert.match(
      source,
      /createdAt/
    );

    assert.match(
      source,
      /RouteRiskPreviousTrainingIdentity/
    );
  }
);

test(
  "latest training identity validates persisted fingerprint provenance",
  () => {
    assert.match(
      source,
      /trainingRun\.dataset_fingerprint/
    );

    assert.match(
      source,
      /\^\[0-9a-f\]\{64\}\$/
    );
  }
);

test(
  "latest training identity has no persistence or lifecycle authority",
  () => {
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

    assert.doesNotMatch(
      source,
      /persistRouteRiskTrainingRun/
    );

    assert.doesNotMatch(
      source,
      /registerRouteRiskModelCandidate/
    );

    assert.doesNotMatch(
      source,
      /activateRouteRiskModel/
    );

    assert.doesNotMatch(
      source,
      /retireRouteRiskModel/
    );
  }
);

test(
  "latest training identity cannot modify Route Safety",
  () => {
    assert.doesNotMatch(
      source,
      /route_prediction_snapshots/
    );

    assert.doesNotMatch(
      source,
      /\breroute\b/i
    );

    assert.doesNotMatch(
      source,
      /\bescalat(?:e|ion|ed|ing)?\b/i
    );
  }
);
