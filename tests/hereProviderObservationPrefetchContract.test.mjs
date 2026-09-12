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
  "HERE performs provider observation prefetch and batching before its sequential evidence loop",
  () => {
    const prefetchIndex =
      hereSource.indexOf(
        "await prefetchRouteSafetyProviderObservations({"
      );

    const batchIndex =
      hereSource.indexOf(
        "await persistRouteSafetyProviderObservationsBatch({"
      );

    const loopMatch =
      /for\s*\(\s*let\s+inputIndex\s*=\s*0\s*;[\s\S]*?inputIndex\s*<\s*normalizedIncidents\.length\s*;[\s\S]*?inputIndex\s*\+=\s*1\s*\)/.exec(
        hereSource
      );

    const loopIndex =
      loopMatch?.index ?? -1;

    assert.ok(prefetchIndex >= 0);
    assert.ok(batchIndex > prefetchIndex);
    assert.ok(loopIndex > batchIndex);
  }
);

test(
  "HERE batches non-prefetched provider observation identities",
  () => {
    assert.match(
      hereSource,
      /await\s+persistRouteSafetyProviderObservationsBatch\s*\(\s*\{/
    );

    assert.doesNotMatch(
      hereSource,
      /await\s+persistRouteSafetyProviderObservation\s*\(/
    );
  }
);

test(
  "HERE still seals evidence after provider observation resolution",
  () => {
    const observationIndex =
      hereSource.indexOf(
        "const resolvedProviderObservations"
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