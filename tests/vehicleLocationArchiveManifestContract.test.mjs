import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260819123000_create_vehicle_location_archive_manifests.sql";

const source =
  fs.readFileSync(
    migrationPath,
    "utf8"
  );

test(
  "archive manifest records ownership, range, integrity and object identity",
  () => {
    assert.match(
      source,
      /create table if not exists public\.vehicle_location_archive_manifests/i
    );

    for (const requiredColumn of [
      "organization_id",
      "vehicle_id",
      "trip_id",
      "archive_format",
      "object_key",
      "first_recorded_at",
      "last_recorded_at",
      "row_count",
      "sha256",
      "status",
      "verified_at",
      "failure_reason",
    ]) {
      assert.match(
        source,
        new RegExp(`\\b${requiredColumn}\\b`)
      );
    }
  }
);

test(
  "archive manifest supports only explicit lifecycle states",
  () => {
    assert.match(
      source,
      /status\s+text\s+not null default 'pending'/i
    );

    assert.match(
      source,
      /'pending'[\s\S]*'verified'[\s\S]*'failed'/i
    );

    assert.match(
      source,
      /status = 'verified'[\s\S]*verified_at is not null/i
    );

    assert.match(
      source,
      /status = 'failed'[\s\S]*failure_reason is not null/i
    );
  }
);

test(
  "verified manifest requires deterministic archive integrity metadata",
  () => {
    assert.match(
      source,
      /row_count bigint not null[\s\S]*check\s*\(\s*row_count > 0\s*\)/i
    );

    assert.match(
      source,
      /sha256[\s\S]*\^\[0-9a-f\]\{64\}\$/i
    );

    assert.match(
      source,
      /first_recorded_at <= last_recorded_at/i
    );

    assert.match(
      source,
      /unique\s*\(\s*object_key\s*\)/i
    );
  }
);

test(
  "archive manifest is service-role-only",
  () => {
    assert.match(
      source,
      /enable row level security/i
    );

    assert.match(
      source,
      /revoke all[\s\S]*from public,\s*anon,\s*authenticated/i
    );

    assert.match(
      source,
      /grant all[\s\S]*to service_role/i
    );
  }
);

test(
  "archive foundation introduces no telemetry deletion",
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
  "archive foundation does not overload Crowd receipt state",
  () => {
    assert.doesNotMatch(
      source,
      /update\s+public\.crowd_journey_pipeline_receipts/i
    );

    assert.doesNotMatch(
      source,
      /alter\s+table\s+public\.crowd_journey_pipeline_receipts/i
    );
  }
);

test(
  "archive foundation introduces no ML or production authority",
  () => {
    assert.doesNotMatch(
      source,
      /activateRouteRisk/i
    );

    assert.doesNotMatch(
      source,
      /route_risk_model_registry/i
    );

    assert.doesNotMatch(
      source,
      /lifecycle_status\s*=\s*['"]active['"]/i
    );
  }
);
