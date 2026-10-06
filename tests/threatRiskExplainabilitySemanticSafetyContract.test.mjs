import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const commandCenterThreat = fs.readFileSync(
  "app/command-center/sections/CommandCenterThreatIntelligenceSection.tsx",
  "utf8"
);

const commandCenterStatus = fs.readFileSync(
  "app/command-center/sections/CommandCenterStatusSection.tsx",
  "utf8"
);

const riskDashboard = fs.readFileSync(
  "app/risk-dashboard/page.tsx",
  "utf8"
);

const api = fs.readFileSync(
  "app/api/fleet/predict-threats/route.ts",
  "utf8"
);

test(
  "Command Center primary threat surface uses risk-score semantics",
  () => {
    assert.match(commandCenterThreat, /Threat Risk Score/);
    assert.match(
      commandCenterThreat,
      /\{threat\.probability\}\s*\/\s*100/
    );

    assert.doesNotMatch(
      commandCenterThreat,
      /Threat Probability/
    );

    assert.doesNotMatch(
      commandCenterThreat,
      /\{threat\.probability\}%/
    );
  }
);

test(
  "Command Center compact status surface avoids probability percentage semantics",
  () => {
    assert.match(
      commandCenterStatus,
      /risk score \{threat\.probability\}\s*\/\s*100/
    );

    assert.doesNotMatch(
      commandCenterStatus,
      /\{threat\.probability\}%/
    );
  }
);

test(
  "Risk Dashboard uses risk-score semantics",
  () => {
    assert.match(riskDashboard, /Threat Risk Score/);

    assert.match(
      riskDashboard,
      /\{prediction\.probability\}\s*\/\s*100/
    );

    assert.doesNotMatch(
      riskDashboard,
      /Threat Probability/
    );

    assert.doesNotMatch(
      riskDashboard,
      /\{prediction\.probability\}%/
    );
  }
);

test(
  "primary operational surfaces explicitly reject calibrated-probability interpretation",
  () => {
    for (const source of [
      commandCenterThreat,
      riskDashboard,
    ]) {
      assert.match(
        source,
        /Composite threat-risk indicator based on current operational signals\./
      );

      assert.match(
        source,
        /It is not a calibrated probability that a threat will occur\./
      );
    }
  }
);

test(
  "Command Center exposes geofence contribution evidence",
  () => {
    assert.match(
      commandCenterThreat,
      /predictedGeofenceRisk/
    );

    assert.match(
      commandCenterThreat,
      /predictedBreach/
    );

    assert.match(
      commandCenterThreat,
      /Geofence Risk/
    );

    assert.match(
      commandCenterThreat,
      /Predicted Geofence Breach/
    );
  }
);

test(
  "Risk Dashboard exposes geofence contribution evidence",
  () => {
    assert.match(
      riskDashboard,
      /predictedGeofenceRisk/
    );

    assert.match(
      riskDashboard,
      /predictedBreach/
    );

    assert.match(
      riskDashboard,
      /Geofence Risk/
    );

    assert.match(
      riskDashboard,
      /Predicted Geofence Breach/
    );
  }
);

test(
  "existing Command Center operational evidence remains visible",
  () => {
    assert.match(commandCenterThreat, /threat\.speed/);
    assert.match(commandCenterThreat, /threat\.openAlerts/);
    assert.match(commandCenterThreat, /threat\.criticalAlerts/);
    assert.match(commandCenterThreat, /threat\.nearIncident/);
    assert.match(commandCenterThreat, /threat\.isOffline/);
  }
);

test(
  "existing Risk Dashboard operational evidence remains visible",
  () => {
    assert.match(riskDashboard, /prediction\.speed/);
    assert.match(riskDashboard, /prediction\.openAlerts/);
    assert.match(riskDashboard, /prediction\.criticalAlerts/);
    assert.match(riskDashboard, /prediction\.nearIncident/);
    assert.match(riskDashboard, /prediction\.isOffline/);
  }
);

test(
  "predict-threats API contract remains unchanged",
  () => {
    assert.match(
      api,
      /probability:\s*adjustedProbability/
    );

    assert.match(api, /predictedGeofenceRisk/);
    assert.match(api, /predictedBreach/);

    assert.match(
      api,
      /basePrediction\.probability\s*\+\s*predictedGeofenceRisk/
    );
  }
);

test(
  "heuristic threat scoring remains unchanged",
  () => {
    assert.match(
      api,
      /score \+= params\.openAlerts \* 10/
    );

    assert.match(
      api,
      /score \+= params\.criticalAlerts \* 20/
    );

    assert.match(
      api,
      /if \(params\.isOffline\) score \+= 15/
    );

    assert.match(
      api,
      /if \(params\.nearIncident\) score \+= 25/
    );

    assert.match(
      api,
      /score = Math\.min\(score, 100\)/
    );
  }
);