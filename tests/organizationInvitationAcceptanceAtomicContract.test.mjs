import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql = fs.readFileSync(
  "supabase/migrations/20260915160000_accept_organization_invitation_atomically.sql",
  "utf8"
);

test("acceptance identity comes only from the authenticated session", () => {
  assert.match(sql, /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i);
  assert.match(sql, /FROM\s+auth\.users\s+AS\s+u/i);
  assert.match(sql, /u\.id\s*=\s*v_user_id/i);
  assert.doesNotMatch(sql, /p_user_id/i);
});

test("authenticated identity is locked before acceptance proceeds", () => {
  assert.match(
    sql,
    /FROM\s+auth\.users\s+AS\s+u[\s\S]*?FOR\s+UPDATE/i
  );
});

test("invitation token row is locked and validated", () => {
  assert.match(
    sql,
    /FROM\s+public\.organization_invitations\s+AS\s+invitation[\s\S]*?WHERE\s+invitation\.token\s*=\s*p_token[\s\S]*?FOR\s+UPDATE/i
  );

  assert.match(
    sql,
    /v_invitation_accepted_at\s+IS\s+NOT\s+NULL/i
  );

  assert.match(
    sql,
    /v_invitation_expires_at\s*<=\s*clock_timestamp\(\)/i
  );
});

test("invitation email must match the authenticated auth email", () => {
  assert.match(
    sql,
    /lower\s*\(\s*btrim\s*\(\s*u\.email\s*\)\s*\)/i
  );

  assert.match(
    sql,
    /lower\s*\(\s*btrim\s*\(\s*invitation\.email\s*\)\s*\)/i
  );

  assert.match(
    sql,
    /v_invitation_email\s*<>\s*v_user_email/i
  );
});

test("only tenant invitation roles can be applied", () => {
  assert.match(
    sql,
    /v_invitation_role\s+NOT\s+IN\s*\(\s*'viewer'\s*,\s*'operator'\s*,\s*'manager'\s*\)/i
  );

  assert.doesNotMatch(
    sql,
    /v_invitation_role\s+NOT\s+IN[\s\S]*?'owner'/i
  );
});

test("existing organization membership cannot be replaced", () => {
  assert.match(
    sql,
    /FROM\s+public\.profiles\s+AS\s+profile[\s\S]*?WHERE\s+profile\.id\s*=\s*v_user_id[\s\S]*?FOR\s+UPDATE/i
  );

  assert.match(
    sql,
    /v_profile_found\s+AND\s+v_profile_organization_id\s+IS\s+NOT\s+NULL/i
  );

  assert.match(
    sql,
    /User already belongs to an organization/i
  );
});

test("unassigned existing profile receives invitation organization and role", () => {
  assert.match(
    sql,
    /UPDATE\s+public\.profiles[\s\S]*?organization_id\s*=\s*v_invitation_organization_id[\s\S]*?role\s*=\s*v_invitation_role/i
  );

  assert.match(
    sql,
    /WHERE\s+id\s*=\s*v_user_id[\s\S]*?organization_id\s+IS\s+NULL/i
  );
});

test("missing profile is created from authenticated identity", () => {
  assert.match(
    sql,
    /INSERT\s+INTO\s+public\.profiles[\s\S]*?v_user_id[\s\S]*?v_user_email[\s\S]*?v_invitation_role[\s\S]*?v_invitation_organization_id/i
  );
});

test("acceptance is marked only after membership succeeds", () => {
  const membershipPosition = Math.max(
    sql.indexOf("UPDATE public.profiles"),
    sql.indexOf("INSERT INTO public.profiles")
  );

  const acceptedPosition =
    sql.indexOf("UPDATE public.organization_invitations");

  assert.ok(membershipPosition >= 0);
  assert.ok(acceptedPosition > membershipPosition);

  assert.match(
    sql,
    /SET\s+accepted_at\s*=\s*clock_timestamp\(\)/i
  );
});

test("RPC is hardened and executable only by authenticated callers", () => {
  assert.match(sql, /SECURITY\s+DEFINER/i);
  assert.match(sql, /SET\s+search_path\s*=\s*''/i);

  assert.match(
    sql,
    /REVOKE\s+ALL[\s\S]*?FROM\s+PUBLIC\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i
  );

  assert.match(
    sql,
    /GRANT\s+EXECUTE[\s\S]*?TO\s+authenticated/i
  );
});
