import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.resolve(
  "supabase/migrations/20260823152000_create_hspp_assembly_member_effective_cessations.sql",
);

const sql = fs.readFileSync(migrationPath, "utf8");


test("Q14ab creates one explicit append-only effective-membership cessation authority", () => {
  assert.match(
    sql,
    /create\s+table\s+public\.hspp_assembly_member_effective_cessations\s*\(/i,
  );

  assert.match(
    sql,
    /historical_membership_id\s+uuid\s+not\s+null/i,
  );

  assert.match(
    sql,
    /unsuitability_checkpoint_id\s+uuid\s+not\s+null/i,
  );

  assert.match(
    sql,
    /ceased_at\s+timestamptz\s+not\s+null/i,
  );

  assert.match(
    sql,
    /cessation_version\s+text\s+not\s+null[\s\S]*hspp-assembly-member-effective-cessation-v1/i,
  );

  assert.match(
    sql,
    /cessation_policy_version\s+text\s+not\s+null[\s\S]*hspp-post-positive-effective-membership-cessation-v1/i,
  );

  assert.match(
    sql,
    /POST_POSITIVE_MEMBER_CEASED_CURRENT_EFFECTIVE_MEMBERSHIP/,
  );
});


test("Q14ab binds both exact Q14v authority and exact immutable historical membership", () => {
  assert.match(
    sql,
    /foreign\s+key\s*\(\s*unsuitability_checkpoint_id\s*\)[\s\S]*references\s+public\.hspp_assembly_member_unsuitability_checkpoints\s*\(\s*id\s*\)[\s\S]*on\s+delete\s+restrict/i,
  );

  assert.match(
    sql,
    /foreign\s+key\s*\(\s*historical_membership_id\s*\)[\s\S]*references\s+public\.hspp_evidence_assembly_members\s*\(\s*id\s*\)[\s\S]*on\s+delete\s+restrict/i,
  );

  assert.match(
    sql,
    /hspp_effective_cessation_unsuitability_unique[\s\S]*unique\s*\(\s*unsuitability_checkpoint_id\s*\)/i,
  );

  assert.match(
    sql,
    /hspp_effective_cessation_membership_unique[\s\S]*unique\s*\(\s*historical_membership_id\s*\)/i,
  );

  assert.match(
    sql,
    /hspp_effective_cessation_member_unique[\s\S]*unique\s*\(\s*organization_id\s*,\s*assembly_id\s*,\s*evidence_id\s*\)/i,
  );
});


test("Q14ab derives exact identity and cessation time instead of trusting a caller", () => {
  assert.match(
    sql,
    /from\s+public\.hspp_assembly_member_unsuitability_checkpoints[\s\S]*checkpoint\.id\s*=\s*new\.unsuitability_checkpoint_id/i,
  );

  assert.match(
    sql,
    /from\s+public\.hspp_evidence_assembly_members[\s\S]*membership\.organization_id\s*=\s*v_checkpoint\.organization_id[\s\S]*membership\.assembly_id\s*=\s*v_checkpoint\.assembly_id[\s\S]*membership\.evidence_id\s*=\s*v_checkpoint\.evidence_id[\s\S]*membership\.evidence_integrity_fingerprint\s*=\s*v_checkpoint\.integrity_fingerprint/i,
  );

  assert.match(
    sql,
    /new\.historical_membership_id\s*:=\s*v_membership\.id/i,
  );

  assert.match(
    sql,
    /new\.organization_id\s*:=\s*v_checkpoint\.organization_id/i,
  );

  assert.match(
    sql,
    /new\.assembly_id\s*:=\s*v_checkpoint\.assembly_id/i,
  );

  assert.match(
    sql,
    /new\.evidence_id\s*:=\s*v_checkpoint\.evidence_id/i,
  );

  assert.match(
    sql,
    /new\.integrity_fingerprint\s*:=\s*v_checkpoint\.integrity_fingerprint/i,
  );

  assert.match(
    sql,
    /new\.ceased_at\s*:=\s*v_checkpoint\.decided_at/i,
  );
});


test("Q14ab requires the exact canonical Q14v post-positive reason", () => {
  assert.match(
    sql,
    /v_checkpoint\.checkpoint_version\s*<>[\s\S]*hspp-assembly-member-unsuitability-checkpoint-v1/i,
  );

  assert.match(
    sql,
    /v_checkpoint\.unsuitability_policy_version\s*<>[\s\S]*hspp-post-positive-member-unsuitability-v1/i,
  );

  assert.match(
    sql,
    /v_checkpoint\.unsuitability_reason\s*<>[\s\S]*POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION/i,
  );
});


test("Q14ab authorizes a new cessation only on the current reconstruction lineage leaf", () => {
  assert.match(
    sql,
    /from\s+public\.hspp_evidence_assemblies[\s\S]*assembly\.organization_id\s*=\s*v_checkpoint\.organization_id[\s\S]*assembly\.id\s*=\s*v_checkpoint\.assembly_id[\s\S]*for\s+key\s+share/i,
  );

  assert.match(
    sql,
    /v_assembly_state\s*<>\s*'SEALED'/i,
  );

  assert.match(
    sql,
    /exists\s*\([\s\S]*from\s+public\.hspp_evidence_assembly_reconstructions[\s\S]*reconstruction\.organization_id\s*=\s*v_checkpoint\.organization_id[\s\S]*reconstruction\.parent_assembly_id\s*=\s*v_checkpoint\.assembly_id[\s\S]*\)/i,
  );

  assert.match(
    sql,
    /already\s+has\s+a\s+reconstruction\s+successor/i,
  );
});


test("Q14ab is immutable and exposes no direct service-role mutation authority", () => {
  assert.match(
    sql,
    /create\s+or\s+replace\s+function\s+public\.prevent_hspp_assembly_member_effective_cessation_changes\s*\(\)/i,
  );

  assert.match(
    sql,
    /before\s+update[\s\S]*on\s+public\.hspp_assembly_member_effective_cessations[\s\S]*prevent_hspp_assembly_member_effective_cessation_changes/i,
  );

  assert.match(
    sql,
    /before\s+delete[\s\S]*on\s+public\.hspp_assembly_member_effective_cessations[\s\S]*prevent_hspp_assembly_member_effective_cessation_changes/i,
  );

  assert.match(
    sql,
    /enable\s+row\s+level\s+security/i,
  );

  assert.match(
    sql,
    /revoke\s+all[\s\S]*on\s+table\s+public\.hspp_assembly_member_effective_cessations[\s\S]*from\s+service_role/i,
  );

  assert.match(
    sql,
    /grant\s+select[\s\S]*on\s+table\s+public\.hspp_assembly_member_effective_cessations[\s\S]*to\s+service_role/i,
  );

  assert.doesNotMatch(
    sql,
    /grant\s+(?:insert|update|delete|all)[\s\S]*on\s+table\s+public\.hspp_assembly_member_effective_cessations[\s\S]*to\s+service_role/i,
  );
});


test("Q14ab does not collapse cessation into Reservoir, reconstruction, or downstream authority", () => {
  assert.match(
    sql,
    /does\s+not\s+itself\s+return\s+evidence\s+to\s+Reservoir/i,
  );

  assert.match(
    sql,
    /does\s+not\s+itself[\s\S]*authorize\s+descendant\s+reconstruction/i,
  );

  assert.doesNotMatch(
    sql,
    /persist_hspp_evidence_assembly_reconstruction\s*\(/i,
  );

  assert.doesNotMatch(
    sql,
    /insert\s+into\s+public\.hspp_evidence_assembly_reconstructions/i,
  );

  assert.doesNotMatch(
    sql,
    /insert\s+into\s+public\.hspp_evidence_assembly_reconstruction_changes/i,
  );
});