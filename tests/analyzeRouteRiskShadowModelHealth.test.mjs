import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeRouteRiskShadowModelHealth,
} from "../lib/fleet/analyzeRouteRiskShadowModelHealth.ts";

function evaluation(
  predictedProbability,
  observedAdverseEvent
) {
  return {
    predictedProbability,
    observedAdverseEvent,
  };
}

test("returns null descriptive metrics for empty windows", () => {
  const result =
    analyzeRouteRiskShadowModelHealth({
      reference: [],
      recent: [],
    });

  assert.equal(
    result.semantics,
    "DESCRIPTIVE_ONLY_NO_DRIFT_THRESHOLD"
  );

  assert.equal(
    result.reference.totalInputCount,
    0
  );

  assert.equal(
    result.reference.validEvaluationCount,
    0
  );

  assert.equal(
    result.reference.brierScore,
    null
  );

  assert.equal(
    result.recent.predictedProbability.mean,
    null
  );

  assert.deepEqual(result.delta, {
    adverseEventRate: null,
    predictedProbabilityMean: null,
    predictedProbabilityMedian: null,
    brierScore: null,
  });
});

test("calculates deterministic window metrics and brier score", () => {
  const result =
    analyzeRouteRiskShadowModelHealth({
      reference: [
        evaluation(0.8, true),
        evaluation(0.2, false),
      ],
      recent: [],
    });

  assert.equal(
    result.reference.validEvaluationCount,
    2
  );

  assert.equal(
    result.reference.adverseEventCount,
    1
  );

  assert.equal(
    result.reference.adverseEventRate,
    0.5
  );

  assert.equal(
    result.reference.predictedProbability.mean,
    0.5
  );

  assert.equal(
    result.reference.predictedProbability.median,
    0.5
  );

  assert.equal(
    result.reference.predictedProbability.min,
    0.2
  );

  assert.equal(
    result.reference.predictedProbability.max,
    0.8
  );

  assert.ok(
    Math.abs(
      result.reference.brierScore - 0.04
    ) < 1e-12
  );
});

test("excludes malformed evaluations without inventing evidence", () => {
  const result =
    analyzeRouteRiskShadowModelHealth({
      reference: [
        evaluation(0.9, true),
        evaluation(-0.1, false),
        evaluation(1.1, true),
        evaluation(Number.NaN, false),
        evaluation("0.5", true),
        evaluation(0.5, "true"),
      ],
      recent: [],
    });

  assert.equal(
    result.reference.totalInputCount,
    6
  );

  assert.equal(
    result.reference.validEvaluationCount,
    1
  );

  assert.equal(
    result.reference.excludedEvaluationCount,
    5
  );

  assert.equal(
    result.reference.adverseEventRate,
    1
  );
});

test("reports recent minus reference descriptive deltas", () => {
  const result =
    analyzeRouteRiskShadowModelHealth({
      reference: [
        evaluation(0.2, false),
        evaluation(0.4, false),
      ],
      recent: [
        evaluation(0.6, true),
        evaluation(0.8, true),
      ],
    });

  assert.ok(
    Math.abs(
      result.delta.adverseEventRate - 1
    ) < 1e-12
  );

  assert.ok(
    Math.abs(
      result.delta.predictedProbabilityMean -
        0.4
    ) < 1e-12
  );

  assert.ok(
    Math.abs(
      result.delta.predictedProbabilityMedian -
        0.4
    ) < 1e-12
  );

  assert.ok(
    result.delta.brierScore !== null
  );
});

test("analysis is independent of evaluation ordering", () => {
  const evaluations = [
    evaluation(0.1, false),
    evaluation(0.7, true),
    evaluation(0.4, false),
    evaluation(0.9, true),
  ];

  const forward =
    analyzeRouteRiskShadowModelHealth({
      reference: evaluations,
      recent: evaluations,
    });

  const reversed =
    analyzeRouteRiskShadowModelHealth({
      reference: [...evaluations].reverse(),
      recent: [...evaluations].reverse(),
    });

  assert.deepEqual(forward, reversed);
});

test("does not produce drift, health, activation, or readiness decisions", () => {
  const result =
    analyzeRouteRiskShadowModelHealth({
      reference: [
        evaluation(0.1, false),
      ],
      recent: [
        evaluation(0.9, true),
      ],
    });

  const serialized = JSON.stringify(result);

  assert.equal(
    "healthState" in result,
    false
  );

  assert.equal(
    "driftState" in result,
    false
  );

  assert.equal(
    "activationDecision" in result,
    false
  );

  assert.equal(
    "rolloutReady" in result,
    false
  );

  assert.equal(
    serialized.includes('"HEALTHY"'),
    false
  );

  assert.equal(
    serialized.includes('"DEGRADED"'),
    false
  );
});
