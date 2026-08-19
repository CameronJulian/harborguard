import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/fleet/persistVehicleLocationArchiveObject.ts",
    "utf8"
  );

test(
  "archive persistence targets the dedicated private bucket",
  () => {
    assert.match(
      source,
      /VEHICLE_LOCATION_ARCHIVE_BUCKET\s*=\s*"vehicle-location-archives"/
    );

    assert.match(
      source,
      /\.storage[\s\S]*\.from\(\s*VEHICLE_LOCATION_ARCHIVE_BUCKET\s*\)/
    );
  }
);

test(
  "archive object key is content addressed by SHA-256",
  () => {
    assert.match(
      source,
      /\$\{sha256\}\.jsonl\.gz/
    );

    assert.match(
      source,
      /\^\[0-9a-f\]\{64\}\$/
    );

    assert.match(
      source,
      /archive\.version/
    );

    assert.match(
      source,
      /archive\.organizationId/
    );

    assert.match(
      source,
      /archive\.vehicleId/
    );

    assert.match(
      source,
      /archive\.tripId/
    );
  }
);

test(
  "archive object persistence is immutable",
  () => {
    assert.match(
      source,
      /\.upload\(/
    );

    assert.match(
      source,
      /upsert:\s*false/
    );

    assert.doesNotMatch(
      source,
      /upsert:\s*true/
    );

    assert.doesNotMatch(
      source,
      /\.update\(/
    );

    assert.doesNotMatch(
      source,
      /\.move\(/
    );

    assert.doesNotMatch(
      source,
      /\.copy\(/
    );

    assert.doesNotMatch(
      source,
      /\.remove\(/
    );
  }
);

test(
  "archive upload uses deterministic gzip content type",
  () => {
    assert.match(
      source,
      /contentType:\s*"application\/gzip"/
    );

    assert.match(
      source,
      /new Uint8Array\(\s*input\.archive\.bytes\s*\)/
    );
  }
);

test(
  "archive persistence propagates storage failures",
  () => {
    assert.match(
      source,
      /if \(error\)/
    );

    assert.match(
      source,
      /Unable to persist vehicle location archive object/
    );
  }
);

test(
  "archive persistence does not verify or download yet",
  () => {
    assert.doesNotMatch(
      source,
      /\.download\(/
    );

    assert.doesNotMatch(
      source,
      /createSignedUrl/
    );

    assert.doesNotMatch(
      source,
      /verified_at/
    );
  }
);

test(
  "archive persistence has no manifest mutation authority",
  () => {
    for (const forbidden of [
      "vehicle_location_archive_manifests",
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
  "archive persistence cannot delete hot telemetry",
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
  "archive persistence introduces no ML lifecycle authority",
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
