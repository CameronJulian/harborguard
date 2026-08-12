import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeRouteSoftCapShadowEvidence,
} from "../lib/fleet/analyzeRouteSoftCapShadowEvidence.ts";

function shadowMetadata(overrides = {}) {
  return {
    routeSoftCapShadowEvaluation: {
      version: 1,
      productionOverallRiskScore: 80,
      shadowOverallRiskScore: 70,
      predictionPositiveThreshold: 75,
      classificationAgreement: false,
      scoringVersion: "route-soft-cap-v1",
      ...overrides,
    },
  };
}

function evaluation(overrides = {}) {
  return {
    classification: "true_positive",
    metadata: shadowMetadata(),
    outcomeCompletedAt: "2026-08-10T12:00:00.000Z",
    vehicleId: "vehicle-a",
    tripId: "trip-a",
    ...overrides,
  };
}

test("returns an empty descriptive evidence summary for empty input", () => {
  const result = analyzeRouteSoftCapShadowEvidence([]);

  assert.equal(result.totalEvaluationCount, 0);
  assert.equal(result.validShadowEvaluationCount, 0);
  assert.equal(result.shadowEvidenceCoverageRate, null);

  assert.equal(result.uniqueVehicleCount, 0);
  assert.equal(result.largestVehicleEvaluationCount, 0);
  assert.equal(result.largestVehicleShare, null);

  assert.deepEqual(result.byVehicle, []);
  assert.deepEqual(result.byVehicleUtcDay, []);
  assert.deepEqual(result.byVehicleScoringVersion, []);
  assert.deepEqual(result.byUtcDay, []);

  assert.deepEqual(result.scoringVersionDistribution, {
    explicitVersionedEvaluationCount: 0,
    unknownVersionEvaluationCount: 0,
    explicitVersionCoverageRate: null,
    byVersion: [],
  });

  assert.equal(result.oldestEvidenceCompletedAt, null);
  assert.equal(result.newestEvidenceCompletedAt, null);
  assert.equal(result.evidenceSpanDays, null);

  assert.equal(result.classificationAgreementCount, 0);
  assert.equal(result.classificationDisagreementCount, 0);
  assert.equal(result.classificationAgreementRate, null);

  assert.deepEqual(result.scoreDelta, {
    positiveCount: 0,
    zeroCount: 0,
    negativeCount: 0,
    mean: null,
    median: null,
    min: null,
    max: null,
  });
});

test("summarizes one valid explicitly versioned evaluation", () => {
  const result = analyzeRouteSoftCapShadowEvidence([
    evaluation({
      metadata: shadowMetadata({
        scoringVersion: "  route-soft-cap-v1  ",
      }),
    }),
  ]);

  assert.equal(result.totalEvaluationCount, 1);
  assert.equal(result.validShadowEvaluationCount, 1);
  assert.equal(result.shadowEvidenceCoverageRate, 1);

  assert.equal(result.uniqueVehicleCount, 1);
  assert.equal(result.largestVehicleEvaluationCount, 1);
  assert.equal(result.largestVehicleShare, 1);

  assert.deepEqual(result.byVehicle, [
    {
      vehicleId: "vehicle-a",
      evaluationCount: 1,
      share: 1,
    },
  ]);

  assert.deepEqual(result.byVehicleUtcDay, [
    {
      vehicleId: "vehicle-a",
      utcDay: "2026-08-10",
      evaluationCount: 1,
    },
  ]);

  assert.deepEqual(result.byVehicleScoringVersion, [
    {
      vehicleId: "vehicle-a",
      scoringVersion: "route-soft-cap-v1",
      evaluationCount: 1,
    },
  ]);

  assert.deepEqual(result.scoringVersionDistribution, {
    explicitVersionedEvaluationCount: 1,
    unknownVersionEvaluationCount: 0,
    explicitVersionCoverageRate: 1,
    byVersion: [
      {
        scoringVersion: "route-soft-cap-v1",
        evaluationCount: 1,
        share: 1,
      },
    ],
  });

  assert.equal(
    result.oldestEvidenceCompletedAt,
    "2026-08-10T12:00:00.000Z"
  );

  assert.equal(
    result.newestEvidenceCompletedAt,
    "2026-08-10T12:00:00.000Z"
  );

  assert.equal(result.evidenceSpanDays, 0);

  assert.deepEqual(result.byUtcDay, [
    {
      utcDay: "2026-08-10",
      evaluationCount: 1,
    },
  ]);

  assert.equal(result.classificationAgreementCount, 0);
  assert.equal(result.classificationDisagreementCount, 1);
  assert.equal(result.classificationAgreementRate, 0);

  assert.equal(result.positiveStateAgreementCount, 0);
  assert.equal(result.positiveStateChangeCount, 1);

  assert.deepEqual(result.scoreDelta, {
    positiveCount: 1,
    zeroCount: 0,
    negativeCount: 0,
    mean: 10,
    median: 10,
    min: 10,
    max: 10,
  });
});

