import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const route = fs.readFileSync(
  "app/api/organization-invitations/route.ts",
  "utf8"
);

const migration = fs.readFileSync(
  "supabase/migrations/20260915154000_reconcile_invitation_inviter_boundary.sql",
  "utf8"
);

test("invitation API keeps the canonical tenant inviter boundary", () => {
  const matches = [
    ...route.matchAll(
      /requireRole\s*\(\s*role\s*,\s*\[\s*"owner"\s*,\s*"admin"\s*\]\s*\)/g
    ),
  ];

  assert.equal(
    matches.length,
    3,
    "GET, POST and DELETE must all require owner/admin"
  );
});

test("migration recreates all four invitation policies", () => {
  for (const policy of [
    "admins_select_org_invitations",
    "admins_insert_org_invitations",
    "admins_update_org_invitations",
    "admins_delete_org_invitations",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `DROP POLICY IF EXISTS\\s+${policy}[\\s\\S]*?organization_invitations`,
        "i"
      )
    );

    assert.match(
      migration,
      new RegExp(
        `CREATE POLICY\\s+${policy}[\\s\\S]*?organization_invitations`,
        "i"
      )
    );
  }
});

test("every invitation policy uses owner/admin as the tenant boundary", () => {
  const roleClauses = [
    ...migration.matchAll(
      /profiles\.role\s+IN\s*\(([^)]+)\)/gi
    ),
  ];

  assert.equal(
    roleClauses.length,
    5,
    "select, insert, update USING, update WITH CHECK and delete each need a role clause"
  );

  for (const match of roleClauses) {
    const roles = [
      ...match[1].matchAll(/'([^']+)'/g),
    ].map((item) => item[1]);

    assert.deepEqual(
      roles,
      ["owner", "admin"]
    );
  }
});

test("migration removes platform-wide roles from invitation RLS", () => {
  assert.doesNotMatch(
    migration,
    /platform_admin|super_admin/
  );
});

test("migration does not alter invited-role constraint or invitation data", () => {
  assert.doesNotMatch(
    migration,
    /organization_invitations_tenant_role_check/
  );

  assert.doesNotMatch(
    migration,
    /\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?public\.organization_invitations\b/i
  );

  assert.doesNotMatch(
    migration,
    /\bALTER\s+TABLE\s+public\.organization_invitations\b/i
  );
});

test("migration keeps policies scoped by auth user and organization", () => {
  assert.match(
    migration,
    /profiles\.id\s*=\s*auth\.uid\(\)/i
  );

  assert.match(
    migration,
    /organization_id\s+IN\s*\([\s\S]*?profiles\.organization_id/i
  );
});
