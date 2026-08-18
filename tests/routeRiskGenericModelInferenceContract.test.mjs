import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const artifactPath =
  "lib/fleet/routeRiskModelArtifact.ts";

const parserPath =
  "lib/fleet/parseRouteRiskModelArtifact.ts";

const scorerPath =
  "lib/fleet/scoreRouteRiskModel.ts";

const logisticScorerPath =
  "lib/fleet/scoreRouteRiskLogisticModel.ts";

test(
  "generic artifact contract registers the logistic baseline explicitly",
  () => {
    const source =
      fs.readFileSync(
        artifactPath,
        "utf8"
      );

    assert.match(
      source,
      /ROUTE_RISK_LOGISTIC_BASELINE_VERSION/
    );

    assert.match(
      source,
      /SUPPORTED_ROUTE_RISK_MODEL_ALGORITHM_VERSIONS/
    );
  }
);

test(
  "generic parser delegates logistic artifacts to the existing strict parser",
  () => {
    const source =
      fs.readFileSync(
        parserPath,
        "utf8"
      );

    assert.match(
      source,
      /parseRouteRiskLogisticBaselineModel/
    );

    assert.match(
      source,
      /case\s+ROUTE_RISK_LOGISTIC_BASELINE_VERSION/
    );

    assert.match(
      source,
      /Unsupported route-risk model algorithm version/
    );
  }
);

test(
  "generic scorer dispatches through the existing logistic scorer",
  () => {
    const source =
      fs.readFileSync(
        scorerPath,
        "utf8"
      );

    assert.match(
      source,
      /parseRouteRiskModelArtifact/
    );

    assert.match(
      source,
      /scoreRouteRiskLogisticModel/
    );

    assert.match(
      source,
      /case\s+ROUTE_RISK_LOGISTIC_BASELINE_VERSION/
    );
  }
);

test(
  "generic inference boundary introduces no database or lifecycle authority",
  () => {
    const source =
      [
        fs.readFileSync(
          artifactPath,
          "utf8"
        ),
        fs.readFileSync(
          parserPath,
          "utf8"
        ),
        fs.readFileSync(
          scorerPath,
          "utf8"
        ),
      ].join("\n");

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
  }
);

test(
  "existing logistic scorer remains unchanged as the algorithm adapter",
  () => {
    const source =
      fs.readFileSync(
        logisticScorerPath,
        "utf8"
      );

    assert.match(
      source,
      /scoreRouteRiskLogisticModel/
    );

    assert.match(
      source,
      /parseRouteRiskLogisticBaselineModel/
    );
  }
);
