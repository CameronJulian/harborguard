import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260825110500_add_hspp_member_unsuitability_revalidation_basis.sql";

const bytes =
  fs.readFileSync(migrationPath);

const migration =
  bytes.toString("utf8");

test("Q14v revalidation-basis migration is UTF-8 without BOM", () => {
  assert.equal(
    bytes[0],
    0x2d,
  );
});

test("Q14v stores the optional exact R1 evidence identity and fingerprint", () => {
  assert.match(
    migration,
    /add column if not exists\s+revalidation_evidence_id uuid null/i,
  );

  assert.match(
    migration,
    /add column if not exists\s+revalidation_integrity_fingerprint text null/i,
  );
});

test("Q14v requires the R1 provenance tuple to be entirely absent or complete", () => {
  assert.match(
    migration,
    /num_nonnulls\(\s*revalidation_evidence_id,\s*revalidation_integrity_fingerprint\s*\)\s+in\s*\(0,\s*2\)/i,
  );
});

test("Q14v R1 fingerprint is exact lowercase SHA-256", () => {
  assert.match(
    migration,
    /revalidation_integrity_fingerprint\s+~\s+'\^\[a-f0-9\]\{64\}\$'/i,
  );
});

test("Q14v cannot mislabel historical C itself as its later R1 evidence", () => {
  assert.match(
    migration,
    /revalidation_evidence_id\s*<>\s*evidence_id/i,
  );
});

test("Q14v R1 identity is organization scoped and cryptographically bound to hspp_evidence", () => {
  assert.match(
    migration,
    /foreign key\s*\(\s*organization_id,\s*revalidation_evidence_id,\s*revalidation_integrity_fingerprint\s*\)[\s\S]*references\s+public\.hspp_evidence\s*\(\s*organization_id,\s*id,\s*integrity_fingerprint\s*\)[\s\S]*on delete restrict/i,
  );
});

test("Q14v R1 provenance has a bounded lookup index", () => {
  assert.match(
    migration,
    /hspp_member_unsuitability_revalidation_evidence_idx[\s\S]*organization_id,\s*revalidation_evidence_id[\s\S]*where\s+revalidation_evidence_id is not null/i,
  );
});

test("Q14v preserves legacy V1 while introducing an exact R1 V2 version pair", () => {
  assert.match(
    migration,
    /drop constraint if exists\s+hspp_member_unsuitability_checkpoint_version_exact/i,
  );

  assert.match(
    migration,
    /drop constraint if exists\s+hspp_member_unsuitability_policy_version_exact/i,
  );

  assert.match(
    migration,
    /checkpoint_version\s*=\s*'hspp-assembly-member-unsuitability-checkpoint-v1'[\s\S]*unsuitability_policy_version\s*=\s*'hspp-post-positive-member-unsuitability-v1'[\s\S]*revalidation_evidence_id is null[\s\S]*revalidation_integrity_fingerprint is null/i,
  );

  assert.match(
    migration,
    /checkpoint_version\s*=\s*'hspp-assembly-member-unsuitability-checkpoint-v2'[\s\S]*unsuitability_policy_version\s*=\s*'hspp-post-positive-member-unsuitability-v2'[\s\S]*revalidation_evidence_id is not null[\s\S]*revalidation_integrity_fingerprint is not null/i,
  );
});

test("Q14v V1 and R1 V2 cannot be mixed", () => {
  assert.match(
    migration,
    /hspp_member_unsuitability_version_basis_exact/i,
  );

  assert.doesNotMatch(
    migration,
    /checkpoint_version\s*=\s*'hspp-assembly-member-unsuitability-checkpoint-v1'[\s\S]{0,180}unsuitability_policy_version\s*=\s*'hspp-post-positive-member-unsuitability-v2'/i,
  );

  assert.doesNotMatch(
    migration,
    /checkpoint_version\s*=\s*'hspp-assembly-member-unsuitability-checkpoint-v2'[\s\S]{0,180}unsuitability_policy_version\s*=\s*'hspp-post-positive-member-unsuitability-v1'/i,
  );
});

test("this migration adds provenance only and does not introduce lifecycle runtime authority", () => {
  assert.doesNotMatch(
    migration,
    /create\s+or\s+replace\s+function/i,
  );

  assert.doesNotMatch(
    migration,
    /insert\s+into\s+public\.hspp_assembly_member_unsuitability_checkpoints/i,
  );

  assert.doesNotMatch(
    migration,
    /update\s+public\.hspp_assembly_member_unsuitability_checkpoints/i,
  );

  assert.doesNotMatch(
    migration,
    /delete\s+from\s+public\.hspp_assembly_member_unsuitability_checkpoints/i,
  );

  assert.doesNotMatch(
    migration,
    /grant\s+execute/i,
  );
});
