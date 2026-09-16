import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  "app/api/payfast/notify/route.ts",
  "utf8"
);

const migration = fs.readFileSync(
  "supabase/migrations/20260916143000_persist_payfast_raw_itn.sql",
  "utf8"
);

test("PayFast notify passes original raw ITN body into atomic RPC", () => {
  assert.match(
    route,
    /const rawBody\s*=\s*[\s\S]*?readPayFastItnBody\(req\)/
  );

  assert.match(
    route,
    /p_payload:\s*payload/
  );

  assert.match(
    route,
    /p_raw_payload:\s*rawBody/
  );
});

test("billing events persist parsed JSON and original raw ITN separately", () => {
  assert.match(
    migration,
    /add column if not exists raw_payload text/
  );

  assert.match(
    migration,
    /p_payload jsonb/
  );

  assert.match(
    migration,
    /p_raw_payload text default null/
  );

  assert.match(
    migration,
    /insert into public\.billing_events\s*\([\s\S]*?payload,[\s\S]*?raw_payload[\s\S]*?\)/
  );

  assert.match(
    migration,
    /coalesce\(p_payload,\s*'\{\}'::jsonb\),[\s\S]*?p_raw_payload/
  );
});

test("raw ITN persistence stays behind service_role-only atomic RPC", () => {
  assert.match(
    migration,
    /revoke all[\s\S]*?from public/i
  );

  assert.match(
    migration,
    /grant all[\s\S]*?to service_role/i
  );

  assert.doesNotMatch(
    migration,
    /grant all[\s\S]*?to "(?:anon|authenticated)"/i
  );
});