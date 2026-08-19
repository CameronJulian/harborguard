import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const trainerPath =
  "lib/fleet/trainRouteRiskNeuralCandidate.ts";

const parserPath =
  "lib/fleet/parseRouteRiskNeuralCandidateModel.ts";

const scorerPath =
  "lib/fleet/scoreRouteRiskNeuralCandidate.ts";

test(
  "neural candidate is explicitly versioned and uses the canonical four features",
  () => {
    const source =
      fs.readFileSync(
        trainerPath,
        "utf8"
      );

    assert.match(
      source,
      /harborguard-route-risk-neural-v1/
    );

    assert.match(
      source,
      /overallRiskScore/
    );

    assert.match(
      source,
      /threatRiskScore/
    );

    assert.match(
      source,
      /weatherRiskScore/
    );

    assert.match(
      source,
      /trafficRiskScore/
    );
  }
);

test(
  "neural candidate uses deterministic fixed initialization and no randomness",
  () => {
    const source =
      fs.readFileSync(
        trainerPath,
        "utf8"
      );

    assert.match(
      source,
      /deterministicInitialHiddenWeights/
    );

    assert.match(
      source,
      /deterministicInitialOutputWeights/
    );

    assert.doesNotMatch(
      source,
      /Math\.random/
    );

    assert.doesNotMatch(
      source,
      /Date\.now/
    );
  }
);

test(
  "neural network architecture is deliberately small and explicit",
  () => {
    const source =
      fs.readFileSync(
        trainerPath,
        "utf8"
      );

    assert.match(
      source,
      /ROUTE_RISK_NEURAL_HIDDEN_UNITS\s*=\s*4/
    );

    assert.match(
      source,
      /hiddenActivation:\s*"tanh"/
    );

    assert.match(
      source,
      /outputActivation:\s*"sigmoid"/
    );
  }
);

test(
  "neural parser validates architecture and finite parameters",
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
      /finiteMatrix/
    );

    assert.match(
      source,
      /finiteVector/
    );

    assert.match(
      source,
      /Invalid route-risk neural network architecture/
    );
  }
);

test(
  "neural scorer validates persisted artifact and returns a probability",
  () => {
    const source =
      fs.readFileSync(
        scorerPath,
        "utf8"
      );

    assert.match(
      source,
      /parseRouteRiskNeuralCandidateModel/
    );

    assert.match(
      source,
      /Math\.tanh/
    );

    assert.match(
      source,
      /sigmoid/
    );

    assert.match(
      source,
      /predictedProbability/
    );
  }
);

test(
  "standalone neural adapter introduces no persistence or lifecycle authority",
  () => {
    const source =
      [
        fs.readFileSync(
          trainerPath,
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
