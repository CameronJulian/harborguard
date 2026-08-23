import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260823064000_add_hspp_reconstruction_single_successor.sql";

const migration = fs.readFileSync(migrationPath, "utf8");

const executableSource = migration
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/--.*$/gm, "");

const mutationSource = executableSource.replace(
  /\bcomment\s+on\s+constraint[\s\S]*?;\s*/gi,
  "",
);

test("Q14k creates the organization-scoped single-successor invariant", () => {
  assert.match(
    executableSource,
    /alter\s+table\s+public\.hspp_evidence_assembly_reconstructions[\s\S]*add\s+constraint\s+hspp_reconstruction_parent_unique[\s\S]*unique\s*\(\s*organization_id\s*,\s*parent_assembly_id\s*\)/i,
  );
});

test("Q14k documents the direct non-branching reconstruction rule", () => {
  assert.match(
    migration,
    /one immutable HSPP evidence assembly[\s\S]*at most one direct[\s\S]*reconstruction child/i,
  );

  assert.match(
    migration,
    /H1\s*->\s*H2\s*->\s*H3/i,
  );
});

test("Q14k uses the database constraint as the concurrency boundary", () => {
  assert.match(
    migration,
    /database UNIQUE constraint is the authoritative concurrency[\s\S]*boundary/i,
  );

  assert.match(
    migration,
    /Concurrent attempts[\s\S]*different direct children[\s\S]*cannot both commit/i,
  );
});

test("Q14k is schema-only and does not rewrite reconstruction persistence", () => {
  assert.doesNotMatch(
    executableSource,
    /\bcreate\s+(?:or\s+replace\s+)?function\b/i,
  );

  assert.doesNotMatch(
    executableSource,
    /\binsert\s+into\b/i,
  );

  assert.doesNotMatch(
    executableSource,
    /\bupdate\b/i,
  );

  assert.doesNotMatch(
    executableSource,
    /\bdelete\s+from\b/i,
  );
});

test("Q14k does not weaken or remove an existing lineage constraint", () => {
  assert.doesNotMatch(
    executableSource,
    /\bdrop\s+constraint\b/i,
  );

  assert.doesNotMatch(
    executableSource,
    /\bdrop\s+index\b/i,
  );

  assert.doesNotMatch(
    executableSource,
    /\bdrop\s+table\b/i,
  );
});

test("Q14k does not mutate membership, Reservoir, trust, or downstream authority", () => {
  assert.doesNotMatch(
    mutationSource,
    /hspp_evidence_assembly_members/i,
  );

  assert.doesNotMatch(
    mutationSource,
    /\breservoir\b/i,
  );

  assert.doesNotMatch(
    mutationSource,
    /\btrust\b/i,
  );

  assert.doesNotMatch(
    mutationSource,
    /route_safety|crowd_intelligence|machine_learning|\bml\b/i,
  );
});

test("Q14k names only the reconstruction lineage table as an altered table", () => {
  const alteredTables = [
    ...executableSource.matchAll(
      /\balter\s+table\s+([a-z0-9_."]+)/gi,
    ),
  ].map((match) => match[1].replaceAll('"', "").toLowerCase());

  assert.deepEqual(
    alteredTables,
    ["public.hspp_evidence_assembly_reconstructions"],
  );
});
