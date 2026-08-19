import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source =
  fs.readFileSync(
    "lib/fleet/runVehicleLocationArchiveLifecycle.ts",
    "utf8"
  );

test(
  "archive lifecycle composes preparation persistence and independent verification in order",
  () => {
    const prepare =
      source.indexOf(
        "await prepareVehicleLocationArchive("
      );

    const persist =
      source.indexOf(
        "await persistVehicleLocationArchiveObject("
      );

    const verify =
      source.indexOf(
        "await verifyVehicleLocationArchiveObject("
      );

    assert.ok(
      prepare >= 0
    );

    assert.ok(
      persist > prepare
    );

    assert.ok(
      verify > persist
    );
  }
);

test(
  "archive lifecycle creates pending manifest before storage upload",
  () => {
    const pendingInsert =
      source.indexOf(
        ".insert({"
      );

    const persist =
      source.indexOf(
        "await persistVehicleLocationArchiveObject("
      );

    assert.ok(
      pendingInsert >= 0
    );

    assert.ok(
      persist > pendingInsert
    );

    assert.match(
      source,
      /status:\s*"pending"/
    );

    assert.match(
      source,
      /verified_at:\s*null/
    );

    assert.match(
      source,
      /failure_reason:\s*null/
    );
  }
);

test(
  "pending manifest records deterministic archive evidence",
  () => {
    for (const fragment of [
      "organization_id:",
      "vehicle_id:",
      "trip_id:",
      "archive_format:",
      "object_key:",
      "first_recorded_at:",
      "last_recorded_at:",
      "row_count:",
      "sha256:",
    ]) {
      assert.ok(
        source.includes(
          fragment
        ),
        `Expected manifest evidence field: ${fragment}`
      );
    }

    assert.match(
      source,
      /archive_format:\s*"jsonl_gzip"/
    );
  }
);

test(
  "verified transition happens only after independent object verification",
  () => {
    const verify =
      source.indexOf(
        "await verifyVehicleLocationArchiveObject("
      );

    const verifiedStatus =
      source.indexOf(
        'status:\n            "verified"'
      );

    assert.ok(
      verify >= 0
    );

    assert.ok(
      verifiedStatus > verify
    );
  }
);

test(
  "verified transition is compare-and-set guarded by exact manifest and pending status",
  () => {
    assert.match(
      source,
      /\.eq\(\s*"id",\s*manifest\.id\s*\)[\s\S]*\.eq\(\s*"status",\s*"pending"\s*\)[\s\S]*\.select\(\s*"id,status,verified_at"\s*\)[\s\S]*\.maybeSingle\(\)/
    );

    assert.match(
      source,
      /Archive manifest could not transition from pending to verified/
    );
  }
);

test(
  "failed transition is compare-and-set guarded by manifest id and pending status",
  () => {
    assert.match(
      source,
      /\.eq\(\s*"id",\s*input\.manifestId\s*\)[\s\S]*\.eq\(\s*"status",\s*"pending"\s*\)[\s\S]*\.select\(\s*"id,status"\s*\)[\s\S]*\.maybeSingle\(\)/
    );

    assert.match(
      source,
      /status:\s*"failed"/
    );

    assert.match(
      source,
      /Archive manifest could not transition from pending to failed/
    );
  }
);

test(
  "archive lifecycle preserves verification evidence before marking verified",
  () => {
    assert.match(
      source,
      /persisted\.objectKey !==\s*objectKey/
    );

    assert.match(
      source,
      /persisted\.sha256 !==\s*prepared\.archive\.sha256/
    );

    assert.match(
      source,
      /verified\.sha256 !==\s*prepared\.archive\.sha256/
    );

    assert.match(
      source,
      /verified\.compressedByteCount !==\s*prepared\.archive\.compressedByteCount/
    );
  }
);

test(
  "archive lifecycle attempts failed manifest finalization when upload or verification fails",
  () => {
    assert.match(
      source,
      /catch \(error: unknown\)/
    );

    assert.match(
      source,
      /await markArchiveManifestFailed/
    );

    assert.match(
      source,
      /throw new AggregateError/
    );
  }
);

test(
  "archive lifecycle does not remove uploaded objects on failure",
  () => {
    for (const forbidden of [
      ".remove(",
      ".move(",
      ".copy(",
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
  "archive lifecycle cannot prune vehicle locations",
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

    assert.doesNotMatch(
      source,
      /drop\s+table\s+public\.vehicle_locations/i
    );
  }
);

test(
  "archive lifecycle introduces no ML production authority",
  () => {
    for (const forbidden of [
      "route_risk_model_registry",
      "activateRouteRisk",
      "lifecycle_status",
      "production_model",
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
