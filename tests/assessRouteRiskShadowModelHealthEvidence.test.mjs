import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeRouteRiskShadowModelHealth,
} from "../lib/fleet/analyzeRouteRiskShadowModelHealth.ts";

import {
  assessRouteRiskShadowModelHealthEvidence,
  ROUTE_RISK_SHADOW_MODEL_HEALTH_EVIDENCE_ASSESSMENT_VERSION,
} from "../lib/fleet/assessRouteRiskShadowModelHealthEvidence.ts";

function evaluation(
  predictedProbability,
  observedAdverseEvent
) {
  return {
    predictedProbability,
    observedAdverseEvent,
  };
}

function assess(reference, recent) {
  const comparison =
    analyzeRouteRiskShadowModelHealth({
      reference,
      recent,
    });

  return assessRouteRiskShadowModelHealthEvidence(
    comparison
  );
}

test("reports no evidence when both windows are empty", () => {
  const result = assess([], []);

  assert.equal(
    result.assessmentVersion,
    ROUTE_RISK_SHADOW_MODEL_HEALTH_EVIDENCE_ASSESSMENT_VERSION
  );

  assert.equal(
    result.state,
    "NO_EVIDENCE"
  );

  assert.equal(
    result.statisticalSufficiency,
    "NOT_ESTABLISHED"
  );

  assert.ok(
    result.reasonCodes.includes(
      "REFERENCE_WINDOW_EMPTY"
    )
  );

  assert.ok(
    result.reasonCodes.includes(
      "RECENT_WINDOW_EMPTY"
    )
  );
});

test("reports limited evidence when either comparison window lacks valid evidence", () => {
  const result =
    assess(
      [
        evaluation(0.4, false),
      ],
      []
    );

  assert.equal(
    result.state,
    "LIMITED_EVIDENCE"
  );

  assert.equal(
    result.windows.reference
      .hasValidDescriptiveEvidence,
    true
  );

  assert.equal(
    result.windows.recent
      .hasValidDescriptiveEvidence,
    false
  );
});

test("reports descriptive evidence availability without claiming statistical sufficiency", () => {
  const result =
    assess(
      [
        evaluation(0.2, false),
        evaluation(0.8, true),
      ],
      [
        evaluation(0.3, false),
        evaluation(0.7, true),
      ]
    );

  assert.equal(
    result.state,
    "DESCRIPTIVE_EVIDENCE_AVAILABLE"
  );

  assert.equal(
    result.statisticalSufficiency,
    "NOT_ESTABLISHED"
  );

  assert.ok(
    result.reasonCodes.includes(
      "STATISTICAL_SUFFICIENCY_NOT_ESTABLISHED"
    )
  );

  assert.ok(
    result.reasonCodes.includes(
      "CROWD_INTELLIGENCE_SCALE_NOT_ESTABLISHED"
    )
  );
});

test("records malformed evidence without treating it as valid descriptive evidence", () => {
  const result =
    assess(
      [
        evaluation(0.4, false),
        evaluation(2, true),
      ],
      [
        evaluation(0.6, true),
      ]
    );

  assert.equal(
    result.windows.reference.totalInputCount,
    2
  );

  assert.equal(
    result.windows.reference.validEvaluationCount,
    1
  );

  assert.equal(
    result.windows.reference.excludedEvaluationCount,
    1
  );

  assert.equal(
    result.windows.reference.containsExcludedEvidence,
    true
  );

  assert.ok(
    result.reasonCodes.includes(
      "REFERENCE_WINDOW_EXCLUDED_EVALUATIONS"
    )
  );
});

test("does not create statistical, drift, retraining, activation, or readiness authority", () => {
  const result =
    assess(
      [
        evaluation(0.1, false),
      ],
      [
        evaluation(0.9, true),
      ]
    );

  const serialized =
    JSON.stringify(result);

  assert.equal(
    "driftState" in result,
    false
  );

  assert.equal(
    "healthState" in result,
    false
  );

  assert.equal(
    "retrainingDecision" in result,
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
    serialized.includes(
      '"STATISTICALLY_SUFFICIENT"'
    ),
    false
  );

  assert.equal(
    serialized.includes('"DRIFTED"'),
    false
  );

  assert.equal(
    serialized.includes('"HEALTHY"'),
    false
  );
});

test("assessment is deterministic", () => {
  const reference = [
    evaluation(0.2, false),
    evaluation(0.8, true),
  ];

  const recent = [
    evaluation(0.3, false),
    evaluation(0.7, true),
  ];

  const first =
    assess(reference, recent);

  const second =
    assess(reference, recent);

  assert.deepEqual(first, second);
});
