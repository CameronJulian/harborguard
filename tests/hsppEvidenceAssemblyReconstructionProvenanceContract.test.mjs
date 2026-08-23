import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260823050000_create_hspp_evidence_assembly_reconstruction_provenance.sql",
  import.meta.url,
);

const source = fs.readFileSync(migrationUrl, "utf8");

const executableSource = source.replace(
  /--.*$/gm,
  "",
);

test("Q14c creates explicit parent-child reconstruction provenance", () => {
  assert.match(
    executableSource,
    /create table public\.hspp_evidence_assembly_reconstructions/i,
  );

  assert.match(
    executableSource,
    /parent_assembly_id uuid not null/i,
  );

  assert.match(
    executableSource,
    /child_assembly_id uuid not null/i,
  );

  assert.match(
    executableSource,
    /constraint hspp_reconstruction_parent_child_distinct[\s\S]*parent_assembly_id\s*<>\s*child_assembly_id/i,
  );

  assert.match(
    executableSource,
    /constraint hspp_reconstruction_parent_fk[\s\S]*references public\.hspp_evidence_assemblies[\s\S]*organization_id[\s\S]*id/i,
  );

  assert.match(
    executableSource,
    /constraint hspp_reconstruction_child_fk[\s\S]*references public\.hspp_evidence_assemblies[\s\S]*organization_id[\s\S]*id/i,
  );

  assert.match(
    executableSource,
    /constraint hspp_reconstruction_child_unique[\s\S]*organization_id[\s\S]*child_assembly_id/i,
  );
});


test("Q14c records immutable REMOVED and ADDED evidence provenance", () => {
  assert.match(
    executableSource,
    /create table public\.hspp_evidence_assembly_reconstruction_changes/i,
  );

  assert.match(
    executableSource,
    /change_kind text not null/i,
  );

  assert.match(
    executableSource,
    /change_kind in\s*\(\s*'REMOVED',\s*'ADDED'\s*\)/i,
  );

  assert.match(
    executableSource,
    /evidence_id uuid not null/i,
  );

  assert.match(
    executableSource,
    /evidence_integrity_fingerprint text not null/i,
  );

  assert.match(
    executableSource,
    /evidence_integrity_fingerprint\s*~\s*'\^\[0-9a-f\]\{64\}\$'/i,
  );

  assert.match(
    executableSource,
    /constraint hspp_reconstruction_change_evidence_fk[\s\S]*references public\.hspp_evidence[\s\S]*organization_id[\s\S]*id[\s\S]*integrity_fingerprint/i,
  );

  assert.match(
    executableSource,
    /constraint hspp_reconstruction_change_ordinal_unique/i,
  );
});


test("Q14c provenance is immutable after insertion", () => {
  assert.match(
    executableSource,
    /create or replace function\s+public\.prevent_hspp_reconstruction_provenance_changes\(\)/i,
  );

  assert.match(
    executableSource,
    /prevent_hspp_reconstruction_update_delete[\s\S]*before update or delete[\s\S]*hspp_evidence_assembly_reconstructions/i,
  );

  assert.match(
    executableSource,
    /prevent_hspp_reconstruction_change_update_delete[\s\S]*before update or delete[\s\S]*hspp_evidence_assembly_reconstruction_changes/i,
  );

  assert.match(
    executableSource,
    /reconstruction provenance is immutable and cannot be changed/i,
  );
});


test("Q14c exposes no direct reconstruction write authority", () => {
  assert.match(
    executableSource,
    /alter table\s+public\.hspp_evidence_assembly_reconstructions\s+enable row level security/i,
  );

  assert.match(
    executableSource,
    /alter table\s+public\.hspp_evidence_assembly_reconstruction_changes\s+enable row level security/i,
  );

  assert.match(
    executableSource,
    /grant select[\s\S]*hspp_evidence_assembly_reconstructions[\s\S]*to service_role/i,
  );

  assert.match(
    executableSource,
    /grant select[\s\S]*hspp_evidence_assembly_reconstruction_changes[\s\S]*to service_role/i,
  );

  assert.doesNotMatch(
    executableSource,
    /grant\s+(insert|update|delete)/i,
  );

  assert.doesNotMatch(
    executableSource,
    /insert\s+into/i,
  );
});


test("Q14c does not relax existing assembly membership safety", () => {
  assert.doesNotMatch(
    executableSource,
    /alter\s+table\s+public\.hspp_evidence_assembly_members/i,
  );

  assert.doesNotMatch(
    executableSource,
    /drop\s+constraint[\s\S]*hspp_evidence_assembly_members_org_evidence_single_assembly/i,
  );

  assert.doesNotMatch(
    executableSource,
    /create\s+or\s+replace\s+function\s+public\.(persist|create|reconstruct|supersede|detach)_hspp/i,
  );
});