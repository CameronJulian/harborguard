import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260825112000_create_hspp_member_unsuitability_revalidation_basis_writer.sql";

const bytes =
  fs.readFileSync(migrationPath);

const source =
  bytes.toString("utf8");

test("R1-aware Q14x migration is UTF-8 without BOM", () => {
  assert.equal(
    bytes[0],
    0x2d,
  );
});

test("R1-aware Q14v insert validation independently resolves exact R1 evidence", () => {
  assert.match(
    source,
    /create or replace function\s+public\.enforce_hspp_member_unsuitability_revalidation_basis_insert\(\)/i,
  );

  assert.match(
    source,
    /revalidation\.organization_id\s*=\s*new\.organization_id[\s\S]*revalidation\.id\s*=\s*new\.revalidation_evidence_id[\s\S]*revalidation\.integrity_fingerprint\s*=\s*new\.revalidation_integrity_fingerprint/i,
  );
});

test("R1 insert validation binds exact parent C identity", () => {
  assert.match(
    source,
    /v_revalidation\.parent_evidence_id[\s\S]*new\.evidence_id[\s\S]*v_revalidation\.parent_integrity_fingerprint[\s\S]*new\.integrity_fingerprint/i,
  );
});

test("R1 insert validation requires canonical derivation identity", () => {
  assert.match(
    source,
    /post_positive_revalidation/i,
  );

  assert.match(
    source,
    /hspp-post-positive-revalidation-v1/i,
  );
});

test("R1 observation is tied to the prior positive checkpoint and Q14v observed_at", () => {
  assert.match(
    source,
    /v_revalidation\.observed_at\s*<\s*v_positive\.assessed_at/i,
  );

  assert.match(
    source,
    /new\.observed_at\s*<>\s*v_revalidation\.observed_at/i,
  );
});

test("new R1-aware Q14x RPC exposes exactly C identity plus R1 identity and times", () => {
  assert.match(
    source,
    /persist_hspp_member_unsuitability_checkpoint_with_revalidation_under_lease\(\s*p_organization_id uuid,\s*p_assembly_id uuid,\s*p_lease_token uuid,\s*p_evidence_id uuid,\s*p_integrity_fingerprint text,\s*p_revalidation_evidence_id uuid,\s*p_revalidation_integrity_fingerprint text,\s*p_observed_at timestamptz,\s*p_decided_at timestamptz\s*\)/i,
  );
});

test("new R1-aware Q14x RPC remains SECURITY DEFINER with fixed search_path", () => {
  assert.match(
    source,
    /language plpgsql\s+security definer\s+set search_path = public/i,
  );
});

test("new R1-aware Q14x follows assembly-before-lease lock ordering", () => {
  const writerMarker =
    "public.persist_hspp_member_unsuitability_checkpoint_with_revalidation_under_lease(";

  const writerStart =
    source.indexOf(
      writerMarker,
    );

  assert.ok(
    writerStart >= 0,
    "R1-aware Q14x writer must exist.",
  );

  const writerSource =
    source.slice(
      writerStart,
    );

  const assemblyLock =
    /from\s+public\.hspp_evidence_assemblies\s+as assembly[\s\S]*?for key share/i.exec(
      writerSource,
    );

  const leaseLock =
    /from\s+public\.hspp_assembly_assessment_execution_leases\s+as lease[\s\S]*?for update/i.exec(
      writerSource,
    );

  assert.ok(
    assemblyLock,
    "R1-aware Q14x must acquire the historical assembly KEY SHARE lock.",
  );

  assert.ok(
    leaseLock,
    "R1-aware Q14x must acquire the execution-lease FOR UPDATE lock.",
  );

  assert.ok(
    assemblyLock.index < leaseLock.index,
    "R1-aware Q14x must lock the historical assembly before the execution lease.",
  );
});

test("new R1-aware Q14x derives prior-positive C rather than accepting checkpoint identity", () => {
  assert.match(
    source,
    /public\.hspp_assembly_positive_assessment_checkpoints[\s\S]*positive\.organization_id\s*=\s*p_organization_id[\s\S]*positive\.assembly_id\s*=\s*p_assembly_id/i,
  );

  assert.doesNotMatch(
    source,
    /p_prior_positive_checkpoint_id/i,
  );
});

test("new R1-aware Q14x independently verifies exact R1 lineage", () => {
  assert.match(
    source,
    /v_revalidation\.parent_evidence_id[\s\S]*p_evidence_id[\s\S]*v_revalidation\.parent_integrity_fingerprint[\s\S]*p_integrity_fingerprint/i,
  );
});

test("new R1-aware Q14x inserts both exact R1 provenance fields into Q14v", () => {
  assert.match(
    source,
    /insert into\s+public\.hspp_assembly_member_unsuitability_checkpoints[\s\S]*revalidation_evidence_id,[\s\S]*revalidation_integrity_fingerprint/i,
  );

  assert.match(
    source,
    /p_revalidation_evidence_id,[\s\S]*p_revalidation_integrity_fingerprint/i,
  );
});

test("new R1-aware Q14x exact retry includes R1 identity", () => {
  assert.match(
    source,
    /v_checkpoint\.revalidation_evidence_id[\s\S]*p_revalidation_evidence_id/i,
  );

  assert.match(
    source,
    /v_checkpoint\.revalidation_integrity_fingerprint[\s\S]*p_revalidation_integrity_fingerprint/i,
  );
});

test("new R1-aware Q14x returns R1 provenance", () => {
  assert.match(
    source,
    /v_checkpoint\.revalidation_evidence_id,[\s\S]*v_checkpoint\.revalidation_integrity_fingerprint/i,
  );
});

test("R1-aware Q14x emits checkpoint-v2 and policy-v2 only", () => {
  assert.match(
    source,
    /v_positive\.id,[\s\S]*'hspp-assembly-member-unsuitability-checkpoint-v2',[\s\S]*'hspp-post-positive-member-unsuitability-v2',[\s\S]*'POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION'/i,
  );

  assert.match(
    source,
    /v_checkpoint\.checkpoint_version\s*<>[\s\S]*'hspp-assembly-member-unsuitability-checkpoint-v2'[\s\S]*v_checkpoint\.unsuitability_policy_version\s*<>[\s\S]*'hspp-post-positive-member-unsuitability-v2'/i,
  );

  assert.doesNotMatch(
    source,
    /'hspp-assembly-member-unsuitability-checkpoint-v1'/i,
  );

  assert.doesNotMatch(
    source,
    /'hspp-post-positive-member-unsuitability-v1'/i,
  );
});

test("new R1-aware Q14x remains dormant with no application EXECUTE grant", () => {
  assert.doesNotMatch(
    source,
    /grant\s+execute/i,
  );

  assert.match(
    source,
    /revoke all[\s\S]*persist_hspp_member_unsuitability_checkpoint_with_revalidation_under_lease[\s\S]*service_role/i,
  );
});

test("R1-aware Q14x does not collapse later lifecycle stages", () => {
  assert.doesNotMatch(
    source,
    /insert\s+into\s+public\.hspp_assembly_member_effective_cessations/i,
  );

  assert.doesNotMatch(
    source,
    /insert\s+into\s+public\.hspp_evidence_assembly_reconstructions/i,
  );

  assert.doesNotMatch(
    source,
    /runHsppReservoirReevaluation|runHsppReconstructionActivationCycle/i,
  );
});
