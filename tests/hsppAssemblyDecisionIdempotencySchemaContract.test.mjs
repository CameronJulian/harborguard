import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260821191500_add_hspp_assembly_decision_idempotency.sql",
  "utf8",
);

test("B07G3 fails closed when historical duplicate logical identities exist", () => {
  assert.match(
    migration,
    /group by[\s\S]*organization_id[\s\S]*assembly_id[\s\S]*assembly_scan_version[\s\S]*assembly_decision_policy_version/i,
  );

  assert.match(migration, /having[\s\S]*count\(\*\)\s*>\s*1/i);

  assert.match(
    migration,
    /raise exception[\s\S]*historical duplicate logical decisions exist/i,
  );

  assert.doesNotMatch(
    migration,
    /\bdelete\s+from\s+public\.hspp_assembly_decisions/i,
  );

  assert.doesNotMatch(migration, /\bupdate\s+public\.hspp_assembly_decisions/i);
});

test("B07G3 defines the authoritative logical decision identity", () => {
  assert.match(migration, /hspp_assembly_decisions_logical_identity_unique/);

  assert.match(
    migration,
    /unique\s*\(\s*organization_id\s*,\s*assembly_id\s*,\s*assembly_scan_version\s*,\s*assembly_decision_policy_version\s*\)/is,
  );
});

test("B07G3 preserves append-only decision provenance", () => {
  assert.doesNotMatch(migration, /\bupsert\b/i);

  assert.doesNotMatch(migration, /\bon\s+conflict\b/i);

  assert.match(
    migration,
    /does NOT delete, merge, update, or[\s\S]*rewrite historical provenance/i,
  );
});
