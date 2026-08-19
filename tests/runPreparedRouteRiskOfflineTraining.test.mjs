import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/fleet/runRouteRiskOfflineTraining.ts",
    "utf8"
  );

test(
  "prepared offline training accepts already-prepared deterministic evidence",
  () => {
    assert.match(
      source,
      /export type RunPreparedRouteRiskOfflineTrainingInput/
    );

    assert.match(
      source,
      /prepared:\s*PreparedRouteRiskOfflineTrainingDataset/
    );

    assert.match(
      source,
      /export function runPreparedRouteRiskOfflineTraining/
    );
  }
);

test(
  "prepared offline training does not perform another database read or dataset preparation",
  () => {
    const start =
      source.indexOf(
        "export function runPreparedRouteRiskOfflineTraining"
      );

    const end =
      source.indexOf(
        "/**\n * Executes HarborGuard's reproducible offline route-risk training pipeline.",
        start
      );

    assert.ok(start >= 0);
    assert.ok(end > start);

    const preparedExecution =
      source.slice(
        start,
        end
      );

    assert.doesNotMatch(
      preparedExecution,
      /prepareRouteRiskOfflineTrainingDataset/
    );

    assert.doesNotMatch(
      preparedExecution,
      /readRouteRiskTrainingExamples/
    );

    assert.doesNotMatch(
      preparedExecution,
      /\.from\(/
    );
  }
);

test(
  "prepared offline training optimizes only the prepared training split",
  () => {
    assert.match(
      source,
      /runPreparedRouteRiskOfflineTraining[\s\S]*?trainRouteRiskModel\(\{\s*examples:\s*dataset\.train,\s*training,\s*\}\)/
    );
  }
);

test(
  "prepared offline training evaluates validation and test independently",
  () => {
    assert.match(
      source,
      /runPreparedRouteRiskOfflineTraining[\s\S]*?examples:\s*dataset\.validation/
    );

    assert.match(
      source,
      /runPreparedRouteRiskOfflineTraining[\s\S]*?examples:\s*dataset\.test/
    );

    assert.match(
      source,
      /threshold:\s*evaluationThreshold/
    );
  }
);

test(
  "prepared offline training preserves exact prepared manifest provenance",
  () => {
    assert.match(
      source,
      /const\s*\{\s*dataset,\s*manifest,\s*\}\s*=\s*prepared/
    );

    assert.match(
      source,
      /return\s*\{[\s\S]*?manifest,[\s\S]*?model,[\s\S]*?validationEvaluation,[\s\S]*?testEvaluation/
    );
  }
);

test(
  "legacy full offline runner prepares once then delegates to prepared execution",
  () => {
    assert.match(
      source,
      /const prepared\s*=\s*await prepareRouteRiskOfflineTrainingDataset\(\{/
    );

    assert.match(
      source,
      /return runPreparedRouteRiskOfflineTraining\(\{\s*prepared,\s*evaluationThreshold,\s*training,\s*\}\)/
    );
  }
);

test(
  "prepared training boundary creates no persistence or lifecycle authority",
  () => {
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
