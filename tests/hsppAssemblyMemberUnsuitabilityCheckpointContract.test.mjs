import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const migrationPath =
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
    "20260823125000_create_hspp_assembly_member_unsuitability_checkpoints.sql",
  );


const sql =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );


test(
  "Q14v creates one append-only assembly-member unsuitability substrate",
  () => {
    assert.match(
      sql,
      /create\s+table\s+public\.hspp_assembly_member_unsuitability_checkpoints/i,
    );

    for (const column of [
      "organization_id",
      "assembly_id",
      "evidence_id",
      "integrity_fingerprint",
      "prior_positive_checkpoint_id",
      "checkpoint_version",
      "unsuitability_policy_version",
      "unsuitability_reason",
      "observed_at",
      "decided_at",
      "created_at",
    ]) {
      assert.match(
        sql,
        new RegExp(`\\b${column}\\b`, "i"),
      );
    }
  },
);


test(
  "Q14v binds the exact historical Q14p positive identity",
  () => {
    assert.match(
      sql,
      /references\s+public\.hspp_assembly_positive_assessment_checkpoints\s*\(\s*id\s*\)/i,
    );

    assert.match(
      sql,
      /v_positive\.organization_id\s*<>\s*new\.organization_id/i,
    );

    assert.match(
      sql,
      /v_positive\.assembly_id\s*<>\s*new\.assembly_id/i,
    );

    assert.match(
      sql,
      /v_positive\.evidence_id\s*<>\s*new\.evidence_id/i,
    );

    assert.match(
      sql,
      /v_positive\.integrity_fingerprint\s*<>\s*new\.integrity_fingerprint/i,
    );
  },
);


test(
  "Q14v requires exact immutable membership of a historical SEALED assembly",
  () => {
    assert.match(
      sql,
      /v_assembly_state\s*<>\s*'SEALED'/i,
    );

    assert.match(
      sql,
      /from\s+public\.hspp_evidence_assembly_members\s+as\s+member/i,
    );

    assert.match(
      sql,
      /member\.organization_id\s*=\s*new\.organization_id/i,
    );

    assert.match(
      sql,
      /member\.assembly_id\s*=\s*new\.assembly_id/i,
    );

    assert.match(
      sql,
      /member\.evidence_id\s*=\s*new\.evidence_id/i,
    );

    assert.match(
      sql,
      /member\.evidence_integrity_fingerprint\s*=\s*new\.integrity_fingerprint/i,
    );
  },
);


test(
  "Q14v v1 policy and reason are deterministic",
  () => {
    assert.match(
      sql,
      /hspp-assembly-member-unsuitability-checkpoint-v1/,
    );

    assert.match(
      sql,
      /hspp-post-positive-member-unsuitability-v1/,
    );

    assert.match(
      sql,
      /POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION/,
    );

    assert.match(
      sql,
      /decided_at\s*>=\s*observed_at/i,
    );
  },
);


test(
  "Q14v requires unsuitability observation to be post-positive",
  () => {
    assert.match(
      sql,
      /new\.observed_at\s*<\s*v_positive\.assessed_at/i,
    );

    assert.match(
      sql,
      /observation must not precede the prior positive assessment/i,
    );

    assert.match(
      sql,
      /decided_at\s*>=\s*observed_at/i,
    );
  },
);

test(
  "Q14v row is immutable after insertion",
  () => {
    assert.match(
      sql,
      /hspp_member_unsuitability_prevent_update/i,
    );

    assert.match(
      sql,
      /before\s+update/i,
    );

    assert.match(
      sql,
      /hspp_member_unsuitability_prevent_delete/i,
    );

    assert.match(
      sql,
      /before\s+delete/i,
    );

    assert.match(
      sql,
      /append-only and immutable/i,
    );
  },
);


test(
  "Q14v substrate exposes read-only service-role table authority and no writer",
  () => {
    assert.match(
      sql,
      /enable\s+row\s+level\s+security/i,
    );

    assert.match(
      sql,
      /grant\s+select\s+on\s+table\s+public\.hspp_assembly_member_unsuitability_checkpoints\s+to\s+service_role/i,
    );

    assert.doesNotMatch(
      sql,
      /grant\s+(?:insert|update|delete|all)\s+on\s+table\s+public\.hspp_assembly_member_unsuitability_checkpoints\s+to\s+service_role/i,
    );

    assert.doesNotMatch(
      sql,
      /create\s+or\s+replace\s+function\s+public\.persist_hspp_[^(]*unsuit/i,
    );
  },
);


test(
  "Q14v substrate does not perform reconstruction Reservoir or H1 mutation",
  () => {
    assert.doesNotMatch(
      sql,
      /insert\s+into\s+public\.hspp_evidence_assembly_reconstructions/i,
    );

    assert.doesNotMatch(
      sql,
      /insert\s+into\s+public\.hspp_evidence_assembly_reconstruction_changes/i,
    );

    assert.doesNotMatch(
      sql,
      /update\s+public\.hspp_evidence_assembly_members/i,
    );

    assert.doesNotMatch(
      sql,
      /delete\s+from\s+public\.hspp_evidence_assembly_members/i,
    );

    assert.doesNotMatch(
      sql,
      /update\s+public\.hspp_evidence(?:\s|$)/i,
    );

    assert.doesNotMatch(
      sql,
      /insert\s+into\s+public\.[a-z0-9_]*reservoir/i,
    );
  },
);


test(
  "Q14v keeps the prior positive checkpoint historical and untouched",
  () => {
    assert.doesNotMatch(
      sql,
      /update\s+public\.hspp_assembly_positive_assessment_checkpoints/i,
    );

    assert.doesNotMatch(
      sql,
      /delete\s+from\s+public\.hspp_assembly_positive_assessment_checkpoints/i,
    );

    assert.match(
      sql,
      /does not mutate H1, revoke historical Q14p provenance, create H2/i,
    );
  },
);