import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/upsertRouteSafetyAlerts.ts",
  "utf8"
);

test("Route Safety upsert consumes centralized provider-quality derivation", () => {
  assert.match(
    source,
    /deriveProviderQualityState/
  );

  const calls =
    source.match(/deriveProviderQualityState\(\{/g) || [];

  assert.equal(calls.length, 3);
});

test("same-provider refresh preserves one active provider", () => {
  assert.match(
    source,
    /providerSources:\s*\[source\][\s\S]*primarySource:\s*source/
  );
});

test("cross-provider merge passes its explicit active provider set", () => {
  assert.match(
    source,
    /providerSources:\s*[\r\n\s]*requestedProviderSources/
  );
});

test("new alerts derive their provider quality centrally", () => {
  assert.match(
    source,
    /providerLastSeen:\s*\{[\r\n\s]*\[source\]: confirmedAt/
  );
});

test("upsert no longer owns the corroboration-confidence formula", () => {
  assert.doesNotMatch(
    source,
    /60 \+ Math\.max\(0, providerConfirmationCount - 1\) \* 20/
  );
});

test("B9A2c does not introduce freshness policy into upsert", () => {
  assert.doesNotMatch(
    source,
    /staleBefore:/
  );
});

test("B9A2c remains outside HSPP assessment", () => {
  assert.doesNotMatch(
    source,
    /assessHsppExternalIntelligenceEvidence/
  );

  assert.doesNotMatch(
    source,
    /applyHsppAssessmentDecision/
  );
});