test("keeps historical unknown-version evidence globally valid", () => {
  const result = analyzeRouteSoftCapShadowEvidence([
    evaluation({
      classification: "true_negative",
      metadata: shadowMetadata({
        productionOverallRiskScore: 30,
        shadowOverallRiskScore: 25,
        predictionPositiveThreshold: 50,
        classificationAgreement: true,
        scoringVersion: "   ",
      }),
      vehicleId: "vehicle-b",
      tripId: "trip-b",
    }),
  ]);

  assert.equal(result.totalEvaluationCount, 1);
  assert.equal(result.validShadowEvaluationCount, 1);

  assert.deepEqual(result.scoringVersionDistribution, {
    explicitVersionedEvaluationCount: 0,
    unknownVersionEvaluationCount: 1,
    explicitVersionCoverageRate: 0,
    byVersion: [],
  });

  assert.deepEqual(result.byVehicleScoringVersion, []);

  assert.deepEqual(result.byVehicle, [
    {
      vehicleId: "vehicle-b",
      evaluationCount: 1,
      share: 1,
    },
  ]);

  assert.equal(result.classificationAgreementCount, 1);
  assert.equal(result.classificationAgreementRate, 1);
});

test("excludes malformed shadow metadata from shadow calculations", () => {
  const result = analyzeRouteSoftCapShadowEvidence([
    evaluation({
      metadata: shadowMetadata({
        shadowOverallRiskScore: 101,
      }),
    }),
  ]);

  assert.equal(result.totalEvaluationCount, 1);
  assert.equal(result.validShadowEvaluationCount, 0);
  assert.equal(result.shadowEvidenceCoverageRate, 0);

  assert.equal(result.classifiedEvaluationCount, 1);
  assert.equal(result.classifiedValidShadowEvaluationCount, 0);

  assert.equal(result.uniqueVehicleCount, 0);
  assert.deepEqual(result.byVehicle, []);
  assert.deepEqual(result.byVehicleUtcDay, []);
  assert.deepEqual(result.byVehicleScoringVersion, []);
  assert.deepEqual(result.byUtcDay, []);

  assert.deepEqual(result.scoringVersionDistribution, {
    explicitVersionedEvaluationCount: 0,
    unknownVersionEvaluationCount: 0,
    explicitVersionCoverageRate: null,
    byVersion: [],
  });

  assert.deepEqual(result.scoreDelta, {
    positiveCount: 0,
    zeroCount: 0,
    negativeCount: 0,
    mean: null,
    median: null,
    min: null,
    max: null,
  });
});

