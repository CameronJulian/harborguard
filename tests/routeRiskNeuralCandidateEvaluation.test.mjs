import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  ROUTE_RISK_FEATURE_SCHEMA_VERSION,
  ROUTE_RISK_LABEL_SCHEMA_VERSION,
  ROUTE_RISK_TRAINING_CONTRACT_VERSION,
} from "../lib/fleet/buildRouteRiskTrainingExample.ts";

import {
  ROUTE_RISK_NEURAL_CANDIDATE_VERSION,
  trainRouteRiskNeuralCandidate,
} from "../lib/fleet/trainRouteRiskNeuralCandidate.ts";

import {
  ROUTE_RISK_NEURAL_EVALUATION_VERSION,
  evaluateRouteRiskNeuralCandidate,
} from "../lib/fleet/evaluateRouteRiskNeuralCandidate.ts";

function example({
  tripId,
  overallRiskScore,
  threatRiskScore,
  weatherRiskScore,
  trafficRiskScore,
  observedAdverseEvent,
}) {
  return {
    contractVersion:
      ROUTE_RISK_TRAINING_CONTRACT_VERSION,

    featureSchemaVersion:
      ROUTE_RISK_FEATURE_SCHEMA_VERSION,

    labelSchemaVersion:
      ROUTE_RISK_LABEL_SCHEMA_VERSION,

    provenance: {
      organizationId:
        "organization-1",

      vehicleId:
        "vehicle-1",

      tripId,

      snapshotId:
        `${tripId}-snapshot`,

      outcomeId:
        `${tripId}-outcome`,

      predictionCreatedAt:
        "2026-08-01T10:00:00.000Z",

      outcomeCompletedAt:
        "2026-08-01T11:00:00.000Z",
    },

    features: {
      overallRiskScore,
      threatRiskScore,
      weatherRiskScore,
      trafficRiskScore,
    },

    label: {
      observedAdverseEvent,
    },
  };
}

const trainingExamples = [
  example({
    tripId: "train-low-1",
    overallRiskScore: 5,
    threatRiskScore: 8,
    weatherRiskScore: 6,
    trafficRiskScore: 10,
    observedAdverseEvent: false,
  }),

  example({
    tripId: "train-low-2",
    overallRiskScore: 15,
    threatRiskScore: 12,
    weatherRiskScore: 10,
    trafficRiskScore: 18,
    observedAdverseEvent: false,
  }),

  example({
    tripId: "train-low-3",
    overallRiskScore: 20,
    threatRiskScore: 18,
    weatherRiskScore: 15,
    trafficRiskScore: 20,
    observedAdverseEvent: false,
  }),

  example({
    tripId: "train-high-1",
    overallRiskScore: 80,
    threatRiskScore: 82,
    weatherRiskScore: 75,
    trafficRiskScore: 78,
    observedAdverseEvent: true,
  }),

  example({
    tripId: "train-high-2",
    overallRiskScore: 90,
    threatRiskScore: 88,
    weatherRiskScore: 85,
    trafficRiskScore: 92,
    observedAdverseEvent: true,
  }),

  example({
    tripId: "train-high-3",
    overallRiskScore: 95,
    threatRiskScore: 92,
    weatherRiskScore: 90,
    trafficRiskScore: 96,
    observedAdverseEvent: true,
  }),
];

const evaluationExamples = [
  example({
    tripId: "eval-z-high",
    overallRiskScore: 92,
    threatRiskScore: 90,
    weatherRiskScore: 88,
    trafficRiskScore: 94,
    observedAdverseEvent: true,
  }),

  example({
    tripId: "eval-a-low",
    overallRiskScore: 8,
    threatRiskScore: 10,
    weatherRiskScore: 8,
    trafficRiskScore: 12,
    observedAdverseEvent: false,
  }),

  example({
    tripId: "eval-m-high",
    overallRiskScore: 85,
    threatRiskScore: 84,
    weatherRiskScore: 80,
    trafficRiskScore: 88,
    observedAdverseEvent: true,
  }),

  example({
    tripId: "eval-b-low",
    overallRiskScore: 12,
    threatRiskScore: 14,
    weatherRiskScore: 10,
    trafficRiskScore: 15,
    observedAdverseEvent: false,
  }),
];

function trainedModel() {
  return trainRouteRiskNeuralCandidate(
    trainingExamples,
    {
      epochs: 1200,
      learningRate: 0.1,
    }
  );
}

test(
  "neural evaluation exposes explicit neural algorithm and evaluation identity",
  () => {
    const result =
      evaluateRouteRiskNeuralCandidate({
        model:
          trainedModel(),

        examples:
          evaluationExamples,

        threshold:
          0.5,
      });

    assert.equal(
      result.algorithmVersion,
      ROUTE_RISK_NEURAL_CANDIDATE_VERSION
    );

    assert.equal(
      result.evaluationVersion,
      ROUTE_RISK_NEURAL_EVALUATION_VERSION
    );

    assert.equal(
      result.threshold,
      0.5
    );

    assert.equal(
      result.exampleCount,
      evaluationExamples.length
    );
  }
);

