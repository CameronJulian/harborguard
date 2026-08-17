import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

import {
  assessRouteRiskModelPromotionReadiness,
  ROUTE_RISK_MODEL_PROMOTION_READINESS_ASSESSMENT_VERSION,
} from "../lib/fleet/assessRouteRiskModelPromotionReadiness.ts";

function shadowEvidence(overrides = {}) {
  return {
    totalEvaluationCount: 120,
    validShadowEvaluationCount: 100,
    shadowEvidenceCoverageRate: 100 / 120,
    uniqueVehicleCount: 20,
    largestVehicleEvaluationCount: 8,
    largestVehicleShare: 0.08,
    byVehicle: [],
    byVehicleUtcDay: [],
    byVehicleScoringVersion: [],
    scoringVersionDistribution: {
      explicitVersionedEvaluationCount: 100,
      unknownVersionEvaluationCount: 0,
      explicitVersionCoverageRate: 1,
      byVersion: [],
    },
    oldestEvidenceCompletedAt:
      "2026-07-01T00:00:00.000Z",
    newestEvidenceCompletedAt:
      "2026-07-31T00:00:00.000Z",
    evidenceSpanDays: 30,
    byUtcDay: [],
    classifiedEvaluationCount: 120,
    classifiedValidShadowEvaluationCount: 100,
    classificationAgreementCount: 90,
    classificationDisagreementCount: 10,
    classificationAgreementRate: 0.9,
    positiveStateAgreementCount: 92,
    positiveStateChangeCount: 8,
    scoreDelta: {
      positiveCount: 40,
      zeroCount: 20,
      negativeCount: 40,
      mean: 0,
      median: 0,
      min: -10,
      max: 10,
    },
    byProductionClassification: [],
    ...overrides,
  };
}

function modelHealthEvidence(overrides = {}) {
  return {
    assessmentVersion:
      "harborguard-route-risk-shadow-model-health-evidence-v1",
    state:
      "DESCRIPTIVE_EVIDENCE_AVAILABLE",
    statisticalSufficiency:
      "NOT_ESTABLISHED",
    semantics:
      "STRUCTURAL_EVIDENCE_ONLY_NO_STATISTICAL_THRESHOLD",
    reasonCodes: [
      "STATISTICAL_SUFFICIENCY_NOT_ESTABLISHED",
      "POPULATION_REPRESENTATIVENESS_NOT_ESTABLISHED",
      "CROWD_INTELLIGENCE_SCALE_NOT_ESTABLISHED",
      "DRIFT_THRESHOLD_NOT_ESTABLISHED",
    ],
    windows: {
      reference: {
        totalInputCount: 50,
        validEvaluationCount: 50,
        excludedEvaluationCount: 0,
        hasAnyInputEvidence: true,
        hasValidDescriptiveEvidence: true,
        containsExcludedEvidence: false,
      },
      recent: {
        totalInputCount: 50,
        validEvaluationCount: 50,
        excludedEvaluationCount: 0,
        hasAnyInputEvidence: true,
        hasValidDescriptiveEvidence: true,
        containsExcludedEvidence: false,
      },
    },
    unavailableEvidence: [
      "STATISTICAL_SAMPLE_SIZE_POLICY",
      "POPULATION_REPRESENTATIVENESS",
      "GEOGRAPHIC_REPRESENTATIVENESS",
      "TEMPORAL_REPRESENTATIVENESS",
      "CROWD_INTELLIGENCE_SCALE",
      "CALIBRATION_SIGNIFICANCE",
      "DRIFT_THRESHOLD",
    ],
    ...overrides,
  };
}

const policy = {
  policyVersion:
    "test-promotion-evidence-policy-v1",

  minimumValidShadowEvaluations:
    100,

  minimumUniqueVehicles:
    20,

  minimumEvidenceSpanDays:
    30,

  minimumShadowEvidenceCoverageRate:
    0.8,

  minimumExplicitVersionCoverageRate:
    0.95,

  maximumLargestVehicleShare:
    0.1,
};

test("promotion readiness is deterministic and explicitly versioned", () => {
  const input = {
    shadowEvidence: shadowEvidence(),
    modelHealthEvidence: modelHealthEvidence(),
    policy,
  };

  const first =
    assessRouteRiskModelPromotionReadiness(input);

  const second =
    assessRouteRiskModelPromotionReadiness(input);

  assert.deepEqual(first, second);

  assert.equal(
    first.assessmentVersion,
    ROUTE_RISK_MODEL_PROMOTION_READINESS_ASSESSMENT_VERSION
  );

  assert.equal(
    first.policyVersion,
    policy.policyVersion
  );

  assert.equal(
    first.semantics,
    "HUMAN_REVIEW_INPUT_ONLY_NO_ACTIVATION_AUTHORITY"
  );
});

test("promotion readiness reports human-review readiness when every explicit evidence check passes", () => {
  const result =
    assessRouteRiskModelPromotionReadiness({
      shadowEvidence: shadowEvidence(),
      modelHealthEvidence: modelHealthEvidence(),
      policy,
    });

  assert.equal(
    result.state,
    "READY_FOR_HUMAN_REVIEW"
  );

  assert.deepEqual(
    result.reasonCodes,
    []
  );

  for (
    const check of
    Object.values(result.checks)
  ) {
    assert.equal(
      check.satisfied,
      true
    );
  }
});

