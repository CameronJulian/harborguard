import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import {
  analyzeRouteRiskModelPromotionEvidence,
  ROUTE_RISK_MODEL_PROMOTION_EVIDENCE_VERSION,
} from "../lib/fleet/analyzeRouteRiskModelPromotionEvidence.ts";

function prediction(overrides = {}) {
  return {
    shadowPredictionId:
      "prediction-a",
    modelRegistryId:
      "registry-a",
    trainingRunId:
      "training-a",
    vehicleId:
      "vehicle-a",
    predictionCreatedAt:
      "2026-08-01T10:00:00.000Z",
    outcomeCompletedAt:
      "2026-08-02T10:00:00.000Z",
    evaluationId:
      "evaluation-a",
    ...overrides,
  };
}

test("model promotion evidence is deterministic versioned and model scoped", () => {
  const input = {
    modelRegistryId:
      "registry-a",
    trainingRunId:
      "training-a",
    predictions: [
      prediction(),
    ],
  };

  const first =
    analyzeRouteRiskModelPromotionEvidence(
      input
    );

  const second =
    analyzeRouteRiskModelPromotionEvidence(
      input
    );

  assert.deepEqual(
    first,
    second
  );

  assert.equal(
    first.evidenceVersion,
    ROUTE_RISK_MODEL_PROMOTION_EVIDENCE_VERSION
  );

  assert.deepEqual(
    first.modelIdentity,
    {
      modelRegistryId:
        "registry-a",
      trainingRunId:
        "training-a",
    }
  );

  assert.equal(
    first.semantics,
    "MODEL_SCOPED_COMPLETED_JOURNEY_SHADOW_EVIDENCE"
  );
});

test("coverage denominator is eligible completed-journey candidate predictions", () => {
  const result =
    analyzeRouteRiskModelPromotionEvidence({
      modelRegistryId:
        "registry-a",
      trainingRunId:
        "training-a",
      predictions: [
        prediction({
          shadowPredictionId:
            "prediction-a",
          evaluationId:
            "evaluation-a",
        }),
        prediction({
          shadowPredictionId:
            "prediction-b",
          vehicleId:
            "vehicle-b",
          evaluationId:
            null,
        }),
        prediction({
          shadowPredictionId:
            "prediction-c",
          vehicleId:
            "vehicle-c",
          evaluationId:
            "evaluation-c",
        }),
      ],
    });

  assert.equal(
    result.eligiblePredictionCount,
    3
  );

  assert.equal(
    result.evaluatedPredictionCount,
    2
  );

  assert.equal(
    result.unevaluatedPredictionCount,
    1
  );

  assert.equal(
    result.evaluationCoverageRate,
    2 / 3
  );
});

test("model promotion evidence excludes predictions outside the exact candidate identity", () => {
  const result =
    analyzeRouteRiskModelPromotionEvidence({
      modelRegistryId:
        "registry-a",
      trainingRunId:
        "training-a",
      predictions: [
        prediction(),
        prediction({
          shadowPredictionId:
            "wrong-registry",
          modelRegistryId:
            "registry-b",
        }),
        prediction({
          shadowPredictionId:
            "wrong-training",
          trainingRunId:
            "training-b",
        }),
      ],
    });

  assert.equal(
    result.totalInputPredictionCount,
    3
  );

  assert.equal(
    result.eligiblePredictionCount,
    1
  );

  assert.equal(
    result.evaluatedPredictionCount,
    1
  );
});

test("model promotion evidence requires valid prediction outcome chronology", () => {
  const result =
    analyzeRouteRiskModelPromotionEvidence({
      modelRegistryId:
        "registry-a",
      trainingRunId:
        "training-a",
      predictions: [
        prediction(),
        prediction({
          shadowPredictionId:
            "after-outcome",
          predictionCreatedAt:
            "2026-08-03T10:00:00.000Z",
          outcomeCompletedAt:
            "2026-08-02T10:00:00.000Z",
        }),
        prediction({
          shadowPredictionId:
            "bad-time",
          outcomeCompletedAt:
            "not-a-date",
        }),
      ],
    });

  assert.equal(
    result.eligiblePredictionCount,
    1
  );
});

