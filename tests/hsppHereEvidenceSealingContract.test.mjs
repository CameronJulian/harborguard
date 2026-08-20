import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/providers/importHereIncidents.ts",
  "utf8"
);

test("HERE seals persisted provider observations into HSPP evidence", () => {
  assert.match(source, /buildHsppEvidence/);
  assert.match(source, /persistHsppEvidenceForProviderObservation/);
});

test("HERE evidence uses external intelligence source class", () => {
  assert.match(
    source,
    /sourceClass:\s*[\r\n\s]*"external_intelligence"/
  );
});

test("HERE evidence source identity comes from persisted observation", () => {
  assert.match(source, /providerObservation\.provider/);
  assert.match(source, /providerObservation\.sourceStream/);
  assert.match(source, /providerObservation\.providerMessageId/);
});

test("HERE evidence uses persisted timestamps schema and payload", () => {
  assert.match(source, /providerObservation\.observedAt/);
  assert.match(source, /providerObservation\.receivedAt/);
  assert.match(source, /providerObservation\.payloadSchemaVersion/);
  assert.match(source, /providerObservation\.normalizedPayload/);
});

test("HERE evidence links to the exact provider observation", () => {
  assert.match(
    source,
    /providerObservationId:\s*[\r\n\s]*providerObservation\.id/
  );
});

test("provider observation persistence precedes evidence sealing", () => {
  const observation =
    source.indexOf("persistRouteSafetyProviderObservation({");
  const evidence =
    source.indexOf("persistHsppEvidenceForProviderObservation({");

  assert.ok(observation >= 0);
  assert.ok(evidence > observation);
});

test("evidence sealing precedes mutable Route Safety persistence", () => {
  const evidence =
    source.indexOf("persistHsppEvidenceForProviderObservation({");
  const projection =
    source.indexOf("insertNewProviderAlerts(");

  assert.ok(evidence >= 0);
  assert.ok(projection > evidence);
});

test("B8B does not assess or promote evidence", () => {
  assert.doesNotMatch(
    source,
    /await\s+assessHsppExternalIntelligenceEvidence\s*\(/
  );
  assert.doesNotMatch(source, /applyHsppAssessmentDecision/);
  assert.doesNotMatch(source, /crowdEligible:\s*true/);
  assert.doesNotMatch(source, /trainingEligible:\s*true/);
});
