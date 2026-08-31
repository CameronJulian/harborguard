import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/route-safety/providers/importTomTomIncidents.ts",
    "utf8"
  );

test(
  "TomTom imports caller-owned retrieval UUID and atomic snapshot wrapper",
  () => {
    assert.match(
      source,
      /import \{ randomUUID \} from "node:crypto"/
    );

    assert.match(
      source,
      /persistRouteSafetyProviderSnapshotRetrieval/
    );

    assert.match(
      source,
      /RouteSafetyProviderSnapshotAssertionInput/
    );
  }
);

test(
  "TomTom captures one local retrieval receipt timestamp and one retrieval UUID per HTTP response",
  () => {
    assert.match(
      source,
      /const receivedAt =[\s\S]*new Date\(\)\.toISOString\(\)/
    );

    assert.match(
      source,
      /const retrievalId =[\s\S]*randomUUID\(\)/
    );

    assert.equal(
      (
        source.match(
          /\brandomUUID\s*\(/g
        ) ?? []
      ).length,
      1
    );

    const fetchIndex =
      source.indexOf(
        "const response = await fetch(url"
      );

    const receiptIndex =
      source.indexOf(
        "const receivedAt ="
      );

    const jsonIndex =
      source.indexOf(
        "const data = await response.json()"
      );

    assert.ok(fetchIndex >= 0);
    assert.ok(receiptIndex > fetchIndex);
    assert.ok(jsonIndex > receiptIndex);
  }
);

test(
  "TomTom maps TrafficModelID to native snapshot identity",
  () => {
    assert.match(
      source,
      /response\.headers[\s\S]*\.get\("TrafficModelID"\)/
    );

    assert.match(
      source,
      /snapshotIdentityKind:[\s\S]*"traffic_model_id"/
    );

    assert.match(
      source,
      /snapshotIdentityValue:[\s\S]*trafficModelId/
    );
  }
);

test(
  "TomTom keeps response Date separate from event observation time",
  () => {
    assert.match(
      source,
      /response\.headers[\s\S]*\.get\("Date"\)/
    );

    assert.match(
      source,
      /Date\.parse\([\s\S]*responseOriginatedAtCandidate/
    );

    assert.match(
      source,
      /responseOriginatedAtCandidate &&[\s\S]*Number\.isFinite\([\s\S]*responseOriginatedAtMilliseconds[\s\S]*: null/
    );

    assert.match(
      source,
      /responseOriginatedAt,/
    );
  }
);

test(
  "TomTom treats Tracking-ID as optional request provenance",
  () => {
    assert.match(
      source,
      /response\.headers[\s\S]*\.get\("Tracking-ID"\)/
    );

    assert.match(
      source,
      /providerRequestIdCandidate \|\|[\s\S]*null/
    );

    assert.match(
      source,
      /providerRequestId,/
    );
  }
);

test(
  "TomTom snapshot assertions cover every normalized incident",
  () => {
    assert.match(
      source,
      /const snapshotAssertions:[\s\S]*RouteSafetyProviderSnapshotAssertionInput\[\][\s\S]*normalizedIncidents\.map/
    );

    assert.match(
      source,
      /assertions:[\s\S]*snapshotAssertions/
    );
  }
);

test(
  "snapshot event time remains exactly the existing nullable TomTom observedAt",
  () => {
    assert.match(
      source,
      /eventObservedAt:[\s\S]*normalized\.observedAt/
    );

    assert.match(
      source,
      /typeof properties\?\.lastReportTime === "string"/
    );

    assert.doesNotMatch(
      source,
      /\bstartTime\b/
    );

    assert.doesNotMatch(
      source,
      /\bendTime\b/
    );
  }
);

test(
  "snapshot assertion payload reuses immutable v2 provider payload shape",
  () => {
    assert.match(
      source,
      /delete immutableNormalizedPayload\.verified_at/
    );

    assert.match(
      source,
      /delete immutableNormalizedPayload\.expires_at/
    );

    assert.match(
      source,
      /payloadSchemaVersion:[\s\S]*HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION_V2/
    );

    assert.match(
      source,
      /const immutableNormalizedPayload =[\s\S]*snapshotAssertion\.normalizedPayload/
    );
  }
);

test(
  "provider observation linkage is nullable then replaced with exact immutable observation id",
  () => {
    assert.match(
      source,
      /providerObservationId:[\s\S]*null/
    );

    assert.match(
      source,
      /snapshotAssertion\.providerObservationId =[\s\S]*providerObservation\.id/
    );

    assert.match(
      source,
      /snapshotAssertion\.normalizedPayload =[\s\S]*providerObservation\.normalizedPayload/
    );

    assert.match(
      source,
      /snapshotAssertion\.eventObservedAt =[\s\S]*providerObservation\.observedAt/
    );
  }
);

test(
  "missing lastReportTime still skips legacy immutable evidence without removing Route Safety row",
  () => {
    assert.match(
      source,
      /!normalized\.providerMessageId \|\|[\s\S]*!normalized\.observedAt[\s\S]*continue;/
    );

    assert.match(
      source,
      /normalizedIncidents\.map\([\s\S]*item\.row/
    );
  }
);

test(
  "missing TrafficModelID cannot fabricate snapshot provenance and does not remove mutable Route Safety path",
  () => {
    const missingIdentity =
      source.indexOf(
        "if (!trafficModelId)"
      );

    const snapshotCall =
      source.indexOf(
        "await persistRouteSafetyProviderSnapshotRetrieval({"
      );

    const routeSafety =
      source.indexOf(
        "insertNewProviderAlerts("
      );

    assert.ok(missingIdentity >= 0);
    assert.ok(snapshotCall > missingIdentity);
    assert.ok(routeSafety > snapshotCall);

    assert.match(
      source,
      /Snapshot provenance skipped because TrafficModelID was not present/
    );
  }
);

test(
  "incomplete provider incident identity skips the complete snapshot rather than writing a partial assertion set",
  () => {
    assert.match(
      source,
      /const hasCompleteSnapshotAssertionIdentity =[\s\S]*snapshotAssertions\.every/
    );

    assert.match(
      source,
      /else if \(!hasCompleteSnapshotAssertionIdentity\)/
    );

    assert.match(
      source,
      /at least one normalized incident is missing provider identity/
    );
  }
);

test(
  "TomTom performs exactly one atomic snapshot persistence call",
  () => {
    assert.equal(
      (
        source.match(
          /await\s+persistRouteSafetyProviderSnapshotRetrieval\s*\(\{/g
        ) ?? []
      ).length,
      1
    );
  }
);

test(
  "atomic snapshot persistence remains before mutable Route Safety persistence",
  () => {
    const snapshot =
      source.indexOf(
        "await persistRouteSafetyProviderSnapshotRetrieval({"
      );

    const routeSafety =
      source.indexOf(
        "insertNewProviderAlerts("
      );

    assert.ok(snapshot >= 0);
    assert.ok(routeSafety > snapshot);
  }
);

test(
  "TomTom uses canonical source identity and no provider source update timestamp",
  () => {
    assert.match(
      source,
      /provider:[\s\S]*"tomtom"[\s\S]*sourceStream:[\s\S]*"tomtom"/
    );

    assert.match(
      source,
      /providerSourceUpdatedAt:[\s\S]*null/
    );
  }
);

test(
  "TomTom forwards response provenance and caller-owned retrieval identity to the wrapper",
  () => {
    for (const marker of [
      "retrievalId,",
      "responseOriginatedAt,",
      "receivedAt,",
      "providerRequestId,",
    ]) {
      assert.ok(
        source.includes(marker),
        `Missing wrapper provenance marker: ${marker}`
      );
    }
  }
);

test(
  "TomTom verifies the RPC persisted the complete assertion count",
  () => {
    assert.match(
      source,
      /snapshotPersistence\.assertionCount !==[\s\S]*snapshotAssertions\.length/
    );

    assert.match(
      source,
      /one assertion per normalized incident/
    );
  }
);

test(
  "TomTom snapshot wiring does not directly write provenance tables",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\(\s*"route_safety_provider_snapshots"/
    );

    assert.doesNotMatch(
      source,
      /\.from\(\s*"route_safety_provider_snapshot_retrievals"/
    );

    assert.doesNotMatch(
      source,
      /\.from\(\s*"route_safety_provider_snapshot_assertions"/
    );
  }
);