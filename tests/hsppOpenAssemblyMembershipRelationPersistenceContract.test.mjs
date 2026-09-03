import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260903160000_persist_hspp_open_assembly_membership_relation.sql";

const sql =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

test(
  "AS26A exposes one service-role-only existing-OPEN membership-relation persistence authority",
  () => {
    assert.match(
      sql,
      /create\s+or\s+replace\s+function\s+public\.persist_hspp_open_assembly_membership_relation\s*\(\s*p_organization_id\s+uuid\s*,\s*p_assembly_id\s+uuid\s*,\s*p_membership_relation\s+jsonb\s*\)/is,
    );

    assert.match(
      sql,
      /grant\s+execute[\s\S]*persist_hspp_open_assembly_membership_relation[\s\S]*to\s+service_role/is,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*persist_hspp_open_assembly_membership_relation[\s\S]*from[\s\S]*public[\s\S]*anon[\s\S]*authenticated/is,
    );
  },
);

test(
  "AS26A locks the exact assembly before lifecycle-sensitive relation persistence",
  () => {
    assert.match(
      sql,
      /from\s+public\.hspp_evidence_assemblies[\s\S]*organization_id\s*=\s*p_organization_id[\s\S]*id\s*=\s*p_assembly_id[\s\S]*for\s+update/is,
    );
  },
);

test(
  "AS26A creates new relation provenance only while the assembly remains OPEN",
  () => {
    assert.match(
      sql,
      /v_assembly\.assembly_state\s*<>\s*'OPEN'/i,
    );

    assert.match(
      sql,
      /v_assembly\.sealed_at\s+is\s+not\s+null/i,
    );

    assert.match(
      sql,
      /insert\s+into\s+public\.hspp_evidence_assembly_membership_relations/is,
    );
  },
);

test(
  "AS26A requires the existing child to contain exactly two immutable members",
  () => {
    assert.match(
      sql,
      /from\s+public\.hspp_evidence_assembly_members[\s\S]*assembly_id\s*=\s*p_assembly_id/is,
    );

    assert.match(
      sql,
      /v_member_count\s*<>\s*2/i,
    );

    assert.match(
      sql,
      /first membership relation evidence is not a member of the assembly/i,
    );

    assert.match(
      sql,
      /second membership relation evidence is not a member of the assembly/i,
    );
  },
);

test(
  "AS26A accepts only eligible B11A2 provenance matching the child membership policy",
  () => {
    assert.match(
      sql,
      /membershipEligible/is,
    );

    assert.match(
      sql,
      /is\s+distinct\s+from\s+'true'::jsonb/is,
    );

    assert.match(
      sql,
      /v_relation_policy_version\s*<>\s*trim\s*\(\s*v_assembly\.membership_policy_version/is,
    );

    assert.match(
      sql,
      /v_relation_reason\s*<>\s*'ELIGIBLE'/i,
    );
  },
);

test(
  "AS26A recovers an exact immutable retry and rejects a conflicting retry",
  () => {
    assert.match(
      sql,
      /if\s+v_existing\.id\s+is\s+not\s+null/is,
    );

    assert.match(
      sql,
      /is\s+distinct\s+from\s+v_first_evidence_id/is,
    );

    assert.match(
      sql,
      /is\s+distinct\s+from\s+v_second_evidence_id/is,
    );

    assert.match(
      sql,
      /Existing HSPP assembly membership relation conflicts with this retry/i,
    );

    assert.match(
      sql,
      /true\s*;\s*return\s*;/is,
    );
  },
);

test(
  "AS26A does not absorb B11A2 evaluation sealing reconstruction or assessment authority",
  () => {
    for (const forbidden of [
      "evaluateHsppAssemblyMembership",
      "seal_hspp_evidence_assembly",
      "persist_hspp_evidence_assembly_reconstruction",
      "apply_hspp_assessment",
      "runHsppSealed",
    ]) {
      assert.doesNotMatch(
        sql,
        new RegExp(`\\b${forbidden}\\b`, "i"),
      );
    }
  },
);