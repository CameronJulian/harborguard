import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const routePath = "app/api/payfast/notify/route.ts";
const migrationPath =
  "supabase/migrations/20260916130000_activate_payfast_subscription_atomically.sql";

const route = fs.readFileSync(routePath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");

test("PayFast payment identity is protected by a database uniqueness invariant", () => {
  assert.match(
    migration,
    /add constraint\s+invoices_payfast_payment_id_unique[\s\S]*?unique\s*\(\s*payfast_payment_id\s*\)/i
  );

  assert.match(
    migration,
    /on conflict on constraint\s+invoices_payfast_payment_id_unique[\s\S]*?do nothing/i
  );
});

test("PayFast COMPLETE activation is one atomic PostgreSQL function", () => {
  assert.match(
    migration,
    /create or replace function\s+public\.activate_payfast_subscription_atomically/i
  );

  assert.match(
    migration,
    /insert into public\.invoices[\s\S]*?update public\.organizations[\s\S]*?insert into public\.billing_events/i
  );

  assert.match(
    migration,
    /if v_invoice_id is null then[\s\S]*?select false,\s*true/i
  );

  assert.match(
    migration,
    /return query[\s\S]*?select true,\s*false/i
  );
});

test("PayFast atomic activation RPC is restricted to service_role", () => {
  assert.match(
    migration,
    /grant execute[\s\S]*?activate_payfast_subscription_atomically[\s\S]*?to service_role/i
  );

  assert.match(
    migration,
    /revoke all[\s\S]*?activate_payfast_subscription_atomically[\s\S]*?from authenticated/i
  );
});

test("PayFast notify delegates COMPLETE lifecycle mutation to the atomic RPC", () => {
  assert.match(
    route,
    /\.rpc\(\s*"activate_payfast_subscription_atomically"/
  );

  assert.doesNotMatch(
    route,
    /\.from\("organizations"\)[\s\S]*?\.update\(\{[\s\S]*?subscription_status:\s*"active"/
  );

  assert.doesNotMatch(
    route,
    /\.from\("billing_events"\)\.insert\(\{[\s\S]*?subscription_activated/
  );

  assert.doesNotMatch(
    route,
    /\.from\("invoices"\)[\s\S]*?\.insert\(\{[\s\S]*?payfast_payment_id/
  );
});

test("PayFast notify preserves duplicate acknowledgement semantics", () => {
  assert.match(
    route,
    /activation\?\.duplicate === true[\s\S]*?success:\s*true,[\s\S]*?duplicate:\s*true/
  );

  assert.match(
    route,
    /activation\?\.processed !== true[\s\S]*?Webhook processing failed/
  );
});
