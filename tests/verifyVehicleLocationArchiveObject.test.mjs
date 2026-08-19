import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/fleet/verifyVehicleLocationArchiveObject.ts",
    "utf8"
  );

test(
  "archive verification downloads from the dedicated archive bucket",
  () => {
    assert.match(
      source,
      /VEHICLE_LOCATION_ARCHIVE_BUCKET/
    );

    assert.match(
      source,
      /\.storage[\s\S]*\.from\(\s*VEHICLE_LOCATION_ARCHIVE_BUCKET\s*\)[\s\S]*\.download\(\s*objectKey\s*\)/
    );
  }
);

test(
  "archive verification independently hashes downloaded bytes",
  () => {
    assert.match(
      source,
      /createHash\("sha256"\)/
    );

    assert.match(
      source,
      /\.update\(bytes\)/
    );

    assert.match(
      source,
      /\.digest\("hex"\)/
    );

    assert.match(
      source,
      /actualSha256 !==\s*expectedSha256/
    );
  }
);

test(
  "archive verification rejects SHA-256 mismatch",
  () => {
    assert.match(
      source,
      /Vehicle location archive SHA-256 verification failed/
    );
  }
);

test(
  "archive verification can independently enforce compressed byte count",
  () => {
    assert.match(
      source,
      /expectedCompressedByteCount !== undefined/
    );

    assert.match(
      source,
      /bytes\.byteLength !==\s*expectedCompressedByteCount/
    );

    assert.match(
      source,
      /compressed byte count verification failed/
    );
  }
);

test(
  "archive verification propagates download failures",
  () => {
    assert.match(
      source,
      /if \(error\)/
    );

    assert.match(
      source,
      /Unable to download vehicle location archive object for verification/
    );
  }
);

test(
  "archive verification does not upload or overwrite objects",
  () => {
    for (const forbidden of [
      ".upload(",
      ".remove(",
      ".move(",
      ".copy(",
      "upsert:",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false
      );
    }
  }
);

test(
  "archive verification has no manifest lifecycle authority",
  () => {
    for (const forbidden of [
      "vehicle_location_archive_manifests",
      "verified_at",
      "failure_reason",
      ".insert(",
      ".upsert(",
      ".rpc(",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false
      );
    }
  }
);

test(
  "archive verification cannot delete hot telemetry",
  () => {
    assert.doesNotMatch(
      source,
      /vehicle_locations[\s\S]*\.delete\(/
    );

    assert.doesNotMatch(
      source,
      /delete\s+from\s+public\.vehicle_locations/i
    );

    assert.doesNotMatch(
      source,
      /truncate\s+(?:table\s+)?public\.vehicle_locations/i
    );
  }
);

test(
  "archive verification introduces no ML authority",
  () => {
    for (const forbidden of [
      "route_risk_model_registry",
      "activateRouteRisk",
      "lifecycle_status",
      "riskScore",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false
      );
    }
  }
);
