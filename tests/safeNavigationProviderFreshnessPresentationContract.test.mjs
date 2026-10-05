import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "app/safe-navigation/page.tsx",
  "utf8",
);

test("Safe Navigation consumes backend threat freshness", () => {
  assert.match(
    source,
    /freshness\?: "fresh" \| "needs_verification" \| "stale" \| null;/,
  );

  assert.match(
    source,
    /activeRouteSafetyWarning\.threat\.freshness/,
  );
});

test("only explicitly fresh provider evidence is described as live", () => {
  assert.match(
    source,
    /function providerHazardTrustLabel\(/,
  );

  assert.match(
    source,
    /freshness === "fresh"/,
  );

  assert.match(
    source,
    /\? "Live road intelligence"/,
  );
});

test("provider evidence needing verification uses weaker wording", () => {
  assert.match(
    source,
    /: "Road intelligence"/,
  );
});

test("provider age remains visible through existing freshness label", () => {
  assert.match(
    source,
    /className="hg-provider-hazard-freshness"/,
  );

  assert.match(
    source,
    /providerHazardFreshnessLabel\(/,
  );

  assert.match(
    source,
    /activeRouteSafetyWarning\.threat\.createdAt/,
  );
});

test("Safe Navigation does not duplicate backend stale suppression", () => {
  assert.doesNotMatch(
    source,
    /activeRouteSafetyWarning\.threat\.freshness\s*===\s*"stale"/,
  );

  assert.doesNotMatch(
    source,
    /activeRouteSafetyWarning\.threat\.freshness\s*!==\s*"stale"/,
  );
});

test("provider and community provenance boundaries remain intact", () => {
  assert.match(source, /source === "here_traffic"/);
  assert.match(source, /source === "tomtom"/);
  assert.match(source, /source === "azure_maps_traffic"/);

  const operatorMatches = source.match(
    /activeRouteSafetyWarning\.threat\.source\s*===\s*"operator"/g,
  ) ?? [];

  assert.equal(operatorMatches.length, 3);
});
