import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

function predictionPublicationBlock() {
  const marker =
    "const nextRouteSafetyThreats =";

  const start = source.indexOf(marker);
  assert.ok(start >= 0);

  const end = source.indexOf(
    "const trafficRiskLevel =",
    start,
  );

  assert.ok(end > start);

  return source.slice(start, end);
}

test("prediction publication excludes locally resolved live alerts", () => {
  const block = predictionPublicationBlock();

  assert.match(
    block,
    /result\.threats\.filter\(/,
  );

  assert.match(
    block,
    /threat\.routeSafetyAlertId\?\.trim\(\)/,
  );

  assert.match(
    block,
    /resolvedHazardAlertIdsRef\.current\.has\(/,
  );
});

test("threats without live alert identity remain eligible", () => {
  const block = predictionPublicationBlock();

  assert.match(
    block,
    /!alertId \|\|/,
  );
});

test("successful resolution records identity before local threat removal", () => {
  const addIndex = source.indexOf(
    "resolvedHazardAlertIdsRef.current.add("
  );

  const removalIndex = source.indexOf(
    "setActiveRouteSafetyThreats(",
    addIndex,
  );

  assert.ok(addIndex >= 0);
  assert.ok(removalIndex > addIndex);
});

test("resolution still cancels stale safer-route offer", () => {
  assert.match(
    source,
    /setSaferRouteOffer\(null\)/,
  );
});

test("prediction generation ownership remains intact", () => {
  assert.match(
    source,
    /requestId !==\s*activeRouteSafetyThreatRequestIdRef\.current/,
  );
});
