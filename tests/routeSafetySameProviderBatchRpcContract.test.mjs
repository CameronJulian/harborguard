import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260912110500_refresh_route_safety_same_provider_batch.sql";

const migration =
  fs.readFileSync(
    migrationPath,
    "utf8"
  );

test(
  "same-provider batch RPC has the expected trusted-server boundary",
  () => {
    assert.match(
      migration,
      /create or replace function\s+public\.refresh_route_safety_same_provider_batch/i
    );

    assert.match(
      migration,
      /security definer/i
    );

    assert.match(
      migration,
      /set search_path = public/i
    );

    assert.match(
      migration,
      /grant execute[\s\S]*?to\s+service_role/i
    );

    assert.doesNotMatch(
      migration,
      /grant execute[\s\S]*?to\s+(?:anon|authenticated)\b/i
    );
  }
);

test(
  "same-provider batch validates before mutation",
  () => {
    const validation =
      migration.indexOf(
        "Validate the complete batch before any mutation"
      );

    const mutation =
      migration.indexOf(
        "update\n      public.route_safety_alerts"
      );

    assert.notEqual(validation, -1);
    assert.notEqual(mutation, -1);

    assert.ok(
      validation < mutation
    );
  }
);

test(
  "same-provider batch locks target alert identities deterministically",
  () => {
    assert.match(
      migration,
      /pg_advisory_xact_lock/
    );

    assert.match(
      migration,
      /harborguard:route-safety-same-provider:/
    );

    assert.match(
      migration,
      /select distinct[\s\S]*?alertId[\s\S]*?order by\s+1/i
    );
  }
);

test(
  "same-provider batch applies refreshes in inputIndex order",
  () => {
    assert.match(
      migration,
      /Apply refreshes in original input order/
    );

    assert.match(
      migration,
      /order by[\s\S]*?inputIndex/
    );
  }
);

test(
  "same-provider batch keeps TypeScript base-confidence input compatibility",
  () => {
    assert.match(
      migration,
      /p_base_confidence\s+is\s+null[\s\S]*?p_base_confidence\s*<\s*0[\s\S]*?p_base_confidence\s*>\s*100/i
    );

    assert.doesNotMatch(
      migration,
      /trunc\s*\(\s*p_base_confidence\s*\)/i
    );

    assert.match(
      migration,
      /v_base_confidence\s*:=\s*p_base_confidence::integer/i
    );
  }
);
test(
  "same-provider quality remains one-provider quality",
  () => {
    assert.match(
      migration,
      /provider_sources\s*=\s*array\[p_source\]::text\[\]/
    );

    assert.match(
      migration,
      /provider_confirmation_count\s*=\s*1/
    );

    assert.match(
      migration,
      /provider_confidence\s*=\s*v_base_confidence/
    );
  }
);

test(
  "same-provider refresh uses per-item execution timestamps",
  () => {
    assert.match(
      migration,
      /v_confirmed_at\s*:=\s*clock_timestamp\(\)/
    );

    assert.match(
      migration,
      /last_provider_confirmation_at\s*=\s*v_confirmed_at/
    );

    assert.match(
      migration,
      /verified_at\s*=\s*v_confirmed_at/
    );

    assert.match(
      migration,
      /jsonb_build_object\([\s\S]*?p_source,[\s\S]*?v_confirmed_at/
    );
  }
);

test(
  "same-provider refresh preserves expiry and road-name semantics",
  () => {
    assert.match(
      migration,
      /greatest\([\s\S]*?v_current\.expires_at,[\s\S]*?v_incoming_expires_at/
    );

    assert.match(
      migration,
      /v_refreshed_road_name\s*:=[\s\S]*?v_current\.road_name[\s\S]*?v_incoming_road_name/
    );
  }
);

test(
  "same-provider target is fenced by organization id alert id and source",
  () => {
    assert.match(
      migration,
      /alert\.organization_id\s*=\s*p_organization_id/
    );

    assert.match(
      migration,
      /alert\.id\s*=\s*v_alert_id/
    );

    assert.match(
      migration,
      /alert\.source[\s\S]*?p_source/
    );
  }
);

test(
  "same-provider batch returns one canonical resolution per input",
  () => {
    assert.match(
      migration,
      /returns table\s*\([\s\S]*?input_index integer[\s\S]*?alert_id uuid/i
    );

    assert.match(
      migration,
      /v_returned_count\s*:=\s*v_returned_count \+ 1/
    );

    assert.match(
      migration,
      /v_returned_count <> v_expected_count/
    );
  }
);

test(
  "same-provider batch fails closed",
  () => {
    assert.match(
      migration,
      /if not found then[\s\S]*?raise exception/
    );

    assert.match(
      migration,
      /rolls back the complete batch/i
    );
  }
);

test(
  "same-provider repeated target re-reads persisted state for every ordered refresh",
  () => {
    assert.match(
      migration,
      /Apply refreshes in original input order[\s\S]*?for v_item in[\s\S]*?order by[\s\S]*?inputIndex[\s\S]*?loop/i
    );

    assert.match(
      migration,
      /for v_item in[\s\S]*?select[\s\S]*?alert\.\*[\s\S]*?into[\s\S]*?v_current[\s\S]*?from[\s\S]*?route_safety_alerts[\s\S]*?alert\.id\s*=\s*v_alert_id[\s\S]*?for update[\s\S]*?update[\s\S]*?route_safety_alerts/i
    );

    assert.match(
      migration,
      /v_current\.expires_at[\s\S]*?v_incoming_expires_at[\s\S]*?v_refreshed_expires_at/i
    );

    assert.match(
      migration,
      /v_current\.road_name[\s\S]*?v_incoming_road_name[\s\S]*?v_refreshed_road_name/i
    );

    assert.match(
      migration,
      /provider_last_seen\s*=[\s\S]*?alert\.provider_last_seen[\s\S]*?jsonb_build_object/i
    );
  }
);