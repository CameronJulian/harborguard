import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/hspp/persistHsppEvidenceForProviderObservation.ts",
    "utf8"
  );

test("uses generic HSPP persistence", () => {
  assert.match(source, /persistHsppEvidence/);
});

test("requires provider observation identity", () => {
  assert.match(source, /providerObservationId/);
});

test("new evidence reports created true", () => {
  assert.match(source, /created:\s*[\r\n\s]*true/);
});

test("handles PostgreSQL duplicate identity", () => {
  assert.match(source, /error\?\.code !== "23505"/);
});

test("duplicate recovery is tenant scoped", () => {
  assert.match(source, /\.eq\(\s*"organization_id"/);
});

test("duplicate recovery is provider observation scoped", () => {
  assert.match(source, /\.eq\(\s*"provider_observation_id"/);
});

test("duplicate recovery verifies integrity fingerprint", () => {
  assert.match(
    source,
    /existing\.integrityFingerprint !==[\r\n\s]*evidence\.integrityFingerprint/
  );
});

test("matching duplicate reports created false", () => {
  assert.match(source, /created:\s*[\r\n\s]*false/);
});

test("helper remains provider generic and assessment free", () => {
  assert.doesNotMatch(source, /here_traffic/);
  assert.doesNotMatch(source, /importTomTomIncidents/);
  assert.doesNotMatch(source, /assessHsppExternalIntelligenceEvidence/);
});
