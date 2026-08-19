import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const helperSource =
  fs.readFileSync(
    new URL(
      "../lib/fleet/prepareRouteRiskOfflineTrainingDataset.ts",
      import.meta.url
    ),
    "utf8"
  );

const runnerSource =
  fs.readFileSync(
    new URL(
      "../lib/fleet/runRouteRiskOfflineTraining.ts",
      import.meta.url
    ),
    "utf8"
  );

test("pre-training preparation composes read split and manifest without training", () => {
  assert.match(
    helperSource,
    /await readRouteRiskTrainingExamples\(\{/
  );

  assert.match(
    helperSource,
    /splitRouteRiskTrainingDataset\(\s*examples\s*\)/
  );

  assert.match(
    helperSource,
    /buildRouteRiskDatasetManifest\(\{/
  );

  assert.doesNotMatch(
    helperSource,
    /trainRouteRiskLogisticBaseline/
  );

  assert.doesNotMatch(
    helperSource,
    /evaluateRouteRiskLogisticBaseline/
  );
});

test("pre-training preparation derives class counts only from the training split", () => {
  assert.match(
    helperSource,
    /dataset\.train\.reduce/
  );

  assert.match(
    helperSource,
    /example\.label\s*\.observedAdverseEvent/
  );

  assert.match(
    helperSource,
    /dataset\.train\.length\s*-\s*positive/
  );
});

test("pre-training preparation creates no persistence or lifecycle authority", () => {
  assert.doesNotMatch(
    helperSource,
    /persistRouteRiskTrainingRun/
  );

  assert.doesNotMatch(
    helperSource,
    /registerRouteRiskModelCandidate/
  );

  assert.doesNotMatch(
    helperSource,
    /\.insert\(/
  );

  assert.doesNotMatch(
    helperSource,
    /\.update\(/
  );

  assert.doesNotMatch(
    helperSource,
    /\.delete\(/
  );
});

test("offline trainer consumes the reusable prepared dataset", () => {
  assert.match(
    runnerSource,
    /await prepareRouteRiskOfflineTrainingDataset\(\{/
  );

  assert.doesNotMatch(
    runnerSource,
    /await readRouteRiskTrainingExamples\(\{/
  );

  assert.doesNotMatch(
    runnerSource,
    /splitRouteRiskTrainingDataset\(\s*examples\s*\)/
  );

  assert.doesNotMatch(
    runnerSource,
    /buildRouteRiskDatasetManifest\(\{/
  );
});

test("offline trainer still trains only on dataset.train", () => {
  assert.match(
    runnerSource,
    /trainRouteRiskModel\(\{[\s\S]*examples:\s*dataset\.train[\s\S]*training[\s\S]*\}\)/
  );

  assert.doesNotMatch(
    runnerSource,
    /trainRouteRiskLogisticBaseline\(/
  );
});

test("offline trainer still evaluates validation and test independently", () => {
  assert.match(
    runnerSource,
    /examples:\s*dataset\.validation/
  );

  assert.match(
    runnerSource,
    /examples:\s*dataset\.test/
  );
});
