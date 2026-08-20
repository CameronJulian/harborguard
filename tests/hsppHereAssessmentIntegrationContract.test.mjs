import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/providers/importHereIncidents.ts",
  "utf8"
);

test("HERE retains assessment context by normalized input index", () => {
  assert.match(source, /hsppAssessmentContexts/);
  assert.match(source, /normalizedIncidents\.length/);
  assert.match(source, /normalizedIncidents\[inputIndex\]/);
});

test("missing immutable HERE identity leaves assessment context empty", () => {
  assert.match(
    source,
    /!normalized\.providerMessageId \|\|[\s\S]*!normalized\.observedAt[\s\S]*continue;/
  );
});

test("HERE retains provider evidence persistence result", () => {
  assert.match(
    source,
    /const persistedEvidence =[\s\S]*persistHsppEvidenceForProviderObservation/
  );
  assert.match(source, /persistedEvidence\.id/);
  assert.match(
    source,
    /persistedEvidence[\s\S]*integrityFingerprint/
  );
});

test("HERE requires one upsert resolution per enriched input row", () => {
  assert.match(
    source,
    /result\.resolutions\.length !==[\s\S]*rows\.length/
  );
});

test("HERE consumes authoritative upsert resolution by input index", () => {
  assert.match(source, /result\.resolutions\[inputIndex\]/);
  assert.match(source, /resolution\.inputIndex !== inputIndex/);
});

test("HERE preserves canonical 48-hour freshness boundary", () => {
  assert.match(
    source,
    /HSPP_PROVIDER_FRESHNESS_HOURS = 48/
  );
  assert.match(
    source,
    /Date\.now\(\)[\s\S]*HSPP_PROVIDER_FRESHNESS_HOURS[\s\S]*60 \* 60 \* 1000/
  );
});

test("HERE assessment consumes authoritative provider quality", () => {
  assert.match(source, /resolution\.providerSources/);
  assert.match(source, /resolution[\s\S]*providerConfirmationCount/);
  assert.match(source, /resolution\.providerConfidence/);
  assert.match(source, /resolution\.providerLastSeen/);
});

test("HERE verifies then assesses then persists decision", () => {
  const verify =
    source.indexOf("verifyHsppEvidenceIntegrity({");

  const assess =
    source.indexOf("assessHsppExternalIntelligenceEvidence({");

  const apply =
    source.indexOf("applyHsppAssessmentDecision({");

  assert.ok(verify >= 0);
  assert.ok(assess > verify);
  assert.ok(apply > assess);
});

test("B9B2 does not introduce TomTom coupling", () => {
  assert.doesNotMatch(source, /tomtom_traffic/);
});