test("vehicle diversity and concentration use evaluated candidate evidence only", () => {
  const result =
    analyzeRouteRiskModelPromotionEvidence({
      modelRegistryId:
        "registry-a",
      trainingRunId:
        "training-a",
      predictions: [
        prediction({
          shadowPredictionId:
            "prediction-a",
          vehicleId:
            "vehicle-a",
        }),
        prediction({
          shadowPredictionId:
            "prediction-b",
          vehicleId:
            "vehicle-a",
          evaluationId:
            "evaluation-b",
        }),
        prediction({
          shadowPredictionId:
            "prediction-c",
          vehicleId:
            "vehicle-b",
          evaluationId:
            "evaluation-c",
        }),
        prediction({
          shadowPredictionId:
            "prediction-d",
          vehicleId:
            "vehicle-c",
          evaluationId:
            null,
        }),
      ],
    });

  assert.equal(
    result.uniqueVehicleCount,
    2
  );

  assert.equal(
    result.largestVehicleEvaluationCount,
    2
  );

  assert.equal(
    result.largestVehicleShare,
    2 / 3
  );

  assert.deepEqual(
    result.byVehicle,
    [
      {
        vehicleId:
          "vehicle-a",
        evaluationCount:
          2,
        share:
          2 / 3,
      },
      {
        vehicleId:
          "vehicle-b",
        evaluationCount:
          1,
        share:
          1 / 3,
      },
    ]
  );
});

test("evidence span uses immutable completed-trip evaluation timestamps", () => {
  const result =
    analyzeRouteRiskModelPromotionEvidence({
      modelRegistryId:
        "registry-a",
      trainingRunId:
        "training-a",
      predictions: [
        prediction({
          shadowPredictionId:
            "prediction-a",
          predictionCreatedAt:
            "2026-07-31T23:00:00.000Z",
          outcomeCompletedAt:
            "2026-08-01T00:00:00.000Z",
        }),
        prediction({
          shadowPredictionId:
            "prediction-b",
          vehicleId:
            "vehicle-b",
          evaluationId:
            "evaluation-b",
          outcomeCompletedAt:
            "2026-08-31T00:00:00.000Z",
        }),
      ],
    });

  assert.equal(
    result.oldestEvidenceCompletedAt,
    "2026-08-01T00:00:00.000Z"
  );

  assert.equal(
    result.newestEvidenceCompletedAt,
    "2026-08-31T00:00:00.000Z"
  );

  assert.equal(
    result.evidenceSpanDays,
    30
  );
});

test("empty candidate evidence reports zero counts and unknown ratios", () => {
  const result =
    analyzeRouteRiskModelPromotionEvidence({
      modelRegistryId:
        "registry-a",
      trainingRunId:
        "training-a",
      predictions: [],
    });

  assert.equal(
    result.eligiblePredictionCount,
    0
  );

  assert.equal(
    result.evaluatedPredictionCount,
    0
  );

  assert.equal(
    result.unevaluatedPredictionCount,
    0
  );

  assert.equal(
    result.evaluationCoverageRate,
    null
  );

  assert.equal(
    result.uniqueVehicleCount,
    0
  );

  assert.equal(
    result.largestVehicleShare,
    null
  );

  assert.equal(
    result.evidenceSpanDays,
    null
  );
});

test("model promotion evidence validates requested immutable identities", () => {
  assert.throws(
    () =>
      analyzeRouteRiskModelPromotionEvidence({
        modelRegistryId:
          " ",
        trainingRunId:
          "training-a",
        predictions: [],
      }),
    /modelRegistryId is required/
  );

  assert.throws(
    () =>
      analyzeRouteRiskModelPromotionEvidence({
        modelRegistryId:
          "registry-a",
        trainingRunId:
          "",
        predictions: [],
      }),
    /trainingRunId is required/
  );
});

test("model promotion evidence analyzer creates no persistence lifecycle or Route Safety authority", () => {
  const source =
    fs.readFileSync(
      new URL(
        "../lib/fleet/analyzeRouteRiskModelPromotionEvidence.ts",
        import.meta.url
      ),
      "utf8"
    );

  assert.doesNotMatch(
    source,
    /\.from\(\s*["']/
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

  assert.doesNotMatch(
    source,
    /activationDecision|retrainingDecision|rolloutReady/
  );

  assert.doesNotMatch(
    source,
    /activated_at|retired_at|shadow_started_at/
  );

  assert.match(
    source,
    /denominator is eligible persisted shadow predictions for completed/i
  );

  assert.match(
    source,
    /numerator is those eligible predictions that have an immutable/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*select or invent promotion thresholds/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*activate or retire a model/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*change production Route Safety behavior/i
  );
});
