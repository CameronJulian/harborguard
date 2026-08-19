import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/fleet/prepareVehicleLocationArchive.ts",
    "utf8"
  );

test(
  "archive preparation composes bounded reader with deterministic builder",
  () => {
    assert.match(
      source,
      /readVehicleLocationArchiveRows/
    );

    assert.match(
      source,
      /buildVehicleLocationArchiveObject/
    );

    const readerIndex =
      source.indexOf(
        "readVehicleLocationArchiveRows"
      );

    const builderIndex =
      source.lastIndexOf(
        "buildVehicleLocationArchiveObject"
      );

    assert.ok(
      readerIndex >= 0
    );

    assert.ok(
      builderIndex >
        readerIndex
    );
  }
);

test(
  "archive preparation forwards exact bounded scope",
  () => {
    for (const field of [
      "organizationId",
      "vehicleId",
      "tripId",
      "firstRecordedAt",
      "lastRecordedAt",
      "pageSize",
    ]) {
      assert.match(
        source,
        new RegExp(
          `${field}:\\s*input\\.${field}`
        )
      );
    }
  }
);

test(
  "archive preparation rejects empty bounded source evidence",
  () => {
    assert.match(
      source,
      /rows\.length === 0/
    );

    assert.match(
      source,
      /bounded source returned no rows/
    );
  }
);

test(
  "archive preparation returns archive metadata and source row count",
  () => {
    assert.match(
      source,
      /sourceRowCount:\s*rows\.length/
    );

    assert.match(
      source,
      /organizationId:\s*archive\.organizationId/
    );

    assert.match(
      source,
      /vehicleId:\s*archive\.vehicleId/
    );

    assert.match(
      source,
      /tripId:\s*archive\.tripId/
    );
  }
);

test(
  "archive preparation has no object storage authority",
  () => {
    for (const forbidden of [
      "storage.from",
      ".upload(",
      ".download(",
      "createSignedUrl",
      "bucket_id",
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
  "archive preparation has no manifest persistence authority",
  () => {
    for (const forbidden of [
      "vehicle_location_archive_manifests",
      ".insert(",
      ".upsert(",
      ".update(",
      ".delete(",
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
  "archive preparation cannot delete hot telemetry or activate ML",
  () => {
    for (const forbidden of [
      "delete from",
      "vehicle_locations).delete",
      "activateRouteRisk",
      "route_risk_model_registry",
      "lifecycle_status",
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
