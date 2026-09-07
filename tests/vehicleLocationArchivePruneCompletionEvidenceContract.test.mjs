import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260907090500_add_vehicle_location_archive_prune_completion_evidence.sql";

const source =
  fs.readFileSync(
    migrationPath,
    "utf8"
  );

test(
  "durable prune evidence is separate from archive verification status",
  () => {
    assert.match(
      source,
      /add column if not exists pruned_at timestamptz/i
    );

    assert.match(
      source,
      /add column if not exists pruned_row_count bigint/i
    );

    assert.doesNotMatch(
      source,
      /status\s*=\s*'pruned'/i
    );
  }
);

test(
  "completed prune evidence must describe the exact verified manifest",
  () => {
    assert.match(
      source,
      /pruned_row_count\s*=\s*row_count/i
    );

    assert.match(
      source,
      /status\s*=\s*'verified'/i
    );

    assert.match(
      source,
      /verified_at is not null/i
    );

    assert.match(
      source,
      /failure_reason is null/i
    );

    assert.match(
      source,
      /pruned_at\s*>=\s*verified_at/i
    );
  }
);

test(
  "exact successful retry returns durable prior prune evidence",
  () => {
    assert.match(
      source,
      /if v_manifest\.pruned_at is not null/i
    );

    assert.match(
      source,
      /v_manifest\.pruned_row_count\s*<>\s*v_manifest\.row_count/i
    );

    assert.match(
      source,
      /return query[\s\S]*v_manifest\.id[\s\S]*v_manifest\.pruned_row_count/i
    );
  }
);

test(
  "initial execution still freezes writers and revalidates live evidence",
  () => {
    assert.match(
      source,
      /lock table public\.vehicle_locations[\s\S]*in share row exclusive mode/i
    );

    assert.match(
      source,
      /v_live_row_count\s*<>\s*v_manifest\.row_count/i
    );

    assert.match(
      source,
      /v_live_first_recorded_at[\s\S]*v_manifest\.first_recorded_at/i
    );

    assert.match(
      source,
      /v_live_last_recorded_at[\s\S]*v_manifest\.last_recorded_at/i
    );
  }
);

test(
  "prune completion is persisted after exact deletion verification",
  () => {
    const deleteIndex =
      source.search(
        /delete from public\.vehicle_locations/i
      );

    const diagnosticsIndex =
      source.search(
        /get diagnostics[\s\S]*v_deleted_row_count\s*=\s*row_count/i
      );

    const updateIndex =
      source.search(
        /update public\.vehicle_location_archive_manifests/i
      );

    assert.ok(deleteIndex >= 0);
    assert.ok(diagnosticsIndex > deleteIndex);
    assert.ok(updateIndex > diagnosticsIndex);

    assert.match(
      source,
      /set[\s\S]*pruned_at\s*=\s*now\(\)[\s\S]*pruned_row_count\s*=\s*v_deleted_row_count/i
    );
  }
);

test(
  "prune completion write remains inside the destructive RPC transaction",
  () => {
    assert.match(
      source,
      /create or replace function public\.prune_vehicle_locations_for_verified_archive/i
    );

    assert.match(
      source,
      /delete from public\.vehicle_locations[\s\S]*update public\.vehicle_location_archive_manifests[\s\S]*return query/i
    );
  }
);

test(
  "destructive authority remains service-role only",
  () => {
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
  "migration introduces no retention schedule or ML authority",
  () => {
    for (const forbidden of [
      "retention_days",
      "retention_hours",
      "cron.",
      "schedule(",
      "route_risk_model_registry",
      "activate_route_risk",
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
