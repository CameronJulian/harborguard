import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test("route safety threat consumes existing source provenance", () => {
  assert.match(source, /source\?: string \| null;/);
});

test("community trust context is operator-only", () => {
  const marker = source.indexOf(
    'className="hg-community-hazard-trust"',
  );

  assert.ok(marker >= 0);

  const block = source.slice(
    Math.max(0, marker - 900),
    marker + 1000,
  );

  assert.match(
    block,
    /activeRouteSafetyWarning\.threat\.source\s*===\s*"operator"/,
  );

  assert.match(block, /routeSafetyAlertId/);
  assert.match(block, /verificationCount/);
  assert.match(block, /Community report/);
});

test("community freshness is operator-only", () => {
  const marker = source.indexOf(
    'className="hg-community-hazard-freshness"',
  );

  assert.ok(marker >= 0);

  const block = source.slice(
    Math.max(0, marker - 900),
    marker + 800,
  );

  assert.match(
    block,
    /activeRouteSafetyWarning\.threat\.source\s*===\s*"operator"/,
  );

  assert.match(
    block,
    /communityHazardFreshnessLabel/,
  );
});

test("community confirmation controls are operator-only", () => {
  const marker = source.indexOf(
    'className="hg-hazard-confirmation"',
  );

  assert.ok(marker >= 0);

  const block = source.slice(
    Math.max(0, marker - 900),
    marker + 7000,
  );

  assert.match(
    block,
    /activeRouteSafetyWarning\.threat\.source\s*===\s*"operator"/,
  );

  assert.match(block, /Still there/);
  assert.match(block, /No longer there/);
});

test("exact operator provenance predicate is used three times", () => {
  const matches = source.match(
    /activeRouteSafetyWarning\.threat\.source\s*===\s*"operator"/g,
  ) ?? [];

  assert.equal(matches.length, 3);
});

test("provider sources are never used as community predicates", () => {
  assert.doesNotMatch(
    source,
    /threat\.source\s*===\s*"here_traffic"/,
  );

  assert.doesNotMatch(
    source,
    /threat\.source\s*===\s*"tomtom"/,
  );

  assert.doesNotMatch(
    source,
    /threat\.source\s*===\s*"azure_maps_traffic"/,
  );

  assert.doesNotMatch(
    source,
    /threat\.source\s*===\s*"fleet_telemetry"/,
  );

  assert.doesNotMatch(
    source,
    /threat\.source\s*===\s*"road_risk_segments"/,
  );
});
