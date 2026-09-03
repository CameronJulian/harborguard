import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sql =
  fs.readFileSync(
    "supabase/migrations/20260903162500_fix_hspp_open_membership_relation_column_ambiguity.sql",
    "utf8",
  );


test(
  "AS35 replaces the exact existing OPEN-child relation authority",
  () => {
    assert.match(
      sql,
      /create\s+or\s+replace\s+function\s+public\.persist_hspp_open_assembly_membership_relation/is,
    );
  },
);


test(
  "AS35 qualifies assembly lookup columns",
  () => {
    assert.match(
      sql,
      /from\s+public\.hspp_evidence_assemblies\s+as\s+a[\s\S]*a\.organization_id\s*=\s*p_organization_id[\s\S]*a\.id\s*=\s*p_assembly_id[\s\S]*for\s+update/is,
    );
  },
);


test(
  "AS35 qualifies immutable relation lookup columns",
  () => {
    assert.match(
      sql,
      /from\s+public\.hspp_evidence_assembly_membership_relations\s+as\s+r[\s\S]*r\.organization_id\s*=\s*p_organization_id[\s\S]*r\.assembly_id\s*=\s*p_assembly_id/is,
    );
  },
);


test(
  "AS35 qualifies all member lookup identity columns",
  () => {
    assert.match(
      sql,
      /public\.hspp_evidence_assembly_members\s+as\s+m/,
    );

    assert.match(
      sql,
      /m\.organization_id\s*=\s*p_organization_id/,
    );

    assert.match(
      sql,
      /m\.assembly_id\s*=\s*p_assembly_id/,
    );

    assert.match(
      sql,
      /m\.evidence_id\s*=\s*v_first_evidence_id/,
    );

    assert.match(
      sql,
      /m\.evidence_id\s*=\s*v_second_evidence_id/,
    );
  },
);


test(
  "AS35 preserves OPEN lifecycle and immutable retry semantics",
  () => {
    assert.match(
      sql,
      /v_assembly\.assembly_state\s*<>\s*'OPEN'/s,
    );

    assert.match(
      sql,
      /v_existing\.id\s+is\s+not\s+null/,
    );

    assert.match(
      sql,
      /Existing HSPP assembly membership relation conflicts with this retry/,
    );
  },
);


test(
  "AS35 preserves service-role-only RPC execution",
  () => {
    assert.match(
      sql,
      /revoke\s+all[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated/is,
    );

    assert.match(
      sql,
      /grant\s+execute[\s\S]*to\s+service_role/is,
    );
  },
);