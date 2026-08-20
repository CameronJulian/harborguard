import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  "app/api/fleet/predict-eta/route.ts",
  "utf8"
);

test("predict-eta uses the HSPP operational-read boundary", () => {
  assert.match(
    route,
    /readHsppEvidenceForOperationalUse/
  );
});

test("predict-eta reads HSPP linkage from latest locations", () => {
  assert.match(
    route,
    /hspp_evidence_id/
  );
});

test("predict-eta preserves unlinked location behavior", () => {
  assert.match(
    route,
    /if\s*\(\s*!evidenceId\s*\)\s*\{\s*continue;/
  );
});

test("predict-eta evaluates linked HSPP evidence", () => {
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

test("predict-eta records HSPP-denied vehicle identities", () => {
  assert.match(
    route,
    /if\s*\(\s*!operationalRead\.decision\.allowed\s*\)/
  );

  assert.match(
    route,
    /deniedHsppVehicleIds\.add/
  );
});

test("predict-eta excludes denied locations from traffic center", () => {
  const centerIndex =
    route.indexOf(
      "const trafficCenter"
    );

  const centerGuardIndex =
    route.indexOf(
      "!deniedHsppVehicleIds.has",
      centerIndex
    );

  const trafficLookupIndex =
    route.indexOf(
      "buildTrafficIntelligence"
    );

  assert.notEqual(centerIndex, -1);
  assert.notEqual(centerGuardIndex, -1);
  assert.notEqual(trafficLookupIndex, -1);

  assert.ok(
    centerIndex < centerGuardIndex
  );
});

test("predict-eta skips denied vehicles before reading ETA inputs", () => {
  const denyIndex =
    route.indexOf(
      "deniedHsppVehicleIds.has(\n          trip.vehicle_id"
    );

  const speedIndex =
    route.indexOf(
      "const speed = Number(location.speed_kmh"
    );

  const etaIndex =
    route.indexOf(
      "const prediction = predictETA"
    );

  assert.notEqual(denyIndex, -1);
  assert.notEqual(speedIndex, -1);
  assert.notEqual(etaIndex, -1);

  assert.ok(
    denyIndex < speedIndex
  );

  assert.ok(
    speedIndex < etaIndex
  );
});

test("HSPP-007E preserves Predict ETA response shape", () => {
  assert.match(
    route,
    /trafficIntelligence:\s*trafficSummary/
  );

  assert.match(
    route,
    /weatherIntelligence:\s*weatherResult/
  );

  assert.match(
    route,
    /predictions,/
  );
});

test("HSPP-007E performs no database writes", () => {
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

test("HSPP-007E leaves other fleet consumers untouched", () => {
  assert.doesNotMatch(
    route,
    /api\/fleet\/live/
  );

  assert.doesNotMatch(
    route,
    /api\/fleet\/detect-risks/
  );

  assert.doesNotMatch(
    route,
    /api\/fleet\/predict-threats/
  );
});
