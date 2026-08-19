import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const helperPaths = [
  "lib/fleet/assessRouteRiskShadowEvidence.ts",
  "lib/fleet/buildRouteRiskShadowAdvisoryForecast.ts",
  "lib/fleet/persistRouteRiskShadowPrediction.ts",
];

test(
  "shadow helpers no longer depend on logistic prediction types",
  () => {
    for (const path of helperPaths) {
      const source =
        fs.readFileSync(
          path,
          "utf8"
        );

      assert.doesNotMatch(
        source,
        /RouteRiskLogisticPrediction/
      );

      assert.doesNotMatch(
        source,
        /RouteRiskLogisticPredictionFeatures/
      );

      assert.doesNotMatch(
        source,
        /from\s+"@\/lib\/fleet\/scoreRouteRiskLogisticModel"/
      );
    }
  }
);

test(
  "shadow evidence consumes the generic route-risk feature contract",
  () => {
    const source =
      fs.readFileSync(
        helperPaths[0],
        "utf8"
      );

    assert.match(
      source,
      /RouteRiskPredictionFeatures/
    );

    assert.match(
      source,
      /from\s+"@\/lib\/fleet\/routeRiskModelArtifact"/
    );
  }
);

test(
  "shadow advisory consumes the generic model prediction contract",
  () => {
    const source =
      fs.readFileSync(
        helperPaths[1],
        "utf8"
      );

    assert.match(
      source,
      /RouteRiskModelPrediction/
    );

    assert.match(
      source,
      /from\s+"@\/lib\/fleet\/routeRiskModelArtifact"/
    );
  }
);

test(
  "shadow persistence consumes generic feature and prediction contracts",
  () => {
    const source =
      fs.readFileSync(
        helperPaths[2],
        "utf8"
      );

    assert.match(
      source,
      /RouteRiskPredictionFeatures/
    );

    assert.match(
      source,
      /RouteRiskModelPrediction/
    );

    assert.match(
      source,
      /from\s+"@\/lib\/fleet\/routeRiskModelArtifact"/
    );
  }
);

test(
  "type cleanup does not alter shadow evidence probability semantics",
  () => {
    const evidence =
      fs.readFileSync(
        helperPaths[0],
        "utf8"
      );

    const advisory =
      fs.readFileSync(
        helperPaths[1],
        "utf8"
      );

    assert.match(
      evidence,
      /UNCALIBRATED_LOGISTIC_MODEL_OUTPUT/
    );

    assert.match(
      advisory,
      /UNCALIBRATED_LOGISTIC_MODEL_OUTPUT/
    );
  }
);

test(
  "shadow persistence remains non-scoring and non-authoritative",
  () => {
    const source =
      fs.readFileSync(
        helperPaths[2],
        "utf8"
      );

    assert.doesNotMatch(
      source,
      /scoreRouteRiskModel\(/
    );

    assert.doesNotMatch(
      source,
      /scoreRouteRiskLogisticModel\(/
    );

    assert.match(
      source,
      /This helper performs no model scoring/
    );

    assert.match(
      source,
      /This helper performs no Route Safety integration/
    );
  }
);