test(
  "neural evaluation rows are deterministic and sorted by trip identity",
  () => {
    const model =
      trainedModel();

    const first =
      evaluateRouteRiskNeuralCandidate({
        model,
        examples:
          evaluationExamples,
        threshold:
          0.5,
      });

    const second =
      evaluateRouteRiskNeuralCandidate({
        model,
        examples:
          evaluationExamples,
        threshold:
          0.5,
      });

    assert.deepEqual(
      second,
      first
    );

    assert.deepEqual(
      first.rows.map(
        (row) =>
          row.tripId
      ),
      [
        "eval-a-low",
        "eval-b-low",
        "eval-m-high",
        "eval-z-high",
      ]
    );
  }
);

test(
  "neural evaluation emits bounded probabilities and valid classifications",
  () => {
    const result =
      evaluateRouteRiskNeuralCandidate({
        model:
          trainedModel(),

        examples:
          evaluationExamples,

        threshold:
          0.5,
      });

    const allowed =
      new Set([
        "true_positive",
        "false_positive",
        "false_negative",
        "true_negative",
      ]);

    for (const row of result.rows) {
      assert.ok(
        Number.isFinite(
          row.predictedProbability
        )
      );

      assert.ok(
        row.predictedProbability >= 0
      );

      assert.ok(
        row.predictedProbability <= 1
      );

      assert.equal(
        row.predictedAdverseEvent,
        row.predictedProbability >= 0.5
      );

      assert.ok(
        allowed.has(
          row.classification
        )
      );
    }
  }
);

test(
  "controlled fixture produces correct neural classifications at threshold 0.5",
  () => {
    const result =
      evaluateRouteRiskNeuralCandidate({
        model:
          trainedModel(),

        examples:
          evaluationExamples,

        threshold:
          0.5,
      });

    const byTrip =
      Object.fromEntries(
        result.rows.map(
          (row) => [
            row.tripId,
            row,
          ]
        )
      );

    assert.equal(
      byTrip["eval-a-low"]
        .predictedAdverseEvent,
      false
    );

    assert.equal(
      byTrip["eval-b-low"]
        .predictedAdverseEvent,
      false
    );

    assert.equal(
      byTrip["eval-m-high"]
        .predictedAdverseEvent,
      true
    );

    assert.equal(
      byTrip["eval-z-high"]
        .predictedAdverseEvent,
      true
    );

    assert.equal(
      byTrip["eval-a-low"]
        .classification,
      "true_negative"
    );

    assert.equal(
      byTrip["eval-b-low"]
        .classification,
      "true_negative"
    );

    assert.equal(
      byTrip["eval-m-high"]
        .classification,
      "true_positive"
    );

    assert.equal(
      byTrip["eval-z-high"]
        .classification,
      "true_positive"
    );
  }
);

test(
  "neural evaluation delegates performance calculation to shared HarborGuard metrics",
  () => {
    const source =
      fs.readFileSync(
        "lib/fleet/evaluateRouteRiskNeuralCandidate.ts",
        "utf8"
      );

    assert.match(
      source,
      /calculateRoutePredictionPerformance/
    );

    const result =
      evaluateRouteRiskNeuralCandidate({
        model:
          trainedModel(),

        examples:
          evaluationExamples,

        threshold:
          0.5,
      });

    assert.ok(
      result.performance
    );
  }
);

test(
  "neural evaluator rejects invalid probability thresholds",
  () => {
    const model =
      trainedModel();

    for (
      const threshold of [
        -0.01,
        1.01,
        Number.NaN,
        Number.POSITIVE_INFINITY,
      ]
    ) {
      assert.throws(
        () =>
          evaluateRouteRiskNeuralCandidate({
            model,
            examples:
              evaluationExamples,
            threshold,
          }),
        /expected a finite probability between 0 and 1/
      );
    }
  }
);

test(
  "neural evaluator rejects malformed persisted models even with no evaluation rows",
  () => {
    const model =
      trainedModel();

    const malformed =
      JSON.parse(
        JSON.stringify(
          model
        )
      );

    malformed.parameters.outputBias =
      Number.NaN;

    assert.throws(
      () =>
        evaluateRouteRiskNeuralCandidate({
          model:
            malformed,

          examples: [],

          threshold:
            0.5,
        }),
      /expected a finite number/
    );
  }
);

test(
  "standalone neural evaluator creates no persistence lifecycle or production authority",
  () => {
    const source =
      fs.readFileSync(
        "lib/fleet/evaluateRouteRiskNeuralCandidate.ts",
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
      /createClient/
    );

    assert.doesNotMatch(
      source,
      /NextResponse/
    );

    assert.doesNotMatch(
      source,
      /registerRouteRisk/
    );

    assert.doesNotMatch(
      source,
      /activateRouteRisk/
    );
  }
);
