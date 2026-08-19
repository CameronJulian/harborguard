import assert from "node:assert/strict";
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
  parseRouteRiskNeuralCandidateModel,
} from "../lib/fleet/parseRouteRiskNeuralCandidateModel.ts";

import {
  scoreRouteRiskNeuralCandidate,
} from "../lib/fleet/scoreRouteRiskNeuralCandidate.ts";

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
    tripId: "low-1",
    overallRiskScore: 5,
    threatRiskScore: 8,
    weatherRiskScore: 6,
    trafficRiskScore: 10,
    observedAdverseEvent: false,
  }),

  example({
    tripId: "low-2",
    overallRiskScore: 10,
    threatRiskScore: 12,
    weatherRiskScore: 8,
    trafficRiskScore: 15,
    observedAdverseEvent: false,
  }),

  example({
    tripId: "low-3",
    overallRiskScore: 15,
    threatRiskScore: 10,
    weatherRiskScore: 12,
    trafficRiskScore: 18,
    observedAdverseEvent: false,
  }),

  example({
    tripId: "low-4",
    overallRiskScore: 20,
    threatRiskScore: 18,
    weatherRiskScore: 15,
    trafficRiskScore: 20,
    observedAdverseEvent: false,
  }),

  example({
    tripId: "high-1",
    overallRiskScore: 80,
    threatRiskScore: 82,
    weatherRiskScore: 75,
    trafficRiskScore: 78,
    observedAdverseEvent: true,
  }),

  example({
    tripId: "high-2",
    overallRiskScore: 85,
    threatRiskScore: 88,
    weatherRiskScore: 82,
    trafficRiskScore: 80,
    observedAdverseEvent: true,
  }),

  example({
    tripId: "high-3",
    overallRiskScore: 90,
    threatRiskScore: 86,
    weatherRiskScore: 88,
    trafficRiskScore: 92,
    observedAdverseEvent: true,
  }),

  example({
    tripId: "high-4",
    overallRiskScore: 95,
    threatRiskScore: 92,
    weatherRiskScore: 90,
    trafficRiskScore: 96,
    observedAdverseEvent: true,
  }),
];

const trainingOptions = {
  epochs: 1200,
  learningRate: 0.1,
};

test(
  "neural training is deterministic for identical examples and options",
  () => {
    const first =
      trainRouteRiskNeuralCandidate(
        trainingExamples,
        trainingOptions
      );

    const second =
      trainRouteRiskNeuralCandidate(
        trainingExamples,
        trainingOptions
      );

    assert.deepEqual(
      second,
      first
    );

    assert.equal(
      first.algorithmVersion,
      ROUTE_RISK_NEURAL_CANDIDATE_VERSION
    );

    assert.equal(
      first.training.exampleCount,
      trainingExamples.length
    );

    assert.equal(
      first.training.positiveCount,
      4
    );

    assert.equal(
      first.training.negativeCount,
      4
    );

    assert.ok(
      Number.isFinite(
        first.training.finalLoss
      )
    );

    assert.ok(
      first.training.finalLoss >= 0
    );
  }
);

test(
  "trained neural candidate emits finite bounded probabilities",
  () => {
    const model =
      trainRouteRiskNeuralCandidate(
        trainingExamples,
        trainingOptions
      );

    const fixtures = [
      {
        overallRiskScore: 0,
        threatRiskScore: 0,
        weatherRiskScore: 0,
        trafficRiskScore: 0,
      },
      {
        overallRiskScore: 50,
        threatRiskScore: 50,
        weatherRiskScore: 50,
        trafficRiskScore: 50,
      },
      {
        overallRiskScore: 100,
        threatRiskScore: 100,
        weatherRiskScore: 100,
        trafficRiskScore: 100,
      },
    ];

    for (const features of fixtures) {
      const prediction =
        scoreRouteRiskNeuralCandidate({
          model,
          features,
        });

      assert.ok(
        Number.isFinite(
          prediction.predictedProbability
        )
      );

      assert.ok(
        prediction.predictedProbability >= 0
      );

      assert.ok(
        prediction.predictedProbability <= 1
      );
    }
  }
);

test(
  "controlled high-risk fixture scores above controlled low-risk fixture",
  () => {
    const model =
      trainRouteRiskNeuralCandidate(
        trainingExamples,
        trainingOptions
      );

    const low =
      scoreRouteRiskNeuralCandidate({
        model,

        features: {
          overallRiskScore: 10,
          threatRiskScore: 10,
          weatherRiskScore: 10,
          trafficRiskScore: 10,
        },
      });

    const high =
      scoreRouteRiskNeuralCandidate({
        model,

        features: {
          overallRiskScore: 90,
          threatRiskScore: 90,
          weatherRiskScore: 90,
          trafficRiskScore: 90,
        },
      });

    assert.ok(
      high.predictedProbability >
        low.predictedProbability,
      `Expected high-risk probability (${high.predictedProbability}) to exceed low-risk probability (${low.predictedProbability}).`
    );
  }
);

test(
  "neural artifact survives JSON serialization and strict parsing",
  () => {
    const trained =
      trainRouteRiskNeuralCandidate(
        trainingExamples,
        trainingOptions
      );

    const serialized =
      JSON.stringify(
        trained
      );

    const parsed =
      parseRouteRiskNeuralCandidateModel(
        JSON.parse(serialized)
      );

    assert.deepEqual(
      parsed,
      trained
    );
  }
);

test(
  "serialized and parsed neural artifact preserves scoring exactly",
  () => {
    const trained =
      trainRouteRiskNeuralCandidate(
        trainingExamples,
        trainingOptions
      );

    const parsed =
      parseRouteRiskNeuralCandidateModel(
        JSON.parse(
          JSON.stringify(
            trained
          )
        )
      );

    const features = {
      overallRiskScore: 72,
      threatRiskScore: 65,
      weatherRiskScore: 58,
      trafficRiskScore: 80,
    };

    const originalPrediction =
      scoreRouteRiskNeuralCandidate({
        model:
          trained,

        features,
      });

    const parsedPrediction =
      scoreRouteRiskNeuralCandidate({
        model:
          parsed,

        features,
      });

    assert.deepEqual(
      parsedPrediction,
      originalPrediction
    );
  }
);

test(
  "strict parser rejects malformed neural parameter shapes",
  () => {
    const trained =
      trainRouteRiskNeuralCandidate(
        trainingExamples,
        trainingOptions
      );

    const malformed =
      JSON.parse(
        JSON.stringify(
          trained
        )
      );

    malformed.parameters.hiddenWeights =
      [
        [1, 2],
      ];

    assert.throws(
      () =>
        parseRouteRiskNeuralCandidateModel(
          malformed
        ),
      /unexpected matrix shape/
    );
  }
);

test(
  "strict scorer rejects feature values outside canonical risk range",
  () => {
    const model =
      trainRouteRiskNeuralCandidate(
        trainingExamples,
        trainingOptions
      );

    assert.throws(
      () =>
        scoreRouteRiskNeuralCandidate({
          model,

          features: {
            overallRiskScore: 101,
            threatRiskScore: 50,
            weatherRiskScore: 50,
            trafficRiskScore: 50,
          },
        }),
      /expected a finite score between 0 and 100/
    );
  }
);
