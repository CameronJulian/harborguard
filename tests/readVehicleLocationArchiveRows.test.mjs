import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/fleet/readVehicleLocationArchiveRows.ts",
    "utf8"
  );

test(
  "archive reader is bounded by organization vehicle trip and time window",
  () => {
    for (const fragment of [
      '.eq(\n          "organization_id"',
      '.eq(\n          "vehicle_id"',
      '.gte(\n          "recorded_at"',
      '.lte(\n          "recorded_at"',
    ]) {
      assert.ok(
        source.includes(fragment),
        `Expected bounded query fragment: ${fragment}`
      );
    }

    assert.match(
      source,
      /tripId === null[\s\S]*\.is\(\s*"trip_id",\s*null\s*\)[\s\S]*\.eq\(\s*"trip_id",\s*tripId\s*\)/m
    );
  }
);

test(
  "archive reader selects only canonical archive columns",
  () => {
    for (const column of [
      "id",
      "organization_id",
      "vehicle_id",
      "trip_id",
      "latitude",
      "longitude",
      "speed_kmh",
      "heading",
      "recorded_at",
    ]) {
      assert.ok(
        source.includes(
          `"${column}"`
        )
      );
    }
  }
);

test(
  "archive reader orders by recorded_at then stable id",
  () => {
    const recordedOrder =
      source.indexOf(
        '.order(\n          "recorded_at"'
      );

    const idOrder =
      source.indexOf(
        '.order(\n          "id"'
      );

    assert.ok(
      recordedOrder >= 0
    );

    assert.ok(
      idOrder >
        recordedOrder
    );
  }
);

test(
  "archive reader uses compound keyset continuation",
  () => {
    assert.match(
      source,
      /recorded_at\.gt\.\$\{cursorRecordedAt\}/
    );

    assert.match(
      source,
      /recorded_at\.eq\.\$\{cursorRecordedAt\}/
    );

    assert.match(
      source,
      /id\.gt\.\$\{cursorId\}/
    );

    assert.match(
      source,
      /cursorRecordedAt\s*=\s*finalRow\.recorded_at/
    );

    assert.match(
      source,
      /cursorId\s*=\s*finalRow\.id/
    );
  }
);

test(
  "archive reader does not use offset pagination",
  () => {
    assert.doesNotMatch(
      source,
      /\.range\(/
    );

    assert.doesNotMatch(
      source,
      /\boffset\b/
    );
  }
);

test(
  "archive reader applies bounded page size",
  () => {
    assert.match(
      source,
      /\.limit\(\s*pageSize\s*\)/
    );

    assert.match(
      source,
      /MAX_PAGE_SIZE\s*=\s*5000/
    );
  }
);

test(
  "archive reader performs no storage manifest deletion or ML authority",
  () => {
    for (const forbidden of [
      "storage.from",
      ".upload(",
      "vehicle_location_archive_manifests",
      ".insert(",
      ".upsert(",
      ".update(",
      ".delete(",
      "delete from",
      "activateRouteRisk",
      "route_risk_model_registry",
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
