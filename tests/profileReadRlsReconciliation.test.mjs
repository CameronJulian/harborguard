import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migrationPath =
  "supabase/migrations/20260915203000_reconcile_profile_read_rls.sql";

const sql = fs.readFileSync(migrationPath, "utf8");

test("profile RLS migration removes permissive baseline policies", () => {
  assert.match(sql, /DROP POLICY IF EXISTS\s+"Allow all for now"/i);
  assert.match(sql, /DROP POLICY IF EXISTS\s+"authenticated can read profiles"/i);
});

test("profile RLS migration tracks canonical platform-admin helper", () => {
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.is_admin\(\)/i);
  assert.match(sql, /SECURITY DEFINER/i);
  assert.match(sql, /role IN \('admin', 'platform_admin', 'super_admin'\)/i);
  assert.doesNotMatch(sql, /role IN \([^)]*'owner'[^)]*\)/i);
});

test("profile RLS migration recreates the four audited read policies", () => {
  for (const policy of [
    "admins_can_read_all_profiles",
    "profiles_self_select",
    "users_can_read_own_profile",
    "users_can_read_profiles_in_own_organization",
  ]) {
    assert.match(
      sql,
      new RegExp(`CREATE POLICY ${policy}\\b`, "i"),
      `missing ${policy}`
    );
  }
});

test("same-organization profile visibility uses current_user_org_id", () => {
  assert.match(
    sql,
    /users_can_read_profiles_in_own_organization[\s\S]*organization_id\s*=\s*public\.current_user_org_id\(\)/i
  );
});

test("self-read policies remain auth.uid bound", () => {
  assert.match(
    sql,
    /profiles_self_select[\s\S]*id\s*=\s*auth\.uid\(\)/i
  );
  assert.match(
    sql,
    /users_can_read_own_profile[\s\S]*id\s*=\s*auth\.uid\(\)/i
  );
});

test("is_admin execution is authenticated-only", () => {
  assert.match(
    sql,
    /REVOKE ALL ON FUNCTION public\.is_admin\(\)[\s\S]*FROM PUBLIC, anon/i
  );
  assert.match(
    sql,
    /GRANT EXECUTE ON FUNCTION public\.is_admin\(\)[\s\S]*TO authenticated/i
  );
});
