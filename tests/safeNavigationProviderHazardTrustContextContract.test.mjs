import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test("live provider classifier uses only canonical provider sources", () => {
  assert.match(source, /function isLiveProviderRouteSafetySource\(/);
  assert.match(source, /source === "here_traffic"/);
  assert.match(source, /source === "tomtom"/);
  assert.match(source, /source === "azure_maps_traffic"/);
});

test("provider trust context uses customer-facing road intelligence wording", () => {
  assert.match(source, /className="hg-provider-hazard-trust"/);
  assert.match(source, /aria-label="Live road intelligence source"/);
  assert.match(
    source,
    /function providerHazardTrustLabel\(/,
  );

  assert.match(
    source,
    /\? "Live road intelligence"/,
  );

  assert.match(
    source,
    /: "Road intelligence"/,
  );

  assert.match(
    source,
    /activeRouteSafetyWarning\.threat\.freshness/,
  );
});

test("provider hazard freshness reuses existing truthful Updated wording", () => {
  assert.match(source, /function providerHazardFreshnessLabel\(/);
  assert.match(source, /communityHazardFreshnessLabel\(/);
  assert.match(source, /className="hg-provider-hazard-freshness"/);
  assert.match(source, /activeRouteSafetyWarning\.threat\.createdAt/);
});

test("provider presentation does not expose provider brands to drivers", () => {
  const marker = source.indexOf(
    'className="hg-provider-hazard-trust"',
  );
  assert.ok(marker >= 0);
  const block = source.slice(
    Math.max(0, marker - 900),
    marker + 2500,
  );
  assert.doesNotMatch(block, />\s*HERE\s*</);
  assert.doesNotMatch(block, />\s*TomTom\s*</);
  assert.doesNotMatch(block, />\s*Azure\s*</);
});

test("historical and fleet sources are excluded from live-provider classifier", () => {
  const helperStart = source.indexOf(
    "function isLiveProviderRouteSafetySource("
  );
  assert.ok(helperStart >= 0);
  const helper = source.slice(helperStart, helperStart + 700);
  assert.doesNotMatch(helper, /fleet_telemetry/);
  assert.doesNotMatch(helper, /road_risk_segments/);
  assert.doesNotMatch(helper, /operator/);
});

test("community verification controls remain operator-only", () => {
  const matches = source.match(
    /activeRouteSafetyWarning\.threat\.source\s*===\s*"operator"/g,
  ) ?? [];
  assert.equal(matches.length, 3);
  assert.match(source, /Still there/);
  assert.match(source, /No longer there/);
});
