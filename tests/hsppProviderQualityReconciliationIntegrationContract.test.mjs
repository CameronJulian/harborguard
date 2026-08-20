import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/providers/reconcileProviderObservations.ts",
  "utf8"
);

test("reconciliation consumes centralized provider-quality derivation", () => {
  assert.match(source, /deriveProviderQualityState/);

  const calls =
    source.match(/deriveProviderQualityState\(\{/g) || [];

  assert.equal(calls.length, 1);
});

test("reconciliation keeps its 48-hour default freshness policy", () => {
  assert.match(
    source,
    /staleThresholdHours = 48/
  );

  assert.match(
    source,
    /Date\.now\(\) - staleThresholdHours \* 60 \* 60 \* 1000/
  );
});

test("all-providers-stale lifecycle expiration remains separate", () => {
  assert.match(
    source,
    /staleCount === providerTimestamps\.length/
  );

  assert.match(
    source,
    /status: "expired"/
  );
});

test("partial reconciliation passes the surviving active provider set", () => {
  assert.match(
    source,
    /providerSources:\s*[\r\n\s]*freshProviderSources/
  );
});

test("partial reconciliation preserves the existing fresh last-seen projection", () => {
  assert.match(
    source,
    /providerLastSeen:\s*[\r\n\s]*freshProviderLastSeen/
  );

  assert.match(
    source,
    /providerLastSeen:\s*freshProviderLastSeen/
  );
});

test("reconciliation no longer owns corroboration confidence calculation", () => {
  assert.doesNotMatch(
    source,
    /providerConfirmationCount === 1[\s\S]*Math\.min\(/
  );
});

test("B9A2d does not introduce HSPP assessment behavior", () => {
  assert.doesNotMatch(
    source,
    /assessHsppExternalIntelligenceEvidence/
  );

  assert.doesNotMatch(
    source,
    /applyHsppAssessmentDecision/
  );
});
