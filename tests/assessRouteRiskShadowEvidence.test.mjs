import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  assessRouteRiskShadowEvidence,
  ROUTE_RISK_SHADOW_EVIDENCE_ASSESSMENT_VERSION,
} from "../lib/fleet/assessRouteRiskShadowEvidence.ts";

function artifact(overrides = {}) {
  return {
    registryId: "registry-a",
    organizationId: "organization-a",
    trainingRunId: "training-run-a",
    shadowStartedAt: "2026-08-16T12:00:00.000Z",
    runVersion: "training-run-v1",
    datasetFingerprint: "a".repeat(64),
    trainingRunCreatedAt: "2026-08-16T10:00:00.000Z",
    model: {
      algorithmVersion: "harborguard-route-risk-logistic-v1",
      trainingContractVersion: "route-risk-training-v1",
      featureSchemaVersion: "route-risk-features-v1",
      labelSchemaVersion: "route-risk-label-v1",
      featureOrder: [
        "overallRiskScore",
        "threatRiskScore",
        "weatherRiskScore",
        "trafficRiskScore",
      ],
      normalization: {
        divideBy: 100,
      },
      intercept: 0,
      coefficients: {
        overallRiskScore: 0.1,
        threatRiskScore: 0.2,
        weatherRiskScore: 0.3,
        trafficRiskScore: 0.4,
      },
      training: {
        exampleCount: 12,
        positiveCount: 5,
        negativeCount: 7,
        epochs: 1000,
        learningRate: 0.1,
        finalLoss: 0.5,
      },
    },
    evidence: {
      datasetManifest: {
        manifestVersion: "dataset-manifest-v1",
        splitVersion: "dataset-split-v1",
        generatedAt: "2026-08-16T09:00:00.000Z",
        window: {
          startOutcomeCompletedAt: "2026-07-01T00:00:00.000Z",
          endOutcomeCompletedAt: "2026-07-31T23:59:59.000Z",
        },
        counts: {
          total: 20,
          train: 12,
          validation: 4,
          test: 4,
        },
      },
      validationExampleCount: 4,
      testExampleCount: 4,
    },
    ...overrides,
  };
}

const features = {
  overallRiskScore: 62,
  threatRiskScore: 51,
  weatherRiskScore: 27,
  trafficRiskScore: 44,
};

test("assessment is deterministic, versioned, and descriptive only", () => {
  const input = {
    artifact: artifact(),
    features,
  };

  const first =
    assessRouteRiskShadowEvidence(input);
  const second =
    assessRouteRiskShadowEvidence(input);

  assert.deepEqual(first, second);
  assert.equal(
    first.assessmentVersion,
    ROUTE_RISK_SHADOW_EVIDENCE_ASSESSMENT_VERSION
  );
  assert.equal(first.state, "UNKNOWN");
  assert.equal(
    first.probabilitySemantics,
    "UNCALIBRATED_LOGISTIC_MODEL_OUTPUT"
  );
  assert.equal("confidence" in first, false);
  assert.equal("confidenceScore" in first, false);
});

test("represents persisted training, manifest, and evaluation counts exactly", () => {
  const result =
    assessRouteRiskShadowEvidence({
      artifact: artifact(),
      features,
    });

  assert.deepEqual(
    result.evidence.trainingExamples,
    {
      total: 12,
      positive: 5,
      negative: 7,
    }
  );

  assert.deepEqual(
    result.evidence.datasetSplitExamples,
    {
      total: 20,
      train: 12,
      validation: 4,
      test: 4,
    }
  );

  assert.deepEqual(
    result.evidence.evaluationExamples,
    {
      validation: 4,
      test: 4,
    }
  );
});

test("missing persisted evidence degrades to insufficient evidence", () => {
  const incompleteArtifact =
    artifact({
      evidence: {
        datasetManifest: null,
        validationExampleCount: null,
        testExampleCount: null,
      },
    });

  const result =
    assessRouteRiskShadowEvidence({
      artifact: incompleteArtifact,
      features,
    });

  assert.equal(
    result.state,
    "INSUFFICIENT_EVIDENCE"
  );
  assert.equal(
    result.provenance.manifestVersion,
    null
  );
  assert.deepEqual(
    result.evidence.evaluationExamples,
    {
      validation: null,
      test: null,
    }
  );
  assert.ok(
    result.reasonCodes.includes(
      "DATASET_MANIFEST_UNAVAILABLE"
    )
  );
});

test("assessment leaves features, artifact, and model output unchanged", () => {
  const inputArtifact = artifact();
  const inputFeatures = { ...features };
  const prediction = {
    predictedProbability: 0.82,
  };
  const beforeArtifact =
    structuredClone(inputArtifact);
  const beforeFeatures =
    structuredClone(inputFeatures);
  const beforePrediction =
    structuredClone(prediction);

  assessRouteRiskShadowEvidence({
    artifact: inputArtifact,
    features: inputFeatures,
  });

  assert.deepEqual(inputArtifact, beforeArtifact);
  assert.deepEqual(inputFeatures, beforeFeatures);
  assert.deepEqual(prediction, beforePrediction);
});

test("route persists the versioned assessment as metadata without changing prediction persistence", () => {
  const route = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );
  const persistence = fs.readFileSync(
    "lib/fleet/persistRouteRiskShadowPrediction.ts",
    "utf8"
  );
  const reader = fs.readFileSync(
    "lib/fleet/readRouteRiskShadowModelArtifact.ts",
    "utf8"
  );

  const assessmentIndex = route.indexOf(
    "assessRouteRiskShadowEvidence({"
  );
  const persistenceIndex = route.indexOf(
    "await persistRouteRiskShadowPrediction({"
  );

  assert.ok(assessmentIndex >= 0);
  assert.ok(persistenceIndex > assessmentIndex);
  assert.match(
    route,
    /metadata:\s*\{\s*evidenceSufficiency,/
  );
  assert.match(
    persistence,
    /predicted_probability:\s*predictedProbability/
  );
  assert.match(
    persistence,
    /metadata:\s*normalizedMetadata/
  );
  assert.doesNotMatch(
    persistence,
    /assessRouteRiskShadowEvidence/
  );
  assert.match(
    reader,
    /manifest, model, validation_evaluation, test_evaluation/
  );
  assert.match(
    reader,
    /readModelEvidence\(\s*trainingRun\.manifest,\s*trainingRun\.validation_evaluation,\s*trainingRun\.test_evaluation\s*\)/
  );
});
