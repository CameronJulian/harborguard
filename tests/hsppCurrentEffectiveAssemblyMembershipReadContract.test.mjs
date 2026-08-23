import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migrationDirectory =
  path.join(
    process.cwd(),
    "supabase",
    "migrations",
  );

const matches =
  fs.readdirSync(migrationDirectory)
    .filter(
      (name) =>
        name.endsWith(
          "_read_hspp_current_effective_assembly_memberships.sql",
        ),
    );

assert.equal(
  matches.length,
  1,
  "Expected exactly one Q14af current-effective membership read migration.",
);

const migrationPath =
  path.join(
    migrationDirectory,
    matches[0],
  );

const sql =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

test(
  "Q14af creates one bounded current-effective membership read authority",
  () => {
    assert.match(
      sql,
      /create\s+or\s+replace\s+function\s+public\.read_hspp_current_effective_assembly_memberships\s*\(/i,
    );

    assert.match(
      sql,
      /p_organization_id\s+uuid/i,
    );

    assert.match(
      sql,
      /p_evidence_ids\s+uuid\[\]/i,
    );

    assert.match(
      sql,
      /returns\s+table\s*\(\s*evidence_id\s+uuid\s*\)/i,
    );
  },
);

test(
  "Q14af is explicitly bounded to at most 100 evidence ids",
  () => {
    assert.match(
      sql,
      /cardinality\s*\(\s*p_evidence_ids\s*\)/i,
    );

    assert.match(
      sql,
      /v_requested_count\s*>\s*100/i,
    );

    assert.match(
      sql,
      /at\s+most\s+100\s+evidence\s+ids/i,
    );
  },
);

test(
  "Q14af derives current lineage membership instead of historical row existence",
  () => {
    assert.match(
      sql,
      /public\.hspp_evidence_assembly_members\s+as\s+member/i,
    );

    assert.match(
      sql,
      /not\s+exists\s*\([\s\S]*public\.hspp_evidence_assembly_reconstructions\s+as\s+reconstruction[\s\S]*reconstruction\.parent_assembly_id\s*=\s*member\.assembly_id/i,
    );
  },
);

test(
  "Q14af excludes an exact membership whose effective lifecycle membership ceased",
  () => {
    assert.match(
      sql,
      /public\.hspp_assembly_member_effective_cessations\s+as\s+cessation/i,
    );

    assert.match(
      sql,
      /cessation\.historical_membership_id\s*=\s*member\.id/i,
    );

    assert.match(
      sql,
      /cessation\.organization_id\s*=\s*p_organization_id/i,
    );
  },
);

test(
  "Q14af preserves immutable history and is read only",
  () => {
    assert.doesNotMatch(
      sql,
      /\binsert\s+into\s+public\./i,
    );

    assert.doesNotMatch(
      sql,
      /\bupdate\s+public\./i,
    );

    assert.doesNotMatch(
      sql,
      /\bdelete\s+from\s+public\./i,
    );

    assert.match(
      sql,
      /historical\s+membership\s+is\s+never\s+deleted\s+or\s+rewritten/i,
    );
  },
);

test(
  "Q14af does not collapse membership state into Reservoir or trust authority",
  () => {
    assert.match(
      sql,
      /grants\s+no\s+trust,\s+Reservoir,\s+replacement,\s+reconstruction,\s+validation\s+or\s+downstream\s+authority/i,
    );
  },
);

test(
  "Q14af is fixed-search-path service-role-only authority",
  () => {
    assert.match(
      sql,
      /security\s+definer/i,
    );

    assert.match(
      sql,
      /set\s+search_path\s*=\s*public/i,
    );

    assert.match(
      sql,
      /grant\s+execute[\s\S]*to\s+service_role/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*from\s+anon/i,
    );

    assert.match(
      sql,
      /revoke\s+all[\s\S]*from\s+authenticated/i,
    );
  },
);