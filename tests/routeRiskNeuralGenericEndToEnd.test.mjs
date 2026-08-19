import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  ROUTE_RISK_FEATURE_SCHEMA_VERSION,
  ROUTE_RISK_LABEL_SCHEMA_VERSION,
  ROUTE_RISK_TRAINING_CONTRACT_VERSION,
} from "../lib/fleet/buildRouteRiskTrainingExample.ts";

import {
  trainRouteRiskModel,
} from "../lib/fleet/trainRouteRiskModel.ts";

import {
  evaluateRouteRiskModel,
} from "../lib/fleet/evaluateRouteRiskModel.ts";

import {
  parseRouteRiskModelArtifact,
} from "../lib/fleet/parseRouteRiskModelArtifact.ts";

import {
  scoreRouteRiskModel,
} from "../lib/fleet/scoreRouteRiskModel.ts";

import {
  ROUTE_RISK_NEURAL_CANDIDATE_VERSION,
} from "../lib/fleet/trainRouteRiskNeuralCandidate.ts";

import {
  ROUTE_RISK_NEURAL_EVALUATION_VERSION,
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
    overallRiskScore: 12,
    threatRiskScore: 10,
    weatherRiskScore: 9,
    trafficRiskScore: 15,
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
    overallRiskScore: 88,
    threatRiskScore: 86,
    weatherRiskScore: 84,
    trafficRiskScore: 90,
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
    tripId: "eval-low",
    overallRiskScore: 10,
    threatRiskScore: 12,
    weatherRiskScore: 10,
    trafficRiskScore: 14,
    observedAdverseEvent: false,
  }),

  example({
    tripId: "eval-high",
    overallRiskScore: 90,
    threatRiskScore: 88,
    weatherRiskScore: 86,
    trafficRiskScore: 92,
    observedAdverseEvent: true,
  }),
];

function trainGenericNeuralModel() {
  return trainRouteRiskModel({
    examples:
      trainingExamples,

    training: {
      algorithmVersion:
        ROUTE_RISK_NEURAL_CANDIDATE_VERSION,

      epochs:
        1200,

      learningRate:
        0.1,
    },
  });
}

test(
  "generic trainer returns neural artifact when neural algorithm is requested",
  () => {
    const model =
      trainGenericNeuralModel();

    assert.equal(
      model.algorithmVersion,
      ROUTE_RISK_NEURAL_CANDIDATE_VERSION
    );
  }
);

test(
  "generic neural training remains deterministic",
  () => {
    const first =
      trainGenericNeuralModel();

    const second =
      trainGenericNeuralModel();

    assert.deepEqual(
      second,
      first
    );
  }
);

test(
  "generic evaluator dispatches neural artifact to neural evaluation",
  () => {
    const model =
      trainGenericNeuralModel();

    const result =
      evaluateRouteRiskModel({
        model,
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
      result.exampleCount,
      evaluationExamples.length
    );
  }
);

test(
  "generic neural artifact survives JSON serialization and generic parsing",
  () => {
    const model =
      trainGenericNeuralModel();

    const parsed =
      parseRouteRiskModelArtifact(
        JSON.parse(
          JSON.stringify(
            model
          )
        )
      );

    assert.deepEqual(
      parsed,
      model
    );

    assert.equal(
      parsed.algorithmVersion,
      ROUTE_RISK_NEURAL_CANDIDATE_VERSION
    );
  }
);

test(
  "generic scorer produces bounded neural probabilities",
  () => {
    const model =
      trainGenericNeuralModel();

    const fixtures = [
      {
        overallRiskScore: 5,
        threatRiskScore: 5,
        weatherRiskScore: 5,
        trafficRiskScore: 5,
      },
      {
        overallRiskScore: 50,
        threatRiskScore: 50,
        weatherRiskScore: 50,
        trafficRiskScore: 50,
      },
      {
        overallRiskScore: 95,
        threatRiskScore: 95,
        weatherRiskScore: 95,
        trafficRiskScore: 95,
      },
    ];

    for (const features of fixtures) {
      const prediction =
        scoreRouteRiskModel({
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
  "generic scoring is identical before and after serialization round trip",
  () => {
    const model =
      trainGenericNeuralModel();

    const parsed =
      parseRouteRiskModelArtifact(
        JSON.parse(
          JSON.stringify(
            model
          )
        )
      );

    const features = {
      overallRiskScore: 72,
      threatRiskScore: 67,
      weatherRiskScore: 61,
      trafficRiskScore: 78,
    };

    const before =
      scoreRouteRiskModel({
        model,
        features,
      });

    const after =
      scoreRouteRiskModel({
        model:
          parsed,
        features,
      });

    assert.deepEqual(
      after,
      before
    );
  }
);

test(
  "generic neural high-risk fixture scores above low-risk fixture",
  () => {
    const model =
      trainGenericNeuralModel();

    const low =
      scoreRouteRiskModel({
        model,

        features: {
          overallRiskScore: 10,
          threatRiskScore: 10,
          weatherRiskScore: 10,
          trafficRiskScore: 10,
        },
      });

    const high =
      scoreRouteRiskModel({
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
        low.predictedProbability
    );
  }
);

test(
  "generic neural integration creates no persistence or production authority",
  () => {
    const files = [
      "lib/fleet/trainRouteRiskModel.ts",
      "lib/fleet/evaluateRouteRiskModel.ts",
      "lib/fleet/parseRouteRiskModelArtifact.ts",
      "lib/fleet/scoreRouteRiskModel.ts",
      "lib/fleet/trainRouteRiskNeuralCandidate.ts",
      "lib/fleet/evaluateRouteRiskNeuralCandidate.ts",
      "lib/fleet/parseRouteRiskNeuralCandidateModel.ts",
      "lib/fleet/scoreRouteRiskNeuralCandidate.ts",
    ];

    const source =
      files.map(
        (path) =>
          fs.readFileSync(
            path,
            "utf8"
          )
      ).join("\n");

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
      /activateRouteRisk/
    );

    assert.doesNotMatch(
      source,
      /registerRouteRiskModelCandidate/
    );
  }
);
