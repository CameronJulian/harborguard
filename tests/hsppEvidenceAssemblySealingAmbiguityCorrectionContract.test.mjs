import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const correction = fs.readFileSync(
  "supabase/migrations/20260823110800_fix_hspp_evidence_assembly_sealing_ambiguity.sql",
  "utf8",
);

test("Q14s correction preserves the B07C3 sealing RPC interface", () => {
  assert.match(
    correction,
    /create\s+or\s+replace\s+function\s+public\.seal_hspp_evidence_assembly\s*\(\s*p_organization_id\s+uuid\s*,\s*p_assembly_id\s+uuid\s*\)/i,
  );

  assert.match(
    correction,
    /returns\s+table\s*\(\s*assembly_id\s+uuid\s*,\s*organization_id\s+uuid\s*,\s*assembly_state\s+text\s*,\s*sealed_at\s+timestamptz\s*\)/i,
  );

  assert.match(
    correction,
    /language\s+plpgsql[\s\S]*?security\s+invoker[\s\S]*?set\s+search_path\s*=\s*public/i,
  );
});

test("Q14s correction removes the PL/pgSQL UPDATE identifier ambiguity", () => {
  const updateMatch = correction.match(
    /update\s+public\.hspp_evidence_assemblies\s+as\s+assembly[\s\S]*?into\s+v_assembly\s*;/i,
  );

  assert.ok(
    updateMatch,
    "Expected exactly scoped assembly UPDATE block",
  );

  const updateBlock = updateMatch[0];

  assert.match(
    updateBlock,
    /where\s+assembly\.organization_id\s*=\s*p_organization_id/i,
  );

  assert.match(
    updateBlock,
    /and\s+assembly\.id\s*=\s*p_assembly_id/i,
  );

  assert.match(
    updateBlock,
    /returning\s+assembly\.\*/i,
  );

  assert.doesNotMatch(
    updateBlock,
    /\bwhere\s+organization_id\s*=/i,
  );

  assert.doesNotMatch(
    updateBlock,
    /\band\s+id\s*=/i,
  );
});

test("Q14s correction preserves the qualified locking lookup", () => {
  assert.match(
    correction,
    /from\s+public\.hspp_evidence_assemblies\s+as\s+assembly[\s\S]*?where\s+assembly\.organization_id\s*=\s*p_organization_id[\s\S]*?and\s+assembly\.id\s*=\s*p_assembly_id[\s\S]*?for\s+update/i,
  );
});

test("Q14s correction remains sealing-only authority", () => {
  const updates =
    correction.match(
      /\bupdate\s+public\.[a-z_][a-z0-9_]*/gi,
    ) ?? [];

  assert.equal(
    updates.length,
    1,
  );

  assert.match(
    updates[0],
    /update\s+public\.hspp_evidence_assemblies/i,
  );

  assert.doesNotMatch(
    correction,
    /\binsert\s+into\s+public\.hspp_/i,
  );

  assert.doesNotMatch(
    correction,
    /\bdelete\s+from\s+public\.hspp_/i,
  );

  assert.doesNotMatch(
    correction,
    /\bupdate\s+public\.hspp_evidence\b/i,
  );

  assert.doesNotMatch(
    correction,
    /\bupdate\s+public\.hspp_evidence_assembly_members\b/i,
  );

  assert.doesNotMatch(
    correction,
    /\bupdate\s+public\.hspp_assembly_decisions\b/i,
  );
});

test("Q14s correction preserves service-role-only sealing execution", () => {
  assert.match(
    correction,
    /revoke\s+all[\s\S]*?on\s+function\s+public\.seal_hspp_evidence_assembly\s*\(\s*uuid\s*,\s*uuid\s*\)[\s\S]*?from\s+public\s*,\s*anon\s*,\s*authenticated\s*;/i,
  );

  assert.match(
    correction,
    /grant\s+execute[\s\S]*?on\s+function\s+public\.seal_hspp_evidence_assembly\s*\(\s*uuid\s*,\s*uuid\s*\)[\s\S]*?to\s+service_role\s*;/i,
  );
});

test("Q14s correction preserves fail-closed lifecycle semantics", () => {
  assert.match(
    correction,
    /v_assembly\.assembly_state\s*<>\s*'OPEN'/i,
  );

  assert.match(
    correction,
    /assembly_state\s*=\s*'SEALED'/i,
  );

  assert.match(
    correction,
    /sealed_at\s*=\s*now\s*\(\s*\)/i,
  );

  assert.match(
    correction,
    /HSPP evidence assembly is not OPEN and cannot be sealed/i,
  );
});