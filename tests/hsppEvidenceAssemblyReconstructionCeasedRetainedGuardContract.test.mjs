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
          "_guard_hspp_reconstruction_against_ceased_retained_membership.sql",
        ),
    );

assert.equal(
  matches.length,
  1,
  "Expected exactly one Q14ad ceased-RETAINED reconstruction guard migration.",
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
  "Q14ad replaces the Q14h reconstruction authority",
  () => {
    assert.match(
      sql,
      /create\s+or\s+replace\s+function\s+public\.persist_hspp_evidence_assembly_reconstruction\s*\(/i,
    );
  },
);

test(
  "Q14ad checks exact effective cessation authority",
  () => {
    assert.match(
      sql,
      /public\.hspp_assembly_member_effective_cessations\s+as\s+cessation/i,
    );

    assert.match(
      sql,
      /cessation\.historical_membership_id\s*=\s*parent_member\.id/i,
    );

    assert.match(
      sql,
      /parent_member\.organization_id\s*=\s*p_organization_id/i,
    );

    assert.match(
      sql,
      /parent_member\.assembly_id\s*=\s*p_parent_assembly_id/i,
    );

    assert.match(
      sql,
      /parent_member\.evidence_id\s*=\s*any\s*\(\s*v_member_ids\s*\)/i,
    );
  },
);

test(
  "Q14ad rejects ceased source membership fail closed",
  () => {
    assert.match(
      sql,
      /cannot\s+RETAIN\s+a\s+historical\s+membership\s+whose\s+current\s+effective\s+membership\s+has\s+ceased/i,
    );
  },
);

test(
  "Q14ad preserves exact retry before the new reconstruction guard",
  () => {
    const newReconstructionIndex =
      sql.indexOf(
        "-- New reconstruction.",
      );

    const guardIndex =
      sql.indexOf(
        "public.hspp_assembly_member_effective_cessations",
      );

    const retryReturnIndex =
      sql.lastIndexOf(
        "return;",
        guardIndex,
      );

    assert.ok(
      retryReturnIndex >= 0,
      "Expected the existing idempotent retry return before Q14ad guard.",
    );

    assert.ok(
      guardIndex > retryReturnIndex,
      "Q14ad guard must execute after exact retry recovery.",
    );

    assert.ok(
      newReconstructionIndex > guardIndex,
      "Q14ad guard must execute before NEW reconstruction.",
    );
  },
);

test(
  "Q14ad does not mutate historical parent membership",
  () => {
    const guardStart =
      sql.indexOf(
        "-- Q14ad: ceased RETAINED membership fail-closed guard.",
      );

    const newReconstructionIndex =
      sql.indexOf(
        "-- New reconstruction.",
      );

    const guard =
      sql.slice(
        guardStart,
        newReconstructionIndex,
      );

    assert.doesNotMatch(
      guard,
      /update\s+public\.hspp_evidence_assembly_members/i,
    );

    assert.doesNotMatch(
      guard,
      /delete\s+from\s+public\.hspp_evidence_assembly_members/i,
    );
  },
);