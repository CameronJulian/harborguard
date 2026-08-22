import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationPath = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260822143300_add_hspp_evidence_assembly_recovery_index.sql",
);

const migration = fs.readFileSync(migrationPath, "utf8");

function removeSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*--.*$/gm, "");
}

const executableSql = removeSqlComments(migration);

test("B7490-07Q13a migration has no UTF-8 BOM", () => {
  assert.equal(
    migration.charCodeAt(0) === 0xfeff,
    false,
    "Migration must be UTF-8 without BOM.",
  );
});

test("B7490-07Q13a adds exactly one assembly recovery-discovery index", () => {
  const createIndexCalls = executableSql.match(/\bcreate\s+index\b/gi) ?? [];

  assert.equal(createIndexCalls.length, 1);

  assert.match(
    executableSql,
    /create\s+index\s+hspp_evidence_assemblies_org_state_created_id_idx\s+on\s+public\.hspp_evidence_assemblies\s*\(\s*organization_id\s*,\s*assembly_state\s*,\s*created_at\s*,\s*id\s*\)\s*;/is,
  );
});

test("B7490-07Q13a preserves deterministic organization state and lifecycle ordering", () => {
  assert.match(
    executableSql,
    /hspp_evidence_assemblies_org_state_created_id_idx\s+on\s+public\.hspp_evidence_assemblies\s*\(\s*organization_id\s*,\s*assembly_state\s*,\s*created_at\s*,\s*id\s*\)/is,
  );
});

test("B7490-07Q13a documents the index as recovery discovery only", () => {
  assert.match(
    migration,
    /comment\s+on\s+index\s+public\.hspp_evidence_assemblies_org_state_created_id_idx/is,
  );

  assert.match(
    migration,
    /bounded organization\/state-scoped HSPP assembly reads/i,
  );

  assert.match(migration, /does not define Q12 pending\/completed state/i);
});

test("B7490-07Q13a does not modify assembly schema or protocol state", () => {
  assert.doesNotMatch(executableSql, /\bcreate\s+table\b/i);

  assert.doesNotMatch(executableSql, /\balter\s+table\b/i);

  assert.doesNotMatch(
    executableSql,
    /\bdrop\s+(table|column|constraint|index)\b/i,
  );

  assert.doesNotMatch(executableSql, /\bcreate\s+or\s+replace\s+function\b/i);

  assert.doesNotMatch(executableSql, /\bcreate\s+policy\b/i);

  assert.doesNotMatch(executableSql, /\bgrant\b/i);

  assert.doesNotMatch(executableSql, /\brevoke\b/i);

  assert.doesNotMatch(executableSql, /\binsert\s+into\b/i);

  assert.doesNotMatch(executableSql, /\bupdate\b/i);

  assert.doesNotMatch(executableSql, /\bdelete\s+from\b/i);
});

test("B7490-07Q13a does not introduce retry identity or authority state", () => {
  assert.doesNotMatch(executableSql, /\bassessed_at\b/i);

  assert.doesNotMatch(executableSql, /\boperational_eligible\b/i);

  assert.doesNotMatch(executableSql, /\btrust_state\b/i);

  assert.doesNotMatch(executableSql, /\bcrowd_intelligence\b/i);

  assert.doesNotMatch(executableSql, /\btraining_eligible\b/i);

  assert.doesNotMatch(executableSql, /\bvalidation_eligible\b/i);
});

test("B7490-07Q13a index is non-unique and does not invent a completion predicate", () => {
  assert.doesNotMatch(executableSql, /create\s+unique\s+index/i);

  assert.doesNotMatch(
    executableSql,
    /\bwhere\b[\s\S]*\b(pending|completed)\b/i,
  );
});

test("B7490-07Q13a creates no reader or execution boundary", () => {
  assert.doesNotMatch(
    executableSql,
    /\b(create|replace)\s+(function|procedure|trigger)\b/i,
  );

  assert.doesNotMatch(executableSql, /\bcron\b/i);

  assert.doesNotMatch(executableSql, /\bqueue\b/i);

  assert.doesNotMatch(executableSql, /\bscheduler\b/i);
});