test("promotion readiness fails closed when descriptive evidence policy checks are not met", () => {
  const result =
    assessRouteRiskModelPromotionReadiness({
      shadowEvidence:
        shadowEvidence({
          validShadowEvaluationCount: 20,
          uniqueVehicleCount: 2,
          evidenceSpanDays: 4,
          shadowEvidenceCoverageRate: 0.4,
          largestVehicleShare: 0.7,
          scoringVersionDistribution: {
            explicitVersionedEvaluationCount: 5,
            unknownVersionEvaluationCount: 15,
            explicitVersionCoverageRate: 0.25,
            byVersion: [],
          },
        }),

      modelHealthEvidence:
        modelHealthEvidence({
          state:
            "LIMITED_EVIDENCE",
        }),

      policy,
    });

  assert.equal(
    result.state,
    "INSUFFICIENT_EVIDENCE"
  );

  assert.deepEqual(
    result.reasonCodes,
    [
      "MINIMUM_VALID_SHADOW_EVALUATIONS_NOT_MET",
      "MINIMUM_UNIQUE_VEHICLES_NOT_MET",
      "MINIMUM_EVIDENCE_SPAN_NOT_MET",
      "MINIMUM_SHADOW_EVIDENCE_COVERAGE_NOT_MET",
      "MINIMUM_EXPLICIT_VERSION_COVERAGE_NOT_MET",
      "MAXIMUM_VEHICLE_CONCENTRATION_EXCEEDED",
      "MODEL_HEALTH_DESCRIPTIVE_EVIDENCE_NOT_AVAILABLE",
    ]
  );
});

test("promotion readiness preserves unresolved statistical evidence rather than claiming statistical sufficiency", () => {
  const health =
    modelHealthEvidence();

  const result =
    assessRouteRiskModelPromotionReadiness({
      shadowEvidence: shadowEvidence(),
      modelHealthEvidence: health,
      policy,
    });

  assert.equal(
    result.unresolvedStatisticalEvidence
      .statisticalSufficiency,
    "NOT_ESTABLISHED"
  );

  assert.deepEqual(
    result.unresolvedStatisticalEvidence
      .unavailableEvidence,
    health.unavailableEvidence
  );

  assert.notStrictEqual(
    result.unresolvedStatisticalEvidence
      .unavailableEvidence,
    health.unavailableEvidence
  );
});

test("promotion readiness requires an explicit policy and validates policy values", () => {
  assert.throws(
    () =>
      assessRouteRiskModelPromotionReadiness({
        shadowEvidence: shadowEvidence(),
        modelHealthEvidence:
          modelHealthEvidence(),
        policy: {
          ...policy,
          policyVersion:
            "   ",
        },
      }),
    /policy\.policyVersion is required/
  );

  assert.throws(
    () =>
      assessRouteRiskModelPromotionReadiness({
        shadowEvidence: shadowEvidence(),
        modelHealthEvidence:
          modelHealthEvidence(),
        policy: {
          ...policy,
          minimumValidShadowEvaluations:
            -1,
        },
      }),
    /must be a non-negative integer/
  );

  assert.throws(
    () =>
      assessRouteRiskModelPromotionReadiness({
        shadowEvidence: shadowEvidence(),
        modelHealthEvidence:
          modelHealthEvidence(),
        policy: {
          ...policy,
          minimumShadowEvidenceCoverageRate:
            1.5,
        },
      }),
    /must be a finite rate between 0 and 1/
  );

  assert.throws(
    () =>
      assessRouteRiskModelPromotionReadiness({
        shadowEvidence: shadowEvidence(),
        modelHealthEvidence:
          modelHealthEvidence(),
        policy: {
          ...policy,
          maximumLargestVehicleShare:
            -0.1,
        },
      }),
    /must be a finite rate between 0 and 1/
  );
});

test("promotion readiness records observed and required evidence without mutating inputs", () => {
  const shadow =
    shadowEvidence();

  const health =
    modelHealthEvidence();

  const policyInput = {
    ...policy,
  };

  const beforeShadow =
    structuredClone(shadow);

  const beforeHealth =
    structuredClone(health);

  const beforePolicy =
    structuredClone(policyInput);

  const result =
    assessRouteRiskModelPromotionReadiness({
      shadowEvidence: shadow,
      modelHealthEvidence: health,
      policy: policyInput,
    });

  assert.deepEqual(
    result.checks.validShadowEvaluations,
    {
      observed: 100,
      requiredMinimum: 100,
      satisfied: true,
    }
  );

  assert.deepEqual(
    result.checks.uniqueVehicles,
    {
      observed: 20,
      requiredMinimum: 20,
      satisfied: true,
    }
  );

  assert.deepEqual(
    result.checks.evidenceSpanDays,
    {
      observed: 30,
      requiredMinimum: 30,
      satisfied: true,
    }
  );

  assert.deepEqual(
    shadow,
    beforeShadow
  );

  assert.deepEqual(
    health,
    beforeHealth
  );

  assert.deepEqual(
    policyInput,
    beforePolicy
  );
});

test("promotion readiness creates no lifecycle activation threshold-selection or Route Safety authority", () => {
  const source =
    fs.readFileSync(
      new URL(
        "../lib/fleet/assessRouteRiskModelPromotionReadiness.ts",
        import.meta.url
      ),
      "utf8"
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

  assert.doesNotMatch(
    source,
    /activated_at|retired_at|shadow_started_at/
  );

  assert.doesNotMatch(
    source,
    /activationDecision|retrainingDecision|rolloutReady/
  );

  assert.doesNotMatch(
    source,
    /analyzeRoutePredictionThresholds/
  );

  assert.match(
    source,
    /does NOT:[\s\S]*select or invent policy thresholds/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*establish statistical significance/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*approve a model/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*activate or retire a model/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*select a production decision threshold/i
  );

  assert.match(
    source,
    /does NOT:[\s\S]*modify production Route Safety behavior/i
  );
});
