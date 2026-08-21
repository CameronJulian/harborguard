import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/providers/importTomTomIncidents.ts",
  "utf8"
);

test(
  "provider observation is captured before TomTom evidence is built",
  () => {
    const observation =
      source.indexOf(
        "const providerObservation ="
      );

    const evidence =
      source.indexOf(
        "const evidence ="
      );

    assert.ok(observation >= 0);
    assert.ok(evidence > observation);
  }
);

test(
  "sealed TomTom evidence reuses immutable provider observation provenance",
  () => {
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
      assert.ok(
        source.includes(marker),
        `missing immutable provenance marker: ${marker}`
      );
    }
  }
);

test(
  "missing TomTom report provenance still skips evidence creation",
  () => {
    const guard =
      source.indexOf(
        "!normalized.providerMessageId ||"
      );

    const evidence =
      source.indexOf(
        "buildHsppEvidence({"
      );

    assert.ok(guard >= 0);
    assert.ok(evidence > guard);
  }
);

test(
  "road context enrichment remains after TomTom evidence sealing",
  () => {
    const evidence =
      source.indexOf(
        "persistHsppEvidenceForProviderObservation({"
      );

    const roadContext =
      source.indexOf(
        "enrichRouteSafetyAlertsWithRoadContext("
      );

    assert.ok(evidence >= 0);
    assert.ok(roadContext > evidence);
  }
);

test(
  "TomTom evidence sealing remains before assessment",
  () => {
    const evidence =
      source.indexOf(
        "persistHsppEvidenceForProviderObservation({"
      );

    const verification =
      source.indexOf(
        "verifyHsppEvidenceIntegrity({"
      );

    assert.ok(evidence >= 0);
    assert.ok(verification > evidence);
  }
);
