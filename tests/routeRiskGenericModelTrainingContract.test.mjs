import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const trainerPath =
  "lib/fleet/trainRouteRiskModel.ts";

const evaluatorPath =
  "lib/fleet/evaluateRouteRiskModel.ts";

const runnerPath =
  "lib/fleet/runRouteRiskOfflineTraining.ts";

test(
  "generic trainer explicitly registers the logistic baseline adapter",
  () => {
    const source =
      fs.readFileSync(
        trainerPath,
        "utf8"
      );

    assert.match(
      source,
      /trainRouteRiskLogisticBaseline/
    );

    assert.match(
      source,
      /ROUTE_RISK_LOGISTIC_BASELINE_VERSION/
    );

    assert.match(
      source,
      /Unsupported route-risk training algorithm version/
    );
  }
);

test(
  "generic evaluator explicitly registers the logistic evaluator",
  () => {
    const source =
      fs.readFileSync(
        evaluatorPath,
        "utf8"
      );

    assert.match(
      source,
      /evaluateRouteRiskLogisticBaseline/
    );

    assert.match(
      source,
      /ROUTE_RISK_LOGISTIC_BASELINE_VERSION/
    );

    assert.match(
      source,
      /Unsupported route-risk evaluation algorithm version/
    );
  }
);

test(
  "prepared offline training uses generic training and evaluation dispatchers",
  () => {
    const source =
      fs.readFileSync(
        runnerPath,
        "utf8"
      );

    assert.match(
      source,
      /trainRouteRiskModel/
    );

    assert.match(
      source,
      /evaluateRouteRiskModel/
    );

    assert.doesNotMatch(
      source,
      /trainRouteRiskLogisticBaseline/
    );

    assert.doesNotMatch(
      source,
      /evaluateRouteRiskLogisticBaseline/
    );
  }
);

test(
  "offline training result exposes generic artifact and evaluation contracts",
  () => {
    const source =
      fs.readFileSync(
        runnerPath,
        "utf8"
      );

    assert.match(
      source,
      /RouteRiskModelArtifact/
    );

    assert.match(
      source,
      /RouteRiskModelEvaluation/
    );

    assert.match(
      source,
      /RouteRiskModelTrainingOptions/
    );
  }
);

test(
  "generic training dispatchers introduce no persistence or lifecycle authority",
  () => {
    const source =
      [
        fs.readFileSync(
          trainerPath,
          "utf8"
        ),
        fs.readFileSync(
          evaluatorPath,
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
