import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/providers/importHereIncidents.ts",
  "utf8"
);

test("provider observation is captured before evidence is built", () => {
  const observation = source.indexOf("const providerObservation =");
  const evidence = source.indexOf("const evidence =");
  assert.ok(observation >= 0);
  assert.ok(evidence > observation);
});

test("sealed evidence reuses immutable provider observation provenance", () => {
  for (const marker of [
    "providerObservation.provider",
    "providerObservation.sourceStream",
    "providerObservation.providerMessageId",
    "providerObservation.observedAt",
    "providerObservation.receivedAt",
    "providerObservation.payloadSchemaVersion",
    "providerObservation.normalizedPayload",
    "providerObservation.id",
  ]) {
    assert.ok(source.includes(marker), marker);
  }
});

test("missing HERE provenance still skips evidence creation", () => {
  const guard = source.indexOf("!normalized.providerMessageId");
  const observation = source.indexOf("const providerObservation =");
  assert.ok(guard >= 0);
  assert.ok(observation > guard);
});

test("road context enrichment remains after evidence sealing", () => {
  const evidence =
    source.indexOf("persistHsppEvidenceForProviderObservation({");
  const enrichment =
    source.indexOf("enrichRouteSafetyAlertsWithRoadContext(");
  assert.ok(evidence >= 0);
  assert.ok(enrichment > evidence);
});

test("TomTom remains outside HERE evidence sealing", () => {
  assert.doesNotMatch(source, /importTomTomIncidents/);
});
