import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260821181500_add_hspp_evidence_single_assembly_membership.sql";

const source = fs.readFileSync(migrationPath, "utf8");

test("B07C1a adds the authoritative organization evidence single-membership invariant", () => {
  assert.match(
    source,
    /hspp_evidence_assembly_members_org_evidence_single_assembly/,
  );

  assert.match(source, /unique\s*\(\s*organization_id,\s*evidence_id\s*\)/s);
});

test("B07C1a fails closed if historical duplicate memberships exist", () => {
  assert.match(source, /group by\s*organization_id,\s*evidence_id/s);

  assert.match(source, /having count\(\*\) > 1/);

  assert.match(source, /Cannot enforce HSPP single-assembly membership/);
});

test("B07C1a serializes claims with transaction-level advisory locks", () => {
  assert.match(source, /pg_advisory_xact_lock\s*\(/);

  assert.match(source, /hashtextextended\s*\(/);

  assert.match(source, /harborguard:hspp-evidence-assembly-membership:/);

  assert.match(source, /p_organization_id::text/);

  assert.match(source, /v_lock_evidence_id::text/);
});

test("B07C1a acquires evidence locks in deterministic sorted order", () => {
  assert.match(
    source,
    /for v_lock_evidence_id in[\s\S]*order by evidence_id[\s\S]*loop/s,
  );

  const lockPosition = source.indexOf("pg_advisory_xact_lock");

  const membershipCheckPosition = source.indexOf(
    "from public.hspp_evidence_assembly_members",
    lockPosition,
  );

  const assemblyInsertPosition = source.indexOf(
    "insert into public.hspp_evidence_assemblies",
    lockPosition,
  );

  assert.ok(lockPosition >= 0);

  assert.ok(membershipCheckPosition > lockPosition);

  assert.ok(assemblyInsertPosition > membershipCheckPosition);
});

test("B07C1a rechecks current assembly membership after locks are held", () => {
  assert.match(
    source,
    /from public\.hspp_evidence_assembly_members\s+as members/s,
  );

  assert.match(source, /members\.organization_id\s*=\s*p_organization_id/s);

  assert.match(source, /members\.evidence_id in\s*\(/s);

  assert.match(source, /is already assembled in assembly/);
});

test("B07C1a preserves atomic assembly and initial member insertion", () => {
  assert.match(
    source,
    /create or replace function public\.persist_hspp_evidence_assembly/,
  );

  assert.match(source, /insert into public\.hspp_evidence_assemblies/);

  assert.match(source, /insert into public\.hspp_evidence_assembly_members/);

  assert.match(source, /language plpgsql/);
});

test("B07C1a preserves service-role-only RPC execution", () => {
  assert.match(
    source,
    /revoke all[\s\S]*from\s+public,\s*anon,\s*authenticated/s,
  );

  assert.match(source, /grant execute[\s\S]*to service_role/s);

  assert.match(source, /security invoker/);
});

test("B07C1a does not move downstream HSPP authority into persistence", () => {
  assert.match(source, /does NOT/i);

  assert.match(source, /B11A2 membership evaluation/);

  assert.match(source, /seal an evidence assembly/);

  assert.match(source, /alter evidence trust/);

  assert.match(source, /Route Safety authority/);

  assert.match(source, /Crowd Intelligence eligibility/);

  assert.match(source, /ML training or validation eligibility/);
});
