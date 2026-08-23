import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  new URL(
    "../supabase/migrations/20260823060000_persist_hspp_evidence_assembly_reconstruction.sql",
    import.meta.url,
  ),
  "utf8",
);

const executable = migration
  .replace(/--.*$/gm, "")
  .replace(/'(?:''|[^'])*'/g, "''");

test("Q14h creates one narrowly scoped service-role-only reconstruction RPC", () => {
  assert.match(
    executable,
    /create\s+or\s+replace\s+function\s+public\.persist_hspp_evidence_assembly_reconstruction\s*\([\s\S]*p_organization_id\s+uuid[\s\S]*p_parent_assembly_id\s+uuid[\s\S]*p_child_assembly_id\s+uuid[\s\S]*p_members\s+jsonb[\s\S]*security\s+definer/i,
  );

  assert.match(
    executable,
    /revoke\s+all[\s\S]*on\s+function\s+public\.persist_hspp_evidence_assembly_reconstruction[\s\S]*from[\s\S]*public[\s\S]*anon[\s\S]*authenticated[\s\S]*service_role/i,
  );

  assert.match(
    executable,
    /grant\s+execute[\s\S]*on\s+function\s+public\.persist_hspp_evidence_assembly_reconstruction[\s\S]*to\s+service_role/i,
  );
});

test("Q14h requires one immutable SEALED historical parent", () => {
  assert.match(
    executable,
    /from\s+public\.hspp_evidence_assemblies\s+as\s+parent_assembly[\s\S]*p_parent_assembly_id[\s\S]*for\s+update/i,
  );

  assert.match(
    migration,
    /v_parent_state\s*<>\s*'SEALED'/i,
  );

  assert.match(
    migration,
    /p_parent_assembly_id\s*=\s*p_child_assembly_id/i,
  );
});

test("Q14h serializes evidence with the existing K5 lock identity", () => {
  assert.match(
    migration,
    /pg_advisory_xact_lock\s*\([\s\S]*harborguard:hspp-evidence-assembly-membership:[\s\S]*p_organization_id[\s\S]*v_lock_evidence_id/i,
  );

  assert.match(
    executable,
    /order\s+by\s+supplied\.evidence_id/i,
  );
});

test("Q14h creates child then reconstruction then members then delta", () => {
  const childPosition = executable.search(
    /insert\s+into\s+public\.hspp_evidence_assemblies/i,
  );

  const reconstructionPosition = executable.search(
    /insert\s+into\s+public\.hspp_evidence_assembly_reconstructions/i,
  );

  const memberPosition = executable.search(
    /insert\s+into\s+public\.hspp_evidence_assembly_members\s*\(/i,
  );

  const deltaPosition = executable.search(
    /insert\s+into\s+public\.hspp_evidence_assembly_reconstruction_changes/i,
  );

  assert.ok(childPosition >= 0);
  assert.ok(reconstructionPosition > childPosition);
  assert.ok(memberPosition > reconstructionPosition);
  assert.ok(deltaPosition > memberPosition);

  assert.match(
    migration,
    /p_child_assembly_id[\s\S]*'OPEN'/i,
  );
});

test("Q14h derives retained versus original membership rather than trusting caller provenance", () => {
  assert.match(
    executable,
    /left\s+join\s+public\.hspp_evidence_assembly_members\s+as\s+parent_member/i,
  );

  assert.match(
    migration,
    /when\s+parent_member\.id\s+is\s+null[\s\S]*then\s+'ORIGINAL'[\s\S]*else\s+'RETAINED'/i,
  );

  assert.match(
    executable,
    /membership_kind[\s\S]*source_membership_id/i,
  );

  assert.doesNotMatch(
    migration,
    /->>\s*'membershipKind'/i,
  );

  assert.doesNotMatch(
    migration,
    /->>\s*'sourceMembershipId'/i,
  );
});

test("Q14h derives exact removed and added delta and rejects a no-op reconstruction", () => {
  assert.match(
    migration,
    /'REMOVED'/,
  );

  assert.match(
    migration,
    /'ADDED'/,
  );

  assert.match(
    executable,
    /parent_member\.evidence_id\s*=\s*any\s*\(\s*v_member_ids\s*\)/i,
  );

  assert.match(
    executable,
    /v_removed_count\s*\+\s*v_added_count\s*=\s*0/i,
  );

  assert.doesNotMatch(
    executable,
    /\bp_changes\b/i,
  );
});

test("Q14h uses caller-owned child identity for exact idempotent recovery", () => {
  assert.match(
    executable,
    /select\s+child_assembly\.\*[\s\S]*p_child_assembly_id[\s\S]*for\s+update/i,
  );

  assert.match(
    executable,
    /v_existing_reconstruction/i,
  );

    assert.match(
    executable,
    /existing_original\.assembly_id\s*<>\s*p_child_assembly_id/i,
  );

assert.match(
    executable,
    /\bexcept\b/i,
  );

  assert.match(
    executable,
    /idempotent_recovery\s+boolean/i,
  );

  assert.doesNotMatch(
    executable,
    /on\s+conflict\s+do\s+update/i,
  );
});

test("Q14h does not fabricate pair-only B11A2 relation provenance", () => {
  assert.doesNotMatch(
    executable,
    /\bp_membership_relation\b/i,
  );

  assert.doesNotMatch(
    executable,
    /insert\s+into\s+public\.hspp_evidence_assembly_membership_relations/i,
  );
});

test("Q14h does not replace the generic K5 persistence RPC", () => {
  assert.doesNotMatch(
    executable,
    /create\s+or\s+replace\s+function\s+public\.persist_hspp_evidence_assembly\s*\(/i,
  );
});

test("Q14h does not cross downstream lifecycle or authority boundaries", () => {
  assert.doesNotMatch(
    executable,
    /seal_hspp_evidence_assembly/i,
  );

  assert.doesNotMatch(
    executable,
    /hspp_assembly_decisions/i,
  );

  assert.doesNotMatch(
    executable,
    /\broute_safety\b|\bcrowd\b|\btraining\b|\breservoir\b/i,
  );

  assert.doesNotMatch(
    executable,
    /update\s+public\.hspp_evidence_assemblies/i,
  );

  assert.doesNotMatch(
    executable,
    /delete\s+from\s+public\.hspp_evidence_assemblies/i,
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
