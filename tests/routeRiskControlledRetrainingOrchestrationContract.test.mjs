import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "app/api/fleet/cron/route-risk-training/route.ts",
    "utf8"
  );

test(
  "training cron composes all controlled retraining boundaries",
  () => {
    assert.match(
      source,
      /prepareRouteRiskOfflineTrainingDataset/
    );

    assert.match(
      source,
      /readLatestRouteRiskTrainingRunIdentity/
    );

    assert.match(
      source,
      /readRouteRiskRetrainingReadinessPolicy/
    );

    assert.match(
      source,
      /assessRouteRiskRetrainingReadiness/
    );

    assert.match(
      source,
      /runPreparedRouteRiskOfflineTraining/
    );

    assert.doesNotMatch(
      source,
      /\brunRouteRiskOfflineTraining\s*\(/
    );
  }
);

test(
  "retraining orchestration evaluates readiness before optimization persistence and registration",
  () => {
    const prepareIndex =
      source.indexOf(
        "await prepareRouteRiskOfflineTrainingDataset"
      );

    const previousIndex =
      source.indexOf(
        "await readLatestRouteRiskTrainingRunIdentity"
      );

    const policyIndex =
      source.indexOf(
        "readRouteRiskRetrainingReadinessPolicy()"
      );

    const readinessIndex =
      source.indexOf(
        "assessRouteRiskRetrainingReadiness({",
        policyIndex
      );

    const trainingIndex =
      source.indexOf(
        "runPreparedRouteRiskOfflineTraining({",
        readinessIndex
      );

    const persistIndex =
      source.indexOf(
        "await persistRouteRiskTrainingRun",
        trainingIndex
      );

    const registerIndex =
      source.indexOf(
        "await registerRouteRiskModelCandidate",
        persistIndex
      );

    assert.ok(
      prepareIndex >= 0
    );

    assert.ok(
      previousIndex > prepareIndex
    );

    assert.ok(
      policyIndex > previousIndex
    );

    assert.ok(
      readinessIndex > policyIndex
    );

    assert.ok(
      trainingIndex > readinessIndex
    );

    assert.ok(
      persistIndex > trainingIndex
    );

    assert.ok(
      registerIndex > persistIndex
    );
  }
);

test(
  "readiness consumes the exact prepared dataset fingerprint split counts and training class counts",
  () => {
    assert.match(
      source,
      /datasetFingerprint:\s*prepared\.manifest\s*\.datasetFingerprint/
    );

    assert.match(
      source,
      /train:\s*prepared\.dataset\.train\.length/
    );

    assert.match(
      source,
      /validation:\s*prepared\.dataset\.validation\.length/
    );

    assert.match(
      source,
      /test:\s*prepared\.dataset\.test\.length/
    );

    assert.match(
      source,
      /trainingClassCounts:\s*prepared\.trainingClassCounts/
    );

    assert.match(
      source,
      /previousTraining,\s*[\s\S]*?policy,/
    );
  }
);

test(
  "not-ready retraining is a successful no-op before model optimization",
  () => {
    const noOpStart =
      source.indexOf(
        'readiness.state ==='
      );

    const thresholdIndex =
      source.indexOf(
        "const evaluationThreshold",
        noOpStart
      );

    assert.ok(
      noOpStart >= 0
    );

    assert.ok(
      thresholdIndex > noOpStart
    );

    const noOpBlock =
      source.slice(
        noOpStart,
        thresholdIndex
      );

    assert.match(
      noOpBlock,
      /"NOT_READY_FOR_TRAINING"/
    );

    assert.match(
      noOpBlock,
      /success:\s*true/
    );

    assert.match(
      noOpBlock,
      /trained:\s*false/
    );

    assert.match(
      noOpBlock,
      /readiness,/
    );

    assert.doesNotMatch(
      noOpBlock,
      /runPreparedRouteRiskOfflineTraining\s*\(/
    );

    assert.doesNotMatch(
      noOpBlock,
      /persistRouteRiskTrainingRun\s*\(/
    );

    assert.doesNotMatch(
      noOpBlock,
      /registerRouteRiskModelCandidate\s*\(/
    );
  }
);

test(
  "execution-only evaluation threshold is parsed only after readiness permits training",
  () => {
    const readinessIndex =
      source.indexOf(
        'readiness.state ==='
      );

    const thresholdIndex =
      source.indexOf(
        "const evaluationThreshold",
        readinessIndex
      );

    const trainingIndex =
      source.indexOf(
        "runPreparedRouteRiskOfflineTraining({",
        thresholdIndex
      );

    assert.ok(
      readinessIndex >= 0
    );

    assert.ok(
      thresholdIndex > readinessIndex
    );

    assert.ok(
      trainingIndex > thresholdIndex
    );
  }
);

test(
  "ready retraining uses the exact already-prepared evidence",
  () => {
    assert.match(
      source,
      /runPreparedRouteRiskOfflineTraining\(\{\s*prepared,\s*evaluationThreshold,\s*\}\)/
    );

    assert.match(
      source,
      /trained:\s*true/
    );

    assert.match(
      source,
      /readiness,/
    );
  }
);

test(
  "controlled retraining preserves immutable persistence before candidate registration",
  () => {
    const trainingIndex =
      source.indexOf(
        "runPreparedRouteRiskOfflineTraining({"
      );

    const persistIndex =
      source.indexOf(
        "await persistRouteRiskTrainingRun",
        trainingIndex
      );

    const registerIndex =
      source.indexOf(
        "await registerRouteRiskModelCandidate",
        persistIndex
      );

    assert.ok(
      trainingIndex >= 0
    );

    assert.ok(
      persistIndex > trainingIndex
    );

    assert.ok(
      registerIndex > persistIndex
    );

    assert.match(
      source,
      /trainingRunId:\s*persisted\.id/
    );
  }
);

test(
  "controlled retraining adds no downstream lifecycle or Route Safety authority",
  () => {
    assert.match(
      source,
      /does not approve or reject a candidate/
    );

    assert.match(
      source,
      /does not enter shadow mode/
    );

    assert.match(
      source,
      /does not activate or retire a model/
    );

    assert.match(
      source,
      /does not modify live route-risk scoring/
    );

    assert.doesNotMatch(
      source,
      /\.from\(\s*"route_risk_model_registry"\s*\)/
    );

    assert.doesNotMatch(
      source,
      /approved_at|rejected_at|shadow_started_at|activated_at|retired_at/
    );

    assert.doesNotMatch(
      source,
      /\.rpc\(\s*["'][^"']*(?:reroute|escalat)[^"']*["']/i
    );
  }
);
