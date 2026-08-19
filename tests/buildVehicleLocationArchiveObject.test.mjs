import assert from "node:assert/strict";
import {
  createHash,
} from "node:crypto";
import fs from "node:fs";
import test from "node:test";

import {
  buildVehicleLocationArchiveObject,
  readVehicleLocationArchiveJsonLines,
  VEHICLE_LOCATION_ARCHIVE_FORMAT,
  VEHICLE_LOCATION_ARCHIVE_OBJECT_VERSION,
} from "../lib/fleet/buildVehicleLocationArchiveObject.ts";

const rows = [
  {
    id: "00000000-0000-0000-0000-000000000002",
    organization_id:
      "10000000-0000-0000-0000-000000000001",
    vehicle_id:
      "20000000-0000-0000-0000-000000000001",
    trip_id:
      "30000000-0000-0000-0000-000000000001",
    latitude: "-33.9201",
    longitude: "18.4219",
    speed_kmh: "42.5",
    heading: "91",
    recorded_at:
      "2026-08-19T10:00:05+00:00",
  },
  {
    id: "00000000-0000-0000-0000-000000000001",
    organization_id:
      "10000000-0000-0000-0000-000000000001",
    vehicle_id:
      "20000000-0000-0000-0000-000000000001",
    trip_id:
      "30000000-0000-0000-0000-000000000001",
    latitude: -33.92,
    longitude: 18.42,
    speed_kmh: null,
    heading: null,
    recorded_at:
      "2026-08-19T10:00:00.000Z",
  },
];

test(
  "builds deterministic identical gzip bytes for identical archive evidence",
  () => {
    const first =
      buildVehicleLocationArchiveObject(
        rows
      );

    const second =
      buildVehicleLocationArchiveObject(
        [...rows].reverse()
      );

    assert.deepEqual(
      first.bytes,
      second.bytes
    );

    assert.equal(
      first.sha256,
      second.sha256
    );

    assert.equal(
      first.archiveFormat,
      VEHICLE_LOCATION_ARCHIVE_FORMAT
    );

    assert.equal(
      first.version,
      VEHICLE_LOCATION_ARCHIVE_OBJECT_VERSION
    );
  }
);

test(
  "orders rows deterministically by recorded timestamp then id",
  () => {
    const archive =
      buildVehicleLocationArchiveObject(
        rows
      );

    const decoded =
      readVehicleLocationArchiveJsonLines(
        archive.bytes
      );

    assert.equal(
      decoded.length,
      2
    );

    assert.equal(
      decoded[0].id,
      "00000000-0000-0000-0000-000000000001"
    );

    assert.equal(
      decoded[1].id,
      "00000000-0000-0000-0000-000000000002"
    );
  }
);

test(
  "normalizes numeric strings and timestamps canonically",
  () => {
    const archive =
      buildVehicleLocationArchiveObject(
        rows
      );

    const decoded =
      readVehicleLocationArchiveJsonLines(
        archive.bytes
      );

    assert.equal(
      decoded[1].latitude,
      -33.9201
    );

    assert.equal(
      decoded[1].longitude,
      18.4219
    );

    assert.equal(
      decoded[1].speedKmh,
      42.5
    );

    assert.equal(
      decoded[1].heading,
      91
    );

    assert.equal(
      decoded[1].recordedAt,
      "2026-08-19T10:00:05.000Z"
    );
  }
);

test(
  "derives exact manifest metadata from canonical archive contents",
  () => {
    const archive =
      buildVehicleLocationArchiveObject(
        rows
      );

    assert.equal(
      archive.organizationId,
      rows[0].organization_id
    );

    assert.equal(
      archive.vehicleId,
      rows[0].vehicle_id
    );

    assert.equal(
      archive.tripId,
      rows[0].trip_id
    );

    assert.equal(
      archive.firstRecordedAt,
      "2026-08-19T10:00:00.000Z"
    );

    assert.equal(
      archive.lastRecordedAt,
      "2026-08-19T10:00:05.000Z"
    );

    assert.equal(
      archive.rowCount,
      2
    );

    assert.match(
      archive.sha256,
      /^[0-9a-f]{64}$/
    );

    assert.equal(
      archive.sha256,
      createHash("sha256")
        .update(archive.bytes)
        .digest("hex")
    );

    assert.ok(
      archive.uncompressedByteCount > 0
    );

    assert.ok(
      archive.compressedByteCount > 0
    );
  }
);

test(
  "rejects empty archives",
  () => {
    assert.throws(
      () =>
        buildVehicleLocationArchiveObject(
          []
        ),
      /at least one row/
    );
  }
);

test(
  "rejects cross-organization archive objects",
  () => {
    assert.throws(
      () =>
        buildVehicleLocationArchiveObject([
          rows[0],
          {
            ...rows[1],
            organization_id:
              "10000000-0000-0000-0000-000000000099",
          },
        ]),
      /cannot span organizations/
    );
  }
);

test(
  "rejects cross-vehicle archive objects",
  () => {
    assert.throws(
      () =>
        buildVehicleLocationArchiveObject([
          rows[0],
          {
            ...rows[1],
            vehicle_id:
              "20000000-0000-0000-0000-000000000099",
          },
        ]),
      /cannot span vehicles/
    );
  }
);

test(
  "rejects mixed trip scope",
  () => {
    assert.throws(
      () =>
        buildVehicleLocationArchiveObject([
          rows[0],
          {
            ...rows[1],
            trip_id:
              "30000000-0000-0000-0000-000000000099",
          },
        ]),
      /cannot mix trip scopes/
    );
  }
);

test(
  "archive object builder performs no database storage or deletion operations",
  () => {
    const source =
      fs.readFileSync(
        "lib/fleet/buildVehicleLocationArchiveObject.ts",
        "utf8"
      );

    for (const forbidden of [
      "supabase.from(",
      "supabaseAdmin.from(",
      ".rpc(",
      "storage.from(",
      ".upload(",
      "vehicle_location_archive_manifests",
      ".delete(",
      "delete from",
      "SUPABASE_SERVICE_ROLE_KEY",
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
  "archive object builder contains no ML or production scoring authority",
  () => {
    const source =
      fs.readFileSync(
        "lib/fleet/buildVehicleLocationArchiveObject.ts",
        "utf8"
      );

    for (const forbidden of [
      "route_risk_model_registry",
      "activateRouteRisk",
      "lifecycle_status",
      "threatRiskScore",
      "riskScore",
      "reroute",
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