test("aggregates multiple valid evaluations deterministically", () => {
  const result = analyzeRouteSoftCapShadowEvidence([
    evaluation({
      classification: "true_positive",
      metadata: shadowMetadata({
        productionOverallRiskScore: 80,
        shadowOverallRiskScore: 70,
        predictionPositiveThreshold: 75,
        classificationAgreement: false,
        scoringVersion: "route-soft-cap-v1",
      }),
      outcomeCompletedAt: "2026-08-10T12:00:00.000Z",
      vehicleId: "vehicle-a",
      tripId: "trip-a",
    }),
    evaluation({
      classification: "true_negative",
      metadata: shadowMetadata({
        productionOverallRiskScore: 30,
        shadowOverallRiskScore: 34,
        predictionPositiveThreshold: 50,
        classificationAgreement: true,
        scoringVersion: "route-soft-cap-v2",
      }),
      outcomeCompletedAt: "2026-08-11T18:30:00.000Z",
      vehicleId: "vehicle-b",
      tripId: "trip-b",
    }),
  ]);

  assert.equal(result.totalEvaluationCount, 2);
  assert.equal(result.validShadowEvaluationCount, 2);
  assert.equal(result.shadowEvidenceCoverageRate, 1);

  assert.equal(result.uniqueVehicleCount, 2);
  assert.equal(result.largestVehicleEvaluationCount, 1);
  assert.equal(result.largestVehicleShare, 0.5);

  assert.deepEqual(result.byVehicle, [
    {
      vehicleId: "vehicle-a",
      evaluationCount: 1,
      share: 0.5,
    },
    {
      vehicleId: "vehicle-b",
      evaluationCount: 1,
      share: 0.5,
    },
  ]);

  assert.deepEqual(result.byVehicleUtcDay, [
    {
      vehicleId: "vehicle-a",
      utcDay: "2026-08-10",
      evaluationCount: 1,
    },
    {
      vehicleId: "vehicle-b",
      utcDay: "2026-08-11",
      evaluationCount: 1,
    },
  ]);

  assert.deepEqual(result.byUtcDay, [
    {
      utcDay: "2026-08-10",
      evaluationCount: 1,
    },
    {
      utcDay: "2026-08-11",
      evaluationCount: 1,
    },
  ]);

  assert.deepEqual(result.byVehicleScoringVersion, [
    {
      vehicleId: "vehicle-a",
      scoringVersion: "route-soft-cap-v1",
      evaluationCount: 1,
    },
    {
      vehicleId: "vehicle-b",
      scoringVersion: "route-soft-cap-v2",
      evaluationCount: 1,
    },
  ]);

  assert.equal(result.classificationAgreementCount, 1);
  assert.equal(result.classificationDisagreementCount, 1);
  assert.equal(result.classificationAgreementRate, 0.5);

  assert.equal(result.positiveStateAgreementCount, 1);
  assert.equal(result.positiveStateChangeCount, 1);

  assert.deepEqual(result.scoreDelta, {
    positiveCount: 1,
    zeroCount: 0,
    negativeCount: 1,
    mean: 3,
    median: 3,
    min: -4,
    max: 10,
  });

  assert.equal(
    result.oldestEvidenceCompletedAt,
    "2026-08-10T12:00:00.000Z"
  );

  assert.equal(
    result.newestEvidenceCompletedAt,
    "2026-08-11T18:30:00.000Z"
  );

  assert.equal(
    result.evidenceSpanDays,
    1.2708333333333333
  );

  assert.deepEqual(result.scoringVersionDistribution, {
    explicitVersionedEvaluationCount: 2,
    unknownVersionEvaluationCount: 0,
    explicitVersionCoverageRate: 1,
    byVersion: [
      {
        scoringVersion: "route-soft-cap-v1",
        evaluationCount: 1,
        share: 0.5,
      },
      {
        scoringVersion: "route-soft-cap-v2",
        evaluationCount: 1,
        share: 0.5,
      },
    ],
  });

  const truePositive =
    result.byProductionClassification.find(
      (entry) =>
        entry.classification === "true_positive"
    );

  const trueNegative =
    result.byProductionClassification.find(
      (entry) =>
        entry.classification === "true_negative"
    );

  assert.ok(truePositive);
  assert.ok(trueNegative);

  assert.equal(
    truePositive.eligibleEvaluationCount,
    1
  );

  assert.equal(
    truePositive.validShadowEvaluationCount,
    1
  );

  assert.equal(
    truePositive.classificationAgreementCount,
    0
  );

  assert.equal(
    truePositive.scoreDelta.median,
    10
  );

  assert.equal(
    trueNegative.eligibleEvaluationCount,
    1
  );

  assert.equal(
    trueNegative.validShadowEvaluationCount,
    1
  );

  assert.equal(
    trueNegative.classificationAgreementCount,
    1
  );

  assert.equal(
    trueNegative.scoreDelta.median,
    -4
  );
});
