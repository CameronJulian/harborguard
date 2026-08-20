import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const riskDetection = fs.readFileSync(
  "lib/fleet/risk-detection.ts",
  "utf8"
);

test("detect-risks uses the HSPP operational-read boundary", () => {
  assert.match(
    riskDetection,
    /readHsppEvidenceForOperationalUse/
  );
});

test("detect-risks reads HSPP linkage from latest location", () => {
  assert.match(
    riskDetection,
    /latest\.hspp_evidence_id/
  );
});

test("detect-risks preserves unlinked latest-location behavior", () => {
  assert.match(
    riskDetection,
    /if\s*\(\s*hsppEvidenceId\s*\)/
  );
});

test("detect-risks evaluates linked evidence using centralized HSPP policy", () => {
  assert.match(
    riskDetection,
    /await\s+readHsppEvidenceForOperationalUse\s*\(\s*\{/
  );

  assert.match(
    riskDetection,
    /evidenceId:\s*hsppEvidenceId/
  );

  assert.match(
    riskDetection,
    /organizationId/
  );
});

test("detect-risks fails closed for denied linked telemetry", () => {
  assert.match(
    riskDetection,
    /if\s*\(\s*!operationalRead\.decision\.allowed\s*\)\s*\{\s*continue;/
  );
});

test("HSPP denial occurs before long-stop telemetry alert evaluation", () => {
  const denyIndex =
    riskDetection.indexOf(
      "!operationalRead.decision.allowed"
    );

  const longStopIndex =
    riskDetection.indexOf(
      '(latest.speed_kmh ?? 0) < 3'
    );

  assert.notEqual(denyIndex, -1);
  assert.notEqual(longStopIndex, -1);

  assert.ok(
    denyIndex < longStopIndex
  );
});

test("HSPP denial occurs before geofence telemetry evaluation", () => {
  const denyIndex =
    riskDetection.indexOf(
      "!operationalRead.decision.allowed"
    );

  const geofenceIndex =
    riskDetection.indexOf(
      "let insideAny = false"
    );

  assert.notEqual(denyIndex, -1);
  assert.notEqual(geofenceIndex, -1);

  assert.ok(
    denyIndex < geofenceIndex
  );
});

test("driver-fatigue evaluation remains before HSPP telemetry gate", () => {
  const fatigueIndex =
    riskDetection.indexOf(
      'alertType: "driver_fatigue"'
    );

  const hsppIndex =
    riskDetection.indexOf(
      "const hsppEvidenceId"
    );

  assert.notEqual(fatigueIndex, -1);
  assert.notEqual(hsppIndex, -1);

  assert.ok(
    fatigueIndex < hsppIndex
  );
});

test("Detect Risks keeps its existing mutation boundary", () => {
  assert.match(
    riskDetection,
    /\.from\("vehicle_alerts"\)/
  );

  assert.match(
    riskDetection,
    /\.insert\(\{/
  );

  assert.match(
    riskDetection,
    /createCommandCenterNotification/
  );

  assert.match(
    riskDetection,
    /correlateVehicleAlertToIncident/
  );
});

test("HSPP-007F does not change Detect Risks result shape", () => {
  assert.match(
    riskDetection,
    /createdCount:\s*createdAlerts\.length/
  );

  assert.match(
    riskDetection,
    /alerts:\s*createdAlerts/
  );
});

test("HSPP-007F does not modify other fleet consumers", () => {
  assert.doesNotMatch(
    riskDetection,
    /api\/fleet\/predict-eta/
  );

  assert.doesNotMatch(
    riskDetection,
    /api\/fleet\/predict-threats/
  );

  assert.doesNotMatch(
    riskDetection,
    /api\/fleet\/digital-twin/
  );
});
