import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/providers/importHereIncidents.ts",
  "utf8"
);

test("provider observation is resolved before evidence is built", () => {
  const resolution =
    source.indexOf("const resolvedProviderObservation =");
  const assignment =
    source.indexOf("providerObservation =");
  const evidence =
    source.indexOf("const evidence =");

  assert.ok(resolution >= 0);
  assert.ok(assignment > resolution);
  assert.ok(evidence > assignment);
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

test("missing HERE provenance is guarded before observation batching and evidence creation", () => {
  const guard =
    source.indexOf("!normalized.providerMessageId");
  const batchInput =
    source.indexOf("providerObservationBatchInputs.push({");
  const resolution =
    source.indexOf("const resolvedProviderObservation =");
  const evidence =
    source.indexOf("const evidence =");

  assert.ok(guard >= 0);
  assert.ok(batchInput > guard);
  assert.ok(resolution > batchInput);
  assert.ok(evidence > resolution);
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
