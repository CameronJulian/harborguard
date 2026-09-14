import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync(
  "app/api/organization-invitations/route.ts", "utf8"
);
const page = fs.readFileSync("app/admin/invitations/page.tsx", "utf8");

test("API invitation allowlist contains only tenant invitation roles", () => {
  const match = route.match(/const ALLOWED_ROLES = (\[[^;]+\]);/);
  assert.ok(match, "Expected explicit role allowlist");
  assert.deepEqual(JSON.parse(match[1]), ["viewer", "operator", "manager"]);
});

test("API rejects disallowed roles before creating invitations", () => {
  const guard = route.indexOf("if (!ALLOWED_ROLES.includes(inviteRole))");
  const insert = route.indexOf(".insert({");
  assert.ok(guard >= 0 && insert > guard);
  const guardBlock = route.slice(guard, route.indexOf("const token =", guard));
  assert.match(guardBlock, /return NextResponse\.json/);
  assert.match(guardBlock, /status: 400/);
});

test("invitation UI offers only tenant invitation roles", () => {
  const roles = [...page.matchAll(/<option value="([^"]+)"/g)]
    .map(match => match[1]);
  assert.deepEqual(roles, ["viewer", "operator", "manager"]);
});

test("existing inviter authorization and organization scoping are retained", () => {
  assert.match(route, /requireRole\(role, \["owner", "admin"\]\)/);
  assert.match(route, /organization_id: organizationId/);
  assert.match(route, /invited_by: user.id/);
});
