import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260819150000_create_vehicle_location_archive_prune_rpc.sql";

const source =
  fs.readFileSync(
    migrationPath,
    "utf8"
  );

test(
  "pruning primitive accepts only one exact manifest id",
  () => {
    assert.match(
      source,
      /prune_vehicle_locations_for_verified_archive\(\s*p_manifest_id uuid\s*\)/i
    );

    assert.doesNotMatch(
      source,
      /p_organization_id/i
    );

    assert.doesNotMatch(
      source,
      /p_vehicle_id/i
    );

    assert.doesNotMatch(
      source,
      /p_cutoff/i
    );
  }
);

test(
  "pruning primitive is service-role-only and security invoker",
  () => {
    assert.match(
      source,
      /security invoker/i
    );

    assert.match(
      source,
      /auth\.role\(\) is distinct from 'service_role'/i
    );

    assert.match(
      source,
      /revoke all[\s\S]*from public,\s*anon,\s*authenticated/i
    );

    assert.match(
      source,
      /grant execute[\s\S]*to service_role/i
    );

    assert.doesNotMatch(
      source,
      /security definer/i
    );
  }
);

test(
  "pruning primitive serializes exact manifest attempts",
  () => {
    assert.match(
      source,
      /pg_advisory_xact_lock/i
    );

    assert.match(
      source,
      /vehicle-location-archive-prune:/i
    );

    assert.match(
      source,
      /p_manifest_id::text/i
    );
  }
);

test(
  "pruning primitive locks the exact manifest lifecycle row",
  () => {
    assert.match(
      source,
      /from public\.vehicle_location_archive_manifests[\s\S]*where id = p_manifest_id[\s\S]*for update/i
    );
  }
);

test(
  "only verified manifest evidence may reach deletion",
  () => {
    assert.match(
      source,
      /v_manifest\.status <> 'verified'/i
    );

    assert.match(
      source,
      /v_manifest\.verified_at is null/i
    );

    assert.match(
      source,
      /v_manifest\.failure_reason is not null/i
    );

    assert.match(
      source,
      /v_manifest\.row_count[\s\S]*<= 0/i
    );

    assert.match(
      source,
      /v_manifest\.sha256[\s\S]*\^\[0-9a-f\]\{64\}\$/i
    );
  }
);

test(
  "pruning transaction blocks concurrent vehicle location writers",
  () => {
    assert.match(
      source,
      /lock table public\.vehicle_locations[\s\S]*in share row exclusive mode/i
    );
  }
);

test(
  "database revalidation uses exact manifest-owned organization vehicle trip and time scope",
  () => {
    assert.match(
      source,
      /locations\.organization_id\s*=\s*v_manifest\.organization_id/i
    );

    assert.match(
      source,
      /locations\.vehicle_id\s*=\s*v_manifest\.vehicle_id/i
    );

    assert.match(
      source,
      /v_manifest\.trip_id is null[\s\S]*locations\.trip_id is null/i
    );

    assert.match(
      source,
      /locations\.trip_id\s*=\s*v_manifest\.trip_id/i
    );

    assert.match(
      source,
      /locations\.recorded_at\s*>=\s*v_manifest\.first_recorded_at/i
    );

    assert.match(
      source,
      /locations\.recorded_at\s*<=\s*v_manifest\.last_recorded_at/i
    );
  }
);

test(
  "database revalidation requires exact row count and time endpoints",
  () => {
    assert.match(
      source,
      /v_live_row_count\s*<>\s*v_manifest\.row_count/i
    );

    assert.match(
      source,
      /v_live_first_recorded_at[\s\S]*is distinct from[\s\S]*v_manifest\.first_recorded_at/i
    );

    assert.match(
      source,
      /v_live_last_recorded_at[\s\S]*is distinct from[\s\S]*v_manifest\.last_recorded_at/i
    );
  }
);

test(
  "deletion is bounded exclusively by the locked manifest scope",
  () => {
    assert.match(
      source,
      /delete from public\.vehicle_locations as locations/i
    );

    assert.match(
      source,
      /delete from public\.vehicle_locations as locations[\s\S]*locations\.organization_id\s*=\s*v_manifest\.organization_id[\s\S]*locations\.vehicle_id\s*=\s*v_manifest\.vehicle_id/i
    );

    assert.match(
      source,
      /delete from public\.vehicle_locations as locations[\s\S]*locations\.recorded_at\s*>=\s*v_manifest\.first_recorded_at[\s\S]*locations\.recorded_at\s*<=\s*v_manifest\.last_recorded_at/i
    );
  }
);

test(
  "legacy null-organization telemetry cannot match pruning scope",
  () => {
    assert.match(
      source,
      /v_manifest\.organization_id is null/i
    );

    assert.match(
      source,
      /locations\.organization_id\s*=\s*v_manifest\.organization_id/i
    );

    assert.doesNotMatch(
      source,
      /locations\.organization_id is null/i
    );
  }
);

test(
  "deleted row count must exactly match verified manifest row count",
  () => {
    assert.match(
      source,
      /get diagnostics[\s\S]*v_deleted_row_count = row_count/i
    );

    assert.match(
      source,
      /v_deleted_row_count\s*<>\s*v_manifest\.row_count/i
    );
  }
);

test(
  "pruning primitive returns aggregate deletion evidence only",
  () => {
    assert.match(
      source,
      /returns table \(\s*manifest_id uuid,\s*deleted_row_count bigint\s*\)/i
    );

    assert.doesNotMatch(
      source,
      /returns table[\s\S]*latitude/i
    );

    assert.doesNotMatch(
      source,
      /returns table[\s\S]*longitude/i
    );
  }
);

test(
  "pruning primitive does not delete archive objects or manifests",
  () => {
    assert.doesNotMatch(
      source,
      /delete\s+from\s+public\.vehicle_location_archive_manifests/i
    );

    assert.doesNotMatch(
      source,
      /storage\.objects[\s\S]*delete/i
    );

    assert.doesNotMatch(
      source,
      /delete\s+from\s+storage\.objects/i
    );
  }
);

test(
  "pruning primitive defines no retention duration or schedule",
  () => {
    for (const forbidden of [
      "retention_days",
      "retention_hours",
      "interval '",
      "cron.",
      "schedule(",
    ]) {
      assert.equal(
        source.toLowerCase().includes(
          forbidden.toLowerCase()
        ),
        false
      );
    }
  }
);

test(
  "pruning primitive introduces no ML production authority",
  () => {
    for (const forbidden of [
      "route_risk_model_registry",
      "activate_route_risk",
      "lifecycle_status",
      "risk_score",
      "production_model",
    ]) {
      assert.equal(
        source.toLowerCase().includes(
          forbidden.toLowerCase()
        ),
        false
      );
    }
  }
);
