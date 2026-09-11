import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL(
    "../lib/route-safety/providers/importHereIncidents.ts",
    import.meta.url
  ),
  "utf8"
);

test("HERE captures sourceUpdated as snapshot provenance", () => {
  assert.match(source, /data\?\.sourceUpdated/);
  assert.match(source, /snapshotIdentityKind:\s*"source_updated"/);
  assert.match(source, /snapshotIdentityValue:\s*sourceUpdatedCandidate/);
  assert.match(source, /providerSourceUpdatedAt:\s*sourceUpdatedAt/);
});

test("HERE captures retrieval provenance separately from incident identity", () => {
  assert.match(source, /randomUUID\(\)/);
  assert.match(source, /\.get\("X-Request-Id"\)/);
  assert.match(source, /\.get\("Date"\)/);
  assert.match(source, /providerRequestId/);
  assert.match(source, /responseOriginatedAt/);
});

test("HERE builds one snapshot assertion per normalized incident", () => {
  assert.match(
    source,
    /const\s+snapshotAssertions:[\s\S]*normalizedIncidents\.map/
  );
  assert.match(
    source,
    /providerMessageId:[\s\S]*normalized\.providerMessageId/
  );
  assert.match(
    source,
    /eventObservedAt:[\s\S]*normalized\.observedAt/
  );
  assert.match(
    source,
    /providerObservationId:[\s\S]*null/
  );
});

test("HERE links persisted observations back to snapshot assertions", () => {
  assert.match(
    source,
    /snapshotAssertion\.providerObservationId\s*=[\s\S]*providerObservation\.id/
  );
  assert.match(
    source,
    /snapshotAssertion\.eventObservedAt\s*=[\s\S]*providerObservation\.observedAt/
  );
  assert.match(
    source,
    /snapshotAssertion\.normalizedPayload\s*=[\s\S]*providerObservation\.normalizedPayload/
  );
});

test("HERE snapshot payload excludes mutable lifecycle fields", () => {
  assert.match(
    source,
    /delete\s+immutableSnapshotPayload\.verified_at/
  );
  assert.match(
    source,
    /delete\s+immutableSnapshotPayload\.expires_at/
  );
});

test("HERE skips snapshot provenance when sourceUpdated is missing or invalid", () => {
  assert.match(source, /if\s*\(\s*!sourceUpdatedAt\s*\)/);
  assert.match(
    source,
    /Snapshot provenance skipped because sourceUpdated was not present or invalid/
  );
});

test("HERE persists snapshot assertions atomically through the existing wrapper", () => {
  assert.match(
    source,
    /persistRouteSafetyProviderSnapshotRetrieval\s*\(/
  );
  assert.match(
    source,
    /assertions:\s*snapshotAssertions/
  );
  assert.match(
    source,
    /snapshotPersistence\.assertionCount\s*!==[\s\S]*snapshotAssertions\.length/
  );
});

test("HERE provider observation identity remains unchanged by snapshot wiring", () => {
  assert.match(
    source,
    /providerMessageId:[\s\S]*normalized\.providerMessageId/
  );
  assert.match(
    source,
    /observedAt:[\s\S]*normalized\.observedAt/
  );
});