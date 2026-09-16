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
  assert.match(route, /const rawBody\s*=\s*[\s\S]*?readPayFastItnBody\(req\)/);
  assert.match(route, /p_payload:\s*payload/);
  assert.match(route, /p_raw_payload:\s*rawBody/);
});

test("billing events persist parsed JSON and original raw ITN separately", () => {
  assert.match(migration, /add column if not exists raw_payload text/);
  assert.match(migration, /p_payload jsonb/);
  assert.match(migration, /p_raw_payload text default null/);
  assert.match(
    migration,
    /insert into public\.billing_events\s*\([\s\S]*?payload,[\s\S]*?raw_payload[\s\S]*?\)/
  );
  assert.match(
    migration,
    /coalesce\(p_payload,\s*'\{\}'::jsonb\),[\s\S]*?p_raw_payload/
  );
});

test("migration removes obsolete seven-argument PayFast RPC", () => {
  assert.match(
    migration,
    /drop function if exists public\.activate_payfast_subscription_atomically\s*\(\s*uuid,\s*text,\s*text,\s*timestamptz,\s*numeric,\s*text,\s*jsonb\s*\)/i
  );
});

test("eight-argument RPC preserves hardened execution semantics", () => {
  assert.match(migration, /security invoker/i);
  assert.match(migration, /set search_path\s*=\s*public,\s*pg_temp/i);
  assert.match(migration, /if p_organization_id is null then/i);
  assert.match(
    migration,
    /p_payfast_payment_id is null[\s\S]*?btrim\(p_payfast_payment_id\)\s*=\s*''/i
  );
  assert.match(migration, /coalesce\(p_amount,\s*0\)/i);
  assert.match(
    migration,
    /coalesce\(nullif\(btrim\(p_currency\),\s*''\),\s*'ZAR'\)/i
  );
  assert.match(migration, /trial_ends_at\s*=\s*null/i);
  assert.match(
    migration,
    /get diagnostics[\s\S]*?v_updated_rows\s*=\s*row_count/i
  );
  assert.match(migration, /if v_updated_rows\s*<>\s*1 then/i);
});

test("raw ITN RPC remains service-role only", () => {
  assert.match(migration, /revoke all[\s\S]*?from public/i);
  assert.match(migration, /revoke all[\s\S]*?from anon/i);
  assert.match(migration, /revoke all[\s\S]*?from authenticated/i);
  assert.match(migration, /grant execute[\s\S]*?to service_role/i);

  assert.doesNotMatch(
    migration,
    /grant\s+(?:all|execute)[\s\S]*?to\s+(?:anon|authenticated)/i
  );
});

test("duplicate payment still exits before lifecycle mutation", () => {
  const duplicateIndex =
    migration.search(/if v_invoice_id is null then/i);

  const organizationUpdateIndex =
    migration.search(/update public\.organizations/i);

  const billingEventIndex =
    migration.search(/insert into public\.billing_events/i);

  assert.ok(duplicateIndex >= 0);
  assert.ok(organizationUpdateIndex >= 0);
  assert.ok(billingEventIndex >= 0);

  assert.ok(duplicateIndex < organizationUpdateIndex);
  assert.ok(duplicateIndex < billingEventIndex);

  assert.match(
    migration,
    /if v_invoice_id is null then[\s\S]*?select false,\s*true[\s\S]*?return;/i
  );
});