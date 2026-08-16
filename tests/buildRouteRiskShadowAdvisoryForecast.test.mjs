import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  assessRouteRiskShadowEvidence,
} from "../lib/fleet/assessRouteRiskShadowEvidence.ts";

import {
  buildRouteRiskShadowAdvisoryForecast,
  ROUTE_RISK_SHADOW_ADVISORY_FORECAST_VERSION,
} from "../lib/fleet/buildRouteRiskShadowAdvisoryForecast.ts";

import {
  buildRouteRiskShadowRouteEvidenceScope,
} from "../lib/fleet/buildRouteRiskShadowRouteEvidenceScope.ts";

function artifact(overrides = {}) {
  return {
    registryId: "registry-a",
    organizationId: "organization-a",
    trainingRunId: "training-run-a",
    shadowStartedAt:
      "2026-08-16T12:00:00.000Z",
    runVersion: "training-run-v1",
    datasetFingerprint:
      "a".repeat(64),
    trainingRunCreatedAt:
      "2026-08-16T10:00:00.000Z",
    model: {
      algorithmVersion:
        "harborguard-route-risk-logistic-v1",
      trainingContractVersion:
        "route-risk-training-v1",
      featureSchemaVersion:
        "route-risk-features-v1",
      labelSchemaVersion:
        "route-adverse-event-v1",
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
        manifestVersion:
          "dataset-manifest-v1",
        splitVersion:
          "dataset-split-v1",
        generatedAt:
          "2026-08-16T09:00:00.000Z",
        window: {
          startOutcomeCompletedAt:
            "2026-07-01T00:00:00.000Z",
          endOutcomeCompletedAt:
            "2026-07-31T23:59:59.000Z",
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

function canonicalInputs({
  artifactOverride = {},
  routePoints = [
    [-33.9, 18.4],
    [-33.89, 18.41],
  ],
  predictionCreatedAt =
    "2026-08-16T12:00:00+02:00",
} = {}) {
  const modelArtifact =
    artifact(artifactOverride);

  return {
    artifact: modelArtifact,
    prediction: {
      predictedProbability: 0.82,
    },
    evidenceAssessment:
      assessRouteRiskShadowEvidence({
        artifact: modelArtifact,
        features,
      }),
    routeEvidenceScope:
      buildRouteRiskShadowRouteEvidenceScope({
        routePoints,
        scopeSource:
          "provider_geometry",
        predictionCreatedAt,
      }),
  };
}

test("builds a deterministic explicitly versioned single-route advisory contract", () => {
  const input = canonicalInputs();

  const first =
    buildRouteRiskShadowAdvisoryForecast(input);
  const second =
    buildRouteRiskShadowAdvisoryForecast(input);

  assert.deepEqual(first, second);
  assert.equal(
    first.forecastVersion,
    ROUTE_RISK_SHADOW_ADVISORY_FORECAST_VERSION
  );
  assert.equal(
    first.forecastMode,
    "SINGLE_ROUTE_SHADOW_ADVISORY"
  );
  assert.equal(
    first.authority,
    "NON_AUTHORITATIVE"
  );
});

test("preserves canonical route scope and prediction timestamp without recomputing them", () => {
  const input = canonicalInputs();

  const result =
    buildRouteRiskShadowAdvisoryForecast(input);

  assert.deepEqual(
    result.routeEvidenceScope,
    input.routeEvidenceScope
  );
  assert.notStrictEqual(
    result.routeEvidenceScope,
    input.routeEvidenceScope
  );
  assert.equal(
    result.predictionCreatedAt,
    input.routeEvidenceScope.predictionCreatedAt
  );
});

test("preserves exact model provenance and raw uncalibrated output", () => {
  const input = canonicalInputs();

  const result =
    buildRouteRiskShadowAdvisoryForecast(input);

  assert.deepEqual(
    result.modelProvenance,
    {
      organizationId: "organization-a",
      modelRegistryId: "registry-a",
      trainingRunId: "training-run-a",
      runVersion: "training-run-v1",
      datasetFingerprint:
        "a".repeat(64),
      algorithmVersion:
        "harborguard-route-risk-logistic-v1",
      trainingContractVersion:
        "route-risk-training-v1",
      featureSchemaVersion:
        "route-risk-features-v1",
      labelSchemaVersion:
        "route-adverse-event-v1",
    }
  );
  assert.deepEqual(
    result.rawModelOutput,
    {
      semantics:
        "UNCALIBRATED_LOGISTIC_MODEL_OUTPUT",
      predictedProbability: 0.82,
    }
  );
});

test("retains descriptive evidence metadata without creating confidence or readiness", () => {
  const input = canonicalInputs();

  const result =
    buildRouteRiskShadowAdvisoryForecast(input);

  assert.deepEqual(
    result.evidenceAssessment,
    input.evidenceAssessment
  );
  assert.notStrictEqual(
    result.evidenceAssessment,
    input.evidenceAssessment
  );
  assert.equal(
    result.evidenceAssessment.state,
    "UNKNOWN"
  );
  assert.equal(
    "confidence" in result,
    false
  );
  assert.equal(
    "readiness" in result,
    false
  );
});

test("preserves canonical unavailable optional evidence deterministically", () => {
  const input = canonicalInputs({
    artifactOverride: {
      evidence: {
        datasetManifest: null,
        validationExampleCount: null,
        testExampleCount: null,
      },
    },
    routePoints: [],
  });

  const result =
    buildRouteRiskShadowAdvisoryForecast(input);

  assert.equal(
    result.routeEvidenceScope.scopeSource,
    "unavailable"
  );
  assert.equal(
    result.routeEvidenceScope.unavailableReason,
    "insufficient_route_points"
  );
  assert.equal(
    result.evidenceAssessment.state,
    "INSUFFICIENT_EVIDENCE"
  );
});

test("rejects an invalid required raw model output without mutating inputs", () => {
  const input = canonicalInputs();
  const before = structuredClone(input);

  assert.throws(
    () =>
      buildRouteRiskShadowAdvisoryForecast({
        ...input,
        prediction: {
          predictedProbability: Number.NaN,
        },
      }),
    /expected a probability between 0 and 1/
  );

  assert.deepEqual(input, before);
});

test("keeps the builder pure while persistence remains inside the isolated shadow path", () => {
  const helper = fs.readFileSync(
    "lib/fleet/buildRouteRiskShadowAdvisoryForecast.ts",
    "utf8"
  );
  const productionRoute = fs.readFileSync(
    "app/api/route-safety/predict/route.ts",
    "utf8"
  );

  for (const forbidden of [
    ".from(",
    ".rpc(",
    "fetch(",
    "NextResponse",
    "rankRoutes",
    "calculateHereRoutes",
    "persistRouteRiskShadowPrediction",
  ]) {
    assert.equal(
      helper.includes(forbidden),
      false
    );
  }

  assert.equal(
    productionRoute.includes(
      "buildRouteRiskShadowAdvisoryForecast"
    ),
    true
  );

  const scopeIndex =
    productionRoute.indexOf(
      "buildRouteRiskShadowRouteEvidenceScope({"
    );
  const forecastIndex =
    productionRoute.indexOf(
      "buildRouteRiskShadowAdvisoryForecast({"
    );
  const persistenceIndex =
    productionRoute.indexOf(
      "await persistRouteRiskShadowPrediction({"
    );
  const shadowCatchIndex =
    productionRoute.indexOf(
      "} catch (shadowInferenceError)",
      persistenceIndex
    );

  assert.ok(scopeIndex >= 0);
  assert.ok(forecastIndex > scopeIndex);
  assert.ok(persistenceIndex > forecastIndex);
  assert.ok(shadowCatchIndex > persistenceIndex);
  assert.match(
    productionRoute,
    /buildRouteRiskShadowAdvisoryForecast\(\{\s*artifact,\s*prediction,\s*evidenceAssessment:\s*evidenceSufficiency,\s*routeEvidenceScope,\s*\}\)/
  );
  assert.match(
    productionRoute,
    /metadata:\s*\{\s*evidenceSufficiency,\s*routeEvidenceScope,\s*candidateRouteIdentity,\s*advisoryRouteForecast,\s*travelCostProvenance,\s*\}/
  );

  const responseIndex =
    productionRoute.indexOf(
      "return NextResponse.json({",
      persistenceIndex
    );

  assert.ok(responseIndex > persistenceIndex);
  assert.doesNotMatch(
    productionRoute.slice(responseIndex),
    /advisoryRouteForecast/
  );

  const result =
    buildRouteRiskShadowAdvisoryForecast(
      canonicalInputs()
    );

  for (const forbiddenField of [
    "operationalRiskScore",
    "uncertaintyPenalty",
    "rank",
    "selectedRoute",
    "recommendedRoute",
  ]) {
    assert.equal(
      forbiddenField in result,
      false
    );
  }
});
