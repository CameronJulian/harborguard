import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  "app/api/fleet/predict-threats/route.ts",
  "utf8"
);

test("predict-threats uses the HSPP operational-read boundary", () => {
  assert.match(
    route,
    /readHsppEvidenceForOperationalUse/
  );
});

test("predict-threats reads HSPP linkage from latest locations", () => {
  assert.match(
    route,
    /hspp_evidence_id/
  );
});

test("predict-threats preserves unlinked location behavior", () => {
  assert.match(
    route,
    /if\s*\(\s*!evidenceId\s*\)\s*\{\s*continue;/
  );
});

test("predict-threats evaluates linked HSPP evidence", () => {
  assert.match(
    route,
    /await\s+readHsppEvidenceForOperationalUse\s*\(\s*\{/
  );

  assert.match(
    route,
    /organizationId/
  );

  assert.match(
    route,
    /evidenceId/
  );
});

test("predict-threats records HSPP-denied vehicle identities", () => {
  assert.match(
    route,
    /if\s*\(\s*!operationalRead\.decision\.allowed\s*\)/
  );

  assert.match(
    route,
    /deniedHsppVehicleIds\.add/
  );
});

test("predict-threats skips denied HSPP vehicles before scoring", () => {
  const denyIndex =
    route.indexOf(
      "deniedHsppVehicleIds.has"
    );

  const scoringIndex =
    route.indexOf(
      "const basePrediction = calculateThreatProbability"
    );

  const predictionPushIndex =
    route.indexOf(
      "predictions.push"
    );

  assert.notEqual(
    denyIndex,
    -1
  );

  assert.notEqual(
    scoringIndex,
    -1
  );

  assert.notEqual(
    predictionPushIndex,
    -1
  );

  assert.ok(
    denyIndex < scoringIndex
  );

  assert.ok(
    scoringIndex < predictionPushIndex
  );
});

test("HSPP-007D does not modify prediction response shape", () => {
  assert.match(
    route,
    /success:\s*true/
  );

  assert.match(
    route,
    /predictions,/
  );
});

test("HSPP-007D does not perform new location or evidence writes", () => {
  assert.doesNotMatch(
    route,
    /\.insert\(/
  );

  assert.doesNotMatch(
    route,
    /\.update\(/
  );

  assert.doesNotMatch(
    route,
    /\.upsert\(/
  );

  assert.doesNotMatch(
    route,
    /\.delete\(/
  );
});

test("HSPP-007D leaves Fleet Live and Dispatch Tracking untouched", () => {
  assert.doesNotMatch(
    route,
    /api\/fleet\/live/
  );

  assert.doesNotMatch(
    route,
    /dispatch\/tracking/
  );
});
