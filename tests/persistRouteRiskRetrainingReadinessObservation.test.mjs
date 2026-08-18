import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helperPath =
  "lib/fleet/persistRouteRiskRetrainingReadinessObservation.ts";

const source =
  fs.readFileSync(
    helperPath,
    "utf8"
  );

test(
  "persists exact retraining-readiness observation identity and assessment",
  () => {
    assert.match(
      source,
      /\.from\(\s*"route_risk_retraining_readiness_observations"\s*\)/
    );

    assert.match(
      source,
      /\.insert\(\{[\s\S]*organization_id:[\s\S]*dataset_fingerprint:[\s\S]*dataset_generated_at:[\s\S]*previous_training_run_id:[\s\S]*assessment_version:[\s\S]*policy_version:[\s\S]*readiness_state:[\s\S]*assessment:/s
    );

    assert.match(
      source,
      /assessment:\s*normalizedAssessment/
    );
  }
);

test(
  "dataset fingerprint and versions are derived from the exact readiness assessment",
  () => {
    assert.match(
      source,
      /normalizedAssessment[\s\S]*checks[\s\S]*datasetChanged[\s\S]*currentDatasetFingerprint/
    );

    assert.match(
      source,
      /normalizedAssessment[\s\S]*assessmentVersion/
    );

    assert.match(
      source,
      /normalizedAssessment[\s\S]*policyVersion/
    );

    assert.match(
      source,
      /normalizedAssessment\.state/
    );
  }
);

test(
  "previous training provenance must agree with the readiness assessment",
  () => {
    assert.match(
      source,
      /previousTraining === null/
    );

    assert.match(
      source,
      /previousDatasetFingerprint !==\s*null/
    );

    assert.match(
      source,
      /previousTraining\.datasetFingerprint/
    );

    assert.match(
      source,
      /previousDatasetFingerprint !==\s*normalizedPreviousDatasetFingerprint/
    );
  }
);

test(
  "duplicate readiness observation identity is recovered idempotently",
  () => {
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
      /status:\s*"created"/
    );

    assert.match(
      source,
      /status:\s*"existing"/
    );

    assert.match(
      source,
      /\.is\(\s*"previous_training_run_id",\s*null\s*\)/
    );

    assert.match(
      source,
      /\.eq\(\s*"previous_training_run_id",\s*previousTrainingRunId\s*\)/
    );
  }
);

test(
  "persisted readiness identity is validated after insert and duplicate recovery",
  () => {
    assert.match(
      source,
      /function assertPersistedIdentity/
    );

    const matches =
      source.match(
        /assertPersistedIdentity\(/g
      ) ?? [];

    assert.ok(
      matches.length >= 3,
      "identity validator should be defined and used after both persistence paths"
    );
  }
);

test(
  "helper preserves exact readiness object rather than recalculating readiness",
  () => {
    assert.doesNotMatch(
      source,
      /assessRouteRiskRetrainingReadiness\s*\(/
    );

    assert.match(
      source,
      /complete versioned readiness assessment is persisted without[\s\S]*recalculation or interpretation/i
    );
  }
);

test(
  "helper creates no training lifecycle statistical or Route Safety authority",
  () => {
    assert.match(
      source,
      /does NOT:[\s\S]*establish statistical sufficiency/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*train or evaluate a model/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*register or decide a candidate/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*activate or retire a model/i
    );

    assert.match(
      source,
      /does NOT:[\s\S]*reroute or escalate anything/i
    );

    assert.doesNotMatch(
      source,
      /runPreparedRouteRiskOfflineTraining\s*\(/
    );

    assert.doesNotMatch(
      source,
      /persistRouteRiskTrainingRun\s*\(/
    );

    assert.doesNotMatch(
      source,
      /registerRouteRiskModelCandidate\s*\(/
    );

    assert.doesNotMatch(
      source,
      /route_risk_model_registry/
    );

    assert.doesNotMatch(
      source,
      /route_prediction_snapshots/
    );
  }
);
