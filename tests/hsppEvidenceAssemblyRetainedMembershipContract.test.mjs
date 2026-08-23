import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260823052000_add_hspp_retained_assembly_membership.sql";

const priorPersistencePath =
  "supabase/migrations/20260821210500_persist_hspp_assembly_membership_relation.sql";

const migration = readFileSync(migrationPath, "utf8");
const priorPersistence = readFileSync(priorPersistencePath, "utf8");

test("Q14e distinguishes ORIGINAL from RETAINED assembly membership", () => {
  assert.match(
    migration,
    /add column membership_kind text not null\s+default 'ORIGINAL'/i,
  );

  assert.match(
    migration,
    /add column source_membership_id uuid null/i,
  );

  assert.match(
    migration,
    /membership_kind in\s*\(\s*'ORIGINAL',\s*'RETAINED'\s*\)/i,
  );

  assert.match(
    migration,
    /membership_kind = 'ORIGINAL'[\s\S]*source_membership_id is null[\s\S]*membership_kind = 'RETAINED'[\s\S]*source_membership_id is not null/i,
  );

  assert.match(
    migration,
    /foreign key\s*\(\s*source_membership_id\s*\)[\s\S]*references public\.hspp_evidence_assembly_members\s*\(\s*id\s*\)/i,
  );
});

test("Q14e narrows single-membership to one ORIGINAL membership instead of deleting safety", () => {
  assert.match(
    migration,
    /drop constraint\s+hspp_evidence_assembly_members_org_evidence_single_assembly/i,
  );

  assert.match(
    migration,
    /create unique index\s+hspp_evidence_assembly_members_org_evidence_original_unique[\s\S]*organization_id\s*,\s*evidence_id[\s\S]*where membership_kind = 'ORIGINAL'/i,
  );

  assert.match(
    migration,
    /narrowed single-origin invariant/i,
  );
});

test("Q14e retained membership must preserve exact source identity and immediate reconstruction parentage", () => {
  assert.match(
    migration,
    /create or replace function\s+public\.enforce_hspp_retained_assembly_membership_insert\(\)/i,
  );

  assert.match(
    migration,
    /source\.id = new\.source_membership_id/i,
  );

  assert.match(
    migration,
    /v_source_organization_id <> new\.organization_id/i,
  );

  assert.match(
    migration,
    /v_source_evidence_id <> new\.evidence_id/i,
  );

  assert.match(
    migration,
    /v_source_integrity_fingerprint <>[\s\S]*new\.evidence_integrity_fingerprint/i,
  );

  assert.match(
    migration,
    /from public\.hspp_evidence_assembly_reconstructions reconstruction[\s\S]*reconstruction\.parent_assembly_id\s*=\s*v_source_assembly_id[\s\S]*reconstruction\.child_assembly_id\s*=\s*new\.assembly_id/i,
  );

  assert.match(
    migration,
    /before insert[\s\S]*on public\.hspp_evidence_assembly_members[\s\S]*enforce_hspp_retained_assembly_membership_insert/i,
  );
});

test("Q14e leaves the generic assembly persistence path fail-closed for already assembled evidence", () => {
  assert.doesNotMatch(
    migration,
    /create or replace function\s+public\.persist_hspp_evidence_assembly\s*\(/i,
  );

  assert.match(
    priorPersistence,
    /HSPP evidence % is already assembled in assembly %\./i,
  );

  assert.match(
    priorPersistence,
    /pg_advisory_xact_lock/i,
  );
});

test("Q14e creates no H2, reconstruction writer, Reservoir transition or downstream authority", () => {
  const executable =
    migration.replace(/--.*$/gm, "");

  assert.doesNotMatch(
    executable,
    /insert\s+into\s+public\.hspp_evidence_assemblies/i,
  );

  assert.doesNotMatch(
    executable,
    /insert\s+into\s+public\.hspp_evidence_assembly_reconstructions/i,
  );

  assert.doesNotMatch(
    executable,
    /insert\s+into\s+public\.hspp_evidence_assembly_reconstruction_changes/i,
  );

  assert.doesNotMatch(
    executable,
    /create\s+or\s+replace\s+function\s+public\.(?:create|persist|reconstruct|supersede|detach)_hspp/i,
  );

  assert.doesNotMatch(
    executable,
    /grant\s+(?:insert|update|delete)/i,
  );

  assert.doesNotMatch(
    executable,
    /update\s+public\.hspp_evidence_assembly_members/i,
  );

  assert.doesNotMatch(
    executable,
    /delete\s+from\s+public\.hspp_evidence_assembly_members/i,
  );
});