import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const observationSource = fs.readFileSync(
  "lib/hspp/persistRouteSafetyProviderObservation.ts",
  "utf8"
);

const hereSource = fs.readFileSync(
  "lib/route-safety/providers/importHereIncidents.ts",
  "utf8"
);

test(
  "provider observation module exposes one batch prefetch helper",
  () => {
    assert.match(
      observationSource,
      /export async function prefetchRouteSafetyProviderObservations/
    );

    assert.match(
      observationSource,
      /\.in\(\s*"provider_message_id"/
    );
  }
);

test(
  "prefetch remains tenant provider stream and schema scoped",
  () => {
    assert.match(
      observationSource,
      /\.eq\(\s*"organization_id",\s*normalizedOrganizationId\s*\)/
    );

    assert.match(
      observationSource,
      /\.eq\(\s*"provider",\s*normalizedProvider\s*\)/
    );

    assert.match(
      observationSource,
      /\.eq\(\s*"source_stream",\s*normalizedSourceStream\s*\)/
    );

    assert.match(
      observationSource,
      /\.eq\(\s*"payload_schema_version",\s*normalizedPayloadSchemaVersion\s*\)/
    );
  }
);

test(
  "prefetched observations reuse the existing immutable validator",
  () => {
    const prefetchStart =
      observationSource.indexOf(
        "export async function prefetchRouteSafetyProviderObservations"
      );

    const persistStart =
      observationSource.indexOf(
        "export async function persistRouteSafetyProviderObservation"
      );

    const prefetchRegion =
      observationSource.slice(
        prefetchStart,
        persistStart
      );

    assert.match(
      prefetchRegion,
      /mapPersistedObservation/
    );

    assert.match(
      prefetchRegion,
      /assertExistingObservationMatches/
    );
  }
);

test(
  "HERE performs prefetch before its sequential evidence loop",
  () => {
    const prefetchIndex =
      hereSource.indexOf(
        "await prefetchRouteSafetyProviderObservations({"
      );

    const loopIndex =
      hereSource.indexOf(
        "for (\n      let inputIndex = 0;"
      );

    assert.ok(prefetchIndex >= 0);
    assert.ok(loopIndex > prefetchIndex);
  }
);

test(
  "HERE falls back to normal persistence for non-prefetched identities",
  () => {
    assert.match(
      hereSource,
      /prefetchedProviderObservations\.get\([\s\S]*?\)\s*\?\?[\s\S]*?await persistRouteSafetyProviderObservation\(/
    );
  }
);

test(
  "HERE still seals evidence after provider observation resolution",
  () => {
    const observationIndex =
      hereSource.indexOf(
        "prefetchedProviderObservations.get("
      );

    const evidenceIndex =
      hereSource.indexOf(
        "persistHsppEvidenceForProviderObservation({"
      );

    assert.ok(observationIndex >= 0);
    assert.ok(evidenceIndex > observationIndex);
  }
);

test(
  "prefetch optimization introduces no Promise concurrency",
  () => {
    assert.doesNotMatch(
      observationSource,
      /Promise\.all\s*\(/
    );

    assert.doesNotMatch(
      hereSource,
      /Promise\.all\s*\(/
    );

    assert.doesNotMatch(
      hereSource,
      /Promise\.allSettled\s*\(/
    );
  }
);