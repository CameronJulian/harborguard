import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/route-safety/providers/importTomTomIncidents.ts",
  "utf8"
);

test(
  "TomTom seals persisted provider observations into HSPP evidence",
  () => {
    assert.match(
      source,
      /const providerObservation =[\s\S]*persistRouteSafetyProviderObservation/
    );

    assert.match(
      source,
      /const evidence =[\s\S]*buildHsppEvidence/
    );

    assert.match(
      source,
      /persistHsppEvidenceForProviderObservation/
    );
  }
);

test(
  "TomTom evidence uses external intelligence source class",
  () => {
    assert.match(
      source,
      /sourceClass:\s*"external_intelligence"/
    );
  }
);

test(
  "TomTom evidence source identity comes from persisted observation",
  () => {
    assert.match(
      source,
      /sourceProvider:\s*providerObservation\.provider/
    );

    assert.match(
      source,
      /sourceStream:\s*providerObservation\.sourceStream/
    );

    assert.match(
      source,
      /sourceMessageId:\s*providerObservation\.providerMessageId/
    );
  }
);

test(
  "TomTom evidence uses persisted timestamps schema and payload",
  () => {
    assert.match(
      source,
      /observedAt:\s*providerObservation\.observedAt/
    );

    assert.match(
      source,
      /receivedAt:\s*providerObservation\.receivedAt/
    );

    assert.match(
      source,
      /payloadSchemaVersion:\s*providerObservation\.payloadSchemaVersion/
    );

    assert.match(
      source,
      /normalizedPayload:\s*providerObservation\.normalizedPayload/
    );
  }
);

test(
  "TomTom evidence links to exact provider observation",
  () => {
    assert.match(
      source,
      /providerObservationId:\s*providerObservation\.id/
    );
  }
);

test(
  "TomTom provider observation persistence precedes evidence sealing",
  () => {
    const observation =
      source.indexOf(
        "persistRouteSafetyProviderObservation({"
      );

    const evidence =
      source.indexOf(
        "persistHsppEvidenceForProviderObservation({"
      );

    assert.ok(observation >= 0);
    assert.ok(evidence > observation);
  }
);

test(
  "TomTom evidence sealing precedes mutable Route Safety persistence",
  () => {
    const evidence =
      source.indexOf(
        "persistHsppEvidenceForProviderObservation({"
      );

    const projection =
      source.indexOf(
        "insertNewProviderAlerts("
      );

    assert.ok(evidence >= 0);
    assert.ok(projection > evidence);
  }
);

test(
  "missing TomTom immutable provenance still skips evidence creation",
  () => {
    assert.match(
      source,
      /!normalized\.providerMessageId \|\|[\s\S]*!normalized\.observedAt[\s\S]*continue;/
    );
  }
);

test(
  "B10B2 evidence boundary remains before Route Safety assessment",
  () => {
    const evidence =
      source.indexOf(
        "persistHsppEvidenceForProviderObservation({"
      );

    const upsert =
      source.indexOf(
        "insertNewProviderAlerts("
      );

    const assessment =
      source.indexOf(
        "assessHsppExternalIntelligenceEvidence({"
      );

    assert.ok(evidence >= 0);
    assert.ok(upsert > evidence);
    assert.ok(assessment > upsert);

    assert.doesNotMatch(
      source,
      /crowdEligible:\s*true/
    );

    assert.doesNotMatch(
      source,
      /trainingEligible:\s*true/
    );
  }
);
