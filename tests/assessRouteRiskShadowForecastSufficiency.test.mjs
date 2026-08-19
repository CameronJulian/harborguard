import assert from "node:assert/strict";
import test from "node:test";

import {
  assessRouteRiskShadowForecastSufficiency,
} from "../lib/fleet/assessRouteRiskShadowForecastSufficiency.ts";

function evidenceAssessment(state = "UNKNOWN") {
  return {
    assessmentVersion:
      "harborguard-route-risk-shadow-evidence-assessment-v1",
    state,
    probabilitySemantics:
      "UNCALIBRATED_LOGISTIC_MODEL_OUTPUT",
    reasonCodes: [
      "CALIBRATION_NOT_ESTABLISHED",
      "REPRESENTATIVENESS_NOT_ESTABLISHED",
    ],
    provenance: {
      trainingRunId: "training-1",
      runVersion: "run-1",
      datasetFingerprint: "a".repeat(64),
      trainingRunCreatedAt: "2026-08-19T00:00:00.000Z",
      manifestVersion: "manifest-v1",
      splitVersion: "split-v1",
      datasetGeneratedAt: "2026-08-19T00:00:00.000Z",
    },
    evidence: {
      trainingExamples: {
        total: 100,
        positive: 50,
        negative: 50,
      },
      datasetSplitExamples: {
        total: 100,
        train: 70,
        validation: 15,
        test: 15,
      },
      evaluationExamples: {
        validation: 15,
        test: 15,
      },
      datasetWindow: {
        startOutcomeCompletedAt: "2026-08-01T00:00:00.000Z",
        endOutcomeCompletedAt: "2026-08-19T00:00:00.000Z",
      },
      predictionFeatureContract: {
        featureSchemaVersion: "feature-v1",
        featureOrder: [
          "overallRiskScore",
          "threatRiskScore",
          "weatherRiskScore",
          "trafficRiskScore",
        ],
        valuesPersistedInShadowPredictionColumns: true,
      },
    },
    unavailableEvidence: [
      "CALIBRATION",
      "FEATURE_RANGE_FAMILIARITY",
      "GEOGRAPHIC_COVERAGE",
      "CROWD_INTELLIGENCE",
      "TEMPORAL_FRESHNESS_POLICY",
    ],
  };
}

function routeScope() {
  return {
    scopeVersion:
      "harborguard-route-risk-shadow-route-evidence-scope-v1",
    scopeSource: "provider_geometry",
    unavailableReason: null,
    predictionCreatedAt: "2026-08-19T00:00:00.000Z",
    identityContract: {},
    routePoints: [
      {
        index: 0,
        latitude: -33.9,
        longitude: 18.4,
        segmentKey: "a",
      },
      {
        index: 1,
        latitude: -33.91,
        longitude: 18.41,
        segmentKey: "b",
      },
    ],
    routeSegments: [
      {
        index: 0,
        fromPointIndex: 0,
        toPointIndex: 1,
        segmentKey: "b",
        directionBucket: null,
      },
    ],
  };
}

test(
  "valid structural evidence remains unvalidated without real-world evidence",
  () => {
    const result =
      assessRouteRiskShadowForecastSufficiency({
        evidenceAssessment: evidenceAssessment(),
        routeEvidenceScope: routeScope(),
      });

    assert.equal(result.state, "UNVALIDATED");
    assert.equal(result.authority, "NON_AUTHORITATIVE");
    assert.equal(result.usableForProductionDecision, false);
    assert.equal(result.requiredEvidence.calibration, false);
    assert.equal(result.requiredEvidence.representativeness, false);
    assert.equal(result.requiredEvidence.crowdIntelligence, false);
  }
);

test(
  "structurally insufficient model evidence remains insufficient",
  () => {
    const result =
      assessRouteRiskShadowForecastSufficiency({
        evidenceAssessment:
          evidenceAssessment("INSUFFICIENT_EVIDENCE"),
        routeEvidenceScope: routeScope(),
      });

    assert.equal(result.state, "INSUFFICIENT_EVIDENCE");
    assert.equal(result.usableForProductionDecision, false);
  }
);

test(
  "unavailable route scope fails closed",
  () => {
    const scope = routeScope();

    scope.scopeSource = "unavailable";
    scope.unavailableReason = "insufficient_route_points";
    scope.routePoints = [];
    scope.routeSegments = [];

    const result =
      assessRouteRiskShadowForecastSufficiency({
        evidenceAssessment: evidenceAssessment(),
        routeEvidenceScope: scope,
      });

    assert.equal(result.state, "INSUFFICIENT_EVIDENCE");
    assert.equal(
      result.requiredEvidence.validRouteEvidenceScope,
      false
    );

    assert.ok(
      result.reasonCodes.includes(
        "ROUTE_EVIDENCE_SCOPE_INSUFFICIENT"
      )
    );
  }
);

test(
  "assessment never exposes fake confidence or uncertainty values",
  () => {
    const result =
      assessRouteRiskShadowForecastSufficiency({
        evidenceAssessment: evidenceAssessment(),
        routeEvidenceScope: routeScope(),
      });

    assert.equal("confidence" in result, false);
    assert.equal("confidenceScore" in result, false);
    assert.equal("uncertainty" in result, false);
    assert.equal("uncertaintyPenalty" in result, false);
  }
);
