import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

function comparatorSource() {
  const start = source.indexOf(
    "function compareActiveRouteSafetyWarnings("
  );

  const end = source.indexOf(
    "function trafficCalmingAwarenessLabel(",
    start,
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  return source.slice(start, end);
}

test("active warning selection uses an explicit comparator", () => {
  assert.match(
    source,
    /function compareActiveRouteSafetyWarnings\(/,
  );

  assert.match(
    source,
    /\.sort\(compareActiveRouteSafetyWarnings\)/,
  );
});

test("threats more than 50 metres apart remain distance-first", () => {
  const comparator = comparatorSource();

  assert.match(
    comparator,
    /Math\.abs\(distanceDifference\) > 50/,
  );

  assert.match(
    comparator,
    /return distanceDifference;/,
  );
});

test("threats within the decision window remain score-first", () => {
  const comparator = comparatorSource();

  assert.match(
    comparator,
    /Number\(second\.threat\.score \|\| 0\)/,
  );

  assert.match(
    comparator,
    /Number\(first\.threat\.score \|\| 0\)/,
  );

  assert.match(
    comparator,
    /if \(scoreDifference !== 0\)/,
  );
});

test("equal scores use exact distance as deterministic tie breaker", () => {
  const comparator = comparatorSource();

  assert.match(
    comparator,
    /if \(distanceDifference !== 0\)/,
  );
});

test("exact ties use stable threat identity", () => {
  const comparator = comparatorSource();

  assert.match(
    comparator,
    /activeRouteSafetyVoiceKey\(first\)/,
  );

  assert.match(
    comparator,
    /activeRouteSafetyVoiceKey\(second\)/,
  );
});

test("priority does not invent provenance weighting", () => {
  const comparator = comparatorSource();

  assert.doesNotMatch(comparator, /here_traffic/);
  assert.doesNotMatch(comparator, /tomtom/);
  assert.doesNotMatch(comparator, /azure_maps_traffic/);
  assert.doesNotMatch(comparator, /road_risk_segments/);
  assert.doesNotMatch(comparator, /fleet_telemetry/);
  assert.doesNotMatch(comparator, /operator/);
  assert.doesNotMatch(comparator, /verificationCount/);
  assert.doesNotMatch(comparator, /freshness/);
  assert.doesNotMatch(comparator, /confidence/);
});
