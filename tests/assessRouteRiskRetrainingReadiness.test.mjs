import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/fleet/assessRouteRiskRetrainingReadiness.ts",
  "utf8"
);

test(
  "retraining readiness is explicitly versioned and deterministic",
  () => {
    assert.match(
      source,
      /ROUTE_RISK_RETRAINING_READINESS_ASSESSMENT_VERSION/
    );

    assert.match(
      source,
      /harborguard-route-risk-retraining-readiness-v1/
    );

    assert.match(
      source,
      /READY_FOR_TRAINING/
    );

    assert.match(
      source,
      /NOT_READY_FOR_TRAINING/
    );
  }
);

test(
  "retraining readiness requires genuinely changed dataset identity",
  () => {
    assert.match(
      source,
      /previousDatasetFingerprint\s*===\s*null\s*\|\|\s*previousDatasetFingerprint\s*!==\s*currentDatasetFingerprint/
    );

    assert.match(
      source,
      /DATASET_UNCHANGED_SINCE_PREVIOUS_TRAINING/
    );
  }
);

test(
  "retraining readiness requires explicit structural dataset minimums",
  () => {
    assert.match(
      source,
      /minimumTotalExamples/
    );

    assert.match(
      source,
      /minimumTrainingExamples/
    );

    assert.match(
      source,
      /minimumValidationExamples/
    );

    assert.match(
      source,
      /minimumTestExamples/
    );
  }
);

test(
  "retraining readiness requires both training classes",
  () => {
    assert.match(
      source,
      /minimumTrainingPositiveExamples/
    );

    assert.match(
      source,
      /minimumTrainingNegativeExamples/
    );

    assert.match(
      source,
      /MINIMUM_TRAINING_POSITIVE_EXAMPLES_NOT_MET/
    );

    assert.match(
      source,
      /MINIMUM_TRAINING_NEGATIVE_EXAMPLES_NOT_MET/
    );
  }
);

test(
  "retraining readiness validates count coherence",
  () => {
    assert.match(
      source,
      /Dataset split counts must equal dataset\.counts\.total/
    );

    assert.match(
      source,
      /Training class counts must equal dataset\.counts\.train/
    );
  }
);

test(
  "retraining readiness remains non-authoritative",
  () => {
    assert.match(
      source,
      /TRAINING_EXECUTION_INPUT_ONLY_NO_LIFECYCLE_OR_PRODUCTION_AUTHORITY/
    );

    assert.doesNotMatch(
      source,
      /SupabaseClient|createClient/
    );

    assert.doesNotMatch(
      source,
      /\.from\(/
    );

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
  }
);

test(
  "retraining readiness documents absence of downstream lifecycle authority",
  () => {
    assert.match(
      source,
      /does NOT:[\s\S]*train a model/i
    );

    assert.match(
      source,
      /persist a training run/i
    );

    assert.match(
      source,
      /register a candidate/i
    );

    assert.match(
      source,
      /activate or retire a model/i
    );

    assert.match(
      source,
      /modify Route Safety behavior/i
    );
  }
);
