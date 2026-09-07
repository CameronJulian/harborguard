import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260907132000_harden_route_risk_shadow_provider_capacity_contention.sql";

const migration = fs.readFileSync(
  migrationPath,
  "utf8"
);

test("shadow capacity preserves the global serialization identity", () => {
  assert.match(
    migration,
    /harborguard:route-risk-shadow-provider-capacity/
  );
});

test("shadow capacity uses bounded non-blocking acquisition", () => {
  assert.match(
    migration,
    /pg_try_advisory_xact_lock\s*\(/
  );

  assert.match(
    migration,
    /interval\s+'250 milliseconds'/i
  );

  assert.match(
    migration,
    /pg_sleep\s*\(\s*0\.025\s*\)/
  );

  assert.doesNotMatch(
    migration,
    /\bperform\s+pg_advisory_xact_lock\s*\(/
  );
});

test("reserve explicitly fails closed on lock contention", () => {
  assert.match(
    migration,
    /'DENIED'::text,\s*'capacity_contention'::text,\s*null::text/s
  );
});

test("release explicitly fails closed on lock contention", () => {
  assert.match(
    migration,
    /if not v_lock_acquired then\s*return query\s*select 'UNAVAILABLE'::text;/s
  );
});

test("capacity RPC privileges remain service-role-only", () => {
  assert.match(
    migration,
    /revoke all on function public\.reserve_route_risk_shadow_provider_capacity[\s\S]*from public, anon, authenticated;/i
  );

  assert.match(
    migration,
    /grant execute on function public\.reserve_route_risk_shadow_provider_capacity[\s\S]*to service_role;/i
  );

  assert.match(
    migration,
    /revoke all on function public\.release_route_risk_shadow_provider_capacity\(text\)[\s\S]*from public, anon, authenticated;/i
  );

  assert.match(
    migration,
    /grant execute on function public\.release_route_risk_shadow_provider_capacity\(text\)[\s\S]*to service_role;/i
  );
});
