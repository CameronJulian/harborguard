import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260819125400_create_vehicle_location_archive_storage_bucket.sql";

const source =
  fs.readFileSync(
    migrationPath,
    "utf8"
  );

test(
  "archive storage foundation creates the dedicated vehicle-location bucket",
  () => {
    assert.match(
      source,
      /insert into storage\.buckets/i
    );

    assert.match(
      source,
      /'vehicle-location-archives'/i
    );

    assert.match(
      source,
      /\bid\b[\s\S]*\bname\b[\s\S]*'vehicle-location-archives'/i
    );
  }
);

test(
  "archive bucket is explicitly private",
  () => {
    assert.match(
      source,
      /\bpublic\b[\s\S]*false/i
    );

    assert.doesNotMatch(
      source,
      /'vehicle-location-archives'[\s\S]*true/i
    );
  }
);

test(
  "archive bucket accepts deterministic gzip archive objects",
  () => {
    assert.match(
      source,
      /allowed_mime_types/i
    );

    assert.match(
      source,
      /'application\/gzip'/i
    );
  }
);

test(
  "archive bucket creation is migration-idempotent without overwriting bucket configuration",
  () => {
    assert.match(
      source,
      /on conflict\s*\(\s*id\s*\)\s*do nothing/i
    );

    assert.doesNotMatch(
      source,
      /on conflict[\s\S]*do update/i
    );
  }
);

test(
  "archive storage foundation grants no anonymous or authenticated object policy",
  () => {
    assert.doesNotMatch(
      source,
      /create policy/i
    );

    assert.doesNotMatch(
      source,
      /to\s+anon/i
    );

    assert.doesNotMatch(
      source,
      /to\s+authenticated/i
    );
  }
);

test(
  "archive storage foundation performs no archive object writes",
  () => {
    for (const forbidden of [
      ".upload(",
      ".download(",
      "createSignedUrl",
      "vehicle_location_archive_manifests",
    ]) {
      assert.equal(
        source.includes(
          forbidden
        ),
        false
      );
    }

    assert.doesNotMatch(
      source,
      /insert\s+into\s+storage\.objects/i
    );

    assert.doesNotMatch(
      source,
      /update\s+storage\.objects/i
    );

    assert.doesNotMatch(
      source,
      /delete\s+from\s+storage\.objects/i
    );
  }
);

test(
  "archive storage foundation cannot prune hot telemetry",
  () => {
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
  "archive storage foundation introduces no ML authority",
  () => {
    for (const forbidden of [
      "route_risk_model_registry",
      "activateRouteRisk",
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
