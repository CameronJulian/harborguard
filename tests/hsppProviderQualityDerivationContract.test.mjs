import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/deriveProviderQualityState.ts",
  "utf8"
);

test("provider quality derivation is a pure exported primitive", () => {
  assert.match(source, /export function deriveProviderQualityState/);
  assert.doesNotMatch(source, /supabase/);
  assert.doesNotMatch(source, /Date\.now/);
});

test("provider quality exposes the canonical four-field state", () => {
  assert.match(source, /providerSources: string\[\]/);
  assert.match(source, /providerLastSeen: Record<string, string>/);
  assert.match(source, /providerConfirmationCount: number/);
  assert.match(source, /providerConfidence: number/);
});

test("zero-provider state is canonical zero state", () => {
  assert.match(source, /providerConfirmationCount: 0/);
  assert.match(source, /providerConfidence: 0/);
});

test("single-provider confidence uses source configuration", () => {
  assert.match(
    source,
    /providerConfirmationCount === 1[\s\S]*baseConfidence/
  );
});

test("cross-provider confidence preserves Route Safety formula", () => {
  assert.match(source, /Math\.min\(/);
  assert.match(source, /60 \+/);
  assert.match(source, /providerConfirmationCount - 1/);
});

test("freshness is caller supplied rather than clock coupled", () => {
  assert.match(source, /staleBefore\?: string/);
  assert.doesNotMatch(source, /48\s*\*\s*60/);
});

test("B9A1 remains independent of HERE TomTom and HSPP assessment", () => {
  assert.doesNotMatch(source, /here_traffic/);
  assert.doesNotMatch(source, /tomtom/);
  assert.doesNotMatch(source, /assessHsppExternalIntelligenceEvidence/);
});
