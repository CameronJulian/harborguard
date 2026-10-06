import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const component = fs.readFileSync(
  "components/command-center/PredictiveIncidentIntelligence.tsx",
  "utf8"
);

test(
  "predictive incident score is presented as an operational score, not a percentage likelihood",
  () => {
    assert.match(
      component,
      /\{item\.score\}\s*\/\s*99/
    );

    assert.match(
      component,
      /operational risk score/
    );

    assert.doesNotMatch(
      component,
      /\{item\.score\}%/
    );

    assert.doesNotMatch(
      component,
      /escalation likelihood/
    );
  }
);

test(
  "predictive incident UI explicitly avoids calibrated-probability claims",
  () => {
    assert.match(
      component,
      /Composite operational indicator based on current fleet signals\./
    );

    assert.match(
      component,
      /It is not a calibrated probability of an incident occurring\./
    );
  }
);

test(
  "predictive incident UI exposes existing behavioral risk evidence",
  () => {
    assert.match(
      component,
      /"Behavioral Risk"/
    );

    assert.match(
      component,
      /item\.behavioralRisk === "high"/
    );

    assert.match(
      component,
      /\? "HIGH"\s*:\s*"Normal"/
    );
  }
);

test(
  "existing operational evidence remains visible",
  () => {
    assert.match(
      component,
      /\["Alerts", item\.activeAlerts\]/
    );

    assert.match(
      component,
      /\["Critical", item\.criticalAlerts\]/
    );

    assert.match(
      component,
      /\["High", item\.highAlerts\]/
    );

    assert.match(
      component,
      /\["Panic\/SOS", item\.panicAlerts\]/
    );

    assert.match(
      component,
      /\["Incidents", item\.openIncidentCount\]/
    );

    assert.match(
      component,
      /\["Road Risk", item\.activeRoadRisk\]/
    );
  }
);

test(
  "existing prediction and recommended actions remain visible",
  () => {
    assert.match(
      component,
      /\{item\.prediction\}/
    );

    assert.match(
      component,
      /item\.recommendedActions\.map/
    );

    assert.match(
      component,
      /Recommended actions/
    );
  }
);

test(
  "existing forecast freshness remains visible",
  () => {
    assert.match(
      component,
      /Last forecast:/
    );

    assert.match(
      component,
      /new Date\(data\.generatedAt\)\.toLocaleTimeString\(\)/
    );
  }
);

test(
  "Command Center continues using the existing predictive incidents API",
  () => {
    const calls =
      component.match(
        /"\/api\/command-center\/predictive-incidents"/g
      ) || [];

    assert.equal(
      calls.length,
      1
    );
  }
);