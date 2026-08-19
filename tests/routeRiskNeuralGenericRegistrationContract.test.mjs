import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const artifactPath =
  "lib/fleet/routeRiskModelArtifact.ts";

const trainerPath =
  "lib/fleet/trainRouteRiskModel.ts";

const evaluatorPath =
  "lib/fleet/evaluateRouteRiskModel.ts";

const parserPath =
  "lib/fleet/parseRouteRiskModelArtifact.ts";

const scorerPath =
  "lib/fleet/scoreRouteRiskModel.ts";

test(
  "generic artifact contract registers neural candidate explicitly",
  () => {
    const source =
      fs.readFileSync(
        artifactPath,
        "utf8"
      );

    assert.match(
      source,
      /ROUTE_RISK_NEURAL_CANDIDATE_VERSION/
    );

    assert.match(
      source,
      /RouteRiskNeuralCandidateModel/
    );
  }
);

test(
  "generic trainer registers neural candidate adapter",
  () => {
    const source =
      fs.readFileSync(
        trainerPath,
        "utf8"
      );

    assert.match(
      source,
      /trainRouteRiskNeuralCandidate/
    );

    assert.match(
      source,
      /case ROUTE_RISK_NEURAL_CANDIDATE_VERSION/
    );
  }
);

test(
  "generic evaluator registers neural candidate evaluator",
  () => {
    const source =
      fs.readFileSync(
        evaluatorPath,
        "utf8"
      );

    assert.match(
      source,
      /evaluateRouteRiskNeuralCandidate/
    );

    assert.match(
      source,
      /RouteRiskNeuralEvaluationResult/
    );
  }
);

test(
  "generic parser registers strict neural parser",
  () => {
    const source =
      fs.readFileSync(
        parserPath,
        "utf8"
      );

    assert.match(
      source,
      /parseRouteRiskNeuralCandidateModel/
    );

    assert.match(
      source,
      /case ROUTE_RISK_NEURAL_CANDIDATE_VERSION/
    );
  }
);

test(
  "generic scorer registers neural scorer",
  () => {
    const source =
      fs.readFileSync(
        scorerPath,
        "utf8"
      );

    assert.match(
      source,
      /scoreRouteRiskNeuralCandidate/
    );

    assert.match(
      source,
      /case ROUTE_RISK_NEURAL_CANDIDATE_VERSION/
    );
  }
);

test(
  "generic dispatchers retain explicit unsupported-algorithm failure boundaries",
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
        fs.readFileSync(
          parserPath,
          "utf8"
        ),
        fs.readFileSync(
          scorerPath,
          "utf8"
        ),
      ].join("\n");

    assert.match(
      source,
      /Unsupported route-risk training algorithm version/
    );

    assert.match(
      source,
      /Unsupported route-risk evaluation algorithm version/
    );

    assert.match(
      source,
      /Unsupported route-risk model algorithm version/
    );
  }
);

test(
  "generic neural registration introduces no database lifecycle or production authority",
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

    assert.doesNotMatch(
      source,
      /NextResponse/
    );
  }
);
test(
  "supported model algorithm registry includes neural candidate",
  () => {
    const source =
      fs.readFileSync(
        artifactPath,
        "utf8"
      );

    const registryMatch =
      source.match(
        /SUPPORTED_ROUTE_RISK_MODEL_ALGORITHM_VERSIONS\s*=\s*\[([\s\S]*?)\]\s*as const/
      );

    assert.ok(
      registryMatch,
      "Expected supported route-risk algorithm registry."
    );

    assert.match(
      registryMatch[1],
      /ROUTE_RISK_LOGISTIC_BASELINE_VERSION/
    );

    assert.match(
      registryMatch[1],
      /ROUTE_RISK_NEURAL_CANDIDATE_VERSION/
    );
  }
);
