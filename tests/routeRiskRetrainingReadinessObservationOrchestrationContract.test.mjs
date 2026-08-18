import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "app/api/fleet/cron/route-risk-training/route.ts",
    "utf8"
  );

test(
  "training cron persists retraining readiness immediately after assessment",
  () => {
    const assessmentIndex =
      source.indexOf(
        "assessRouteRiskRetrainingReadiness({"
      );

    const observationIndex =
      source.indexOf(
        "await persistRouteRiskRetrainingReadinessObservation({",
        assessmentIndex
      );

    const noOpIndex =
      source.indexOf(
        'readiness.state ===',
        observationIndex
      );

    const trainingIndex =
      source.indexOf(
        "runPreparedRouteRiskOfflineTraining({",
        observationIndex
      );

    assert.ok(
      assessmentIndex >= 0
    );

    assert.ok(
      observationIndex > assessmentIndex
    );

    assert.ok(
      noOpIndex > observationIndex
    );

    assert.ok(
      trainingIndex > noOpIndex
    );
  }
);

test(
  "observation persistence receives exact organization dataset generation previous training and assessment identity",
  () => {
    assert.match(
      source,
      /persistRouteRiskRetrainingReadinessObservation\(\{[\s\S]*supabase,[\s\S]*organizationId,[\s\S]*datasetGeneratedAt:\s*prepared\.manifest\.generatedAt,[\s\S]*previousTraining,[\s\S]*assessment:\s*readiness/
    );
  }
);

test(
  "not-ready retraining response exposes persisted readiness observation",
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

    const noOpBlock =
      source.slice(
        noOpStart,
        thresholdIndex
      );

    assert.match(
      noOpBlock,
      /readinessObservation:\s*readinessObservation\.observation/
    );

    assert.match(
      noOpBlock,
      /readinessObservationStatus:\s*readinessObservation\.status/
    );

    assert.doesNotMatch(
      noOpBlock,
      /runPreparedRouteRiskOfflineTraining\s*\(/
    );
  }
);

test(
  "ready retraining response exposes the same persisted readiness observation",
  () => {
    const trainingIndex =
      source.indexOf(
        "runPreparedRouteRiskOfflineTraining({"
      );

    const readyResponse =
      source.slice(
        trainingIndex
      );

    assert.match(
      readyResponse,
      /readinessObservation:\s*readinessObservation\.observation/
    );

    assert.match(
      readyResponse,
      /readinessObservationStatus:\s*readinessObservation\.status/
    );
  }
);

test(
  "readiness observation persistence happens before training-run persistence and candidate registration",
  () => {
    const observationIndex =
      source.indexOf(
        "await persistRouteRiskRetrainingReadinessObservation({"
      );

    const trainingIndex =
      source.indexOf(
        "runPreparedRouteRiskOfflineTraining({",
        observationIndex
      );

    const persistenceIndex =
      source.indexOf(
        "await persistRouteRiskTrainingRun",
        trainingIndex
      );

    const registrationIndex =
      source.indexOf(
        "await registerRouteRiskModelCandidate",
        persistenceIndex
      );

    assert.ok(
      observationIndex >= 0
    );

    assert.ok(
      trainingIndex > observationIndex
    );

    assert.ok(
      persistenceIndex > trainingIndex
    );

    assert.ok(
      registrationIndex > persistenceIndex
    );
  }
);

test(
  "readiness observation wiring adds no lifecycle or Route Safety authority",
  () => {
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
