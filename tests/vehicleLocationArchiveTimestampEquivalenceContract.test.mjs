import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    new URL(
      "../lib/fleet/assessVehicleLocationArchivePruningEligibility.ts",
      import.meta.url
    ),
    "utf8"
  );


function normalizeTimestamp(
  value
) {
  const timestamp =
    Date.parse(value);

  if (
    !Number.isFinite(
      timestamp
    )
  ) {
    return null;
  }

  return new Date(
    timestamp
  ).toISOString();
}


test(
  "UTC Z and plus-00:00 representations are equivalent",
  () => {
    assert.equal(
      normalizeTimestamp(
        "2026-04-19T14:38:18.269Z"
      ),
      normalizeTimestamp(
        "2026-04-19T14:38:18.269+00:00"
      )
    );
  }
);


test(
  "different offsets representing the same instant are equivalent",
  () => {
    assert.equal(
      normalizeTimestamp(
        "2026-04-19T16:38:18.269+02:00"
      ),
      normalizeTimestamp(
        "2026-04-19T14:38:18.269Z"
      )
    );
  }
);


test(
  "different instants remain different",
  () => {
    assert.notEqual(
      normalizeTimestamp(
        "2026-04-19T14:38:18.269Z"
      ),
      normalizeTimestamp(
        "2026-04-19T14:38:19.269Z"
      )
    );
  }
);


test(
  "invalid timestamps fail closed",
  () => {
    assert.equal(
      normalizeTimestamp(
        "not-a-timestamp"
      ),
      null
    );
  }
);


test(
  "eligibility source normalizes all four timestamp values",
  () => {
    assert.match(
      source,
      /function normalizeArchiveComparisonTimestamp/
    );

    assert.match(
      source,
      /Date\.parse\(value\)/
    );

    assert.match(
      source,
      /new Date\([\s\S]*timestamp[\s\S]*\)\.toISOString\(\)/
    );

    for (const required of [
      "normalizedPreparedFirstRecordedAt",
      "normalizedManifestFirstRecordedAt",
      "normalizedPreparedLastRecordedAt",
      "normalizedManifestLastRecordedAt",
    ]) {
      assert.equal(
        source.includes(required),
        true,
        `missing normalized timestamp: ${required}`
      );
    }
  }
);


test(
  "eligibility fails closed when any timestamp cannot be normalized",
  () => {
    assert.match(
      source,
      /normalizedPreparedFirstRecordedAt === null/
    );

    assert.match(
      source,
      /normalizedManifestFirstRecordedAt === null/
    );

    assert.match(
      source,
      /normalizedPreparedLastRecordedAt === null/
    );

    assert.match(
      source,
      /normalizedManifestLastRecordedAt === null/
    );
  }
);


test(
  "eligibility compares normalized UTC timestamp representations",
  () => {
    assert.match(
      source,
      /normalizedPreparedFirstRecordedAt !==[\s\S]*normalizedManifestFirstRecordedAt/
    );

    assert.match(
      source,
      /normalizedPreparedLastRecordedAt !==[\s\S]*normalizedManifestLastRecordedAt/
    );

    assert.doesNotMatch(
      source,
      /prepared\.archive\.firstRecordedAt !==\s*manifest\.first_recorded_at/
    );

    assert.doesNotMatch(
      source,
      /prepared\.archive\.lastRecordedAt !==\s*manifest\.last_recorded_at/
    );
  }
);


test(
  "all non-timestamp archive integrity comparisons remain authoritative",
  () => {
    for (const required of [
      "prepared.archive.organizationId !==",
      "prepared.archive.vehicleId !==",
      "prepared.archive.tripId !==",
      "prepared.archive.rowCount !==",
      "prepared.archive.sha256 !==",
      "reconstructedObjectKey !==",
      '"live_evidence_mismatch"',
    ]) {
      assert.equal(
        source.includes(required),
        true,
        `missing integrity comparison: ${required}`
      );
    }
  }
);