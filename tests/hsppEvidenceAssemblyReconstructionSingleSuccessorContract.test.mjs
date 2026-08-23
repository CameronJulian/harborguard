import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir =
  path.dirname(
    fileURLToPath(import.meta.url),
  );

const repoRoot =
  path.resolve(
    testDir,
    "..",
  );

function readRepoFile(relativePath) {
  return fs.readFileSync(
    path.join(
      repoRoot,
      relativePath,
    ),
    "utf8",
  );
}

const migration =
  readRepoFile(
    "supabase/migrations/20260823190000_enforce_hspp_single_reconstruction_successor.sql",
  );

const reconstructionSchema =
  readRepoFile(
    "supabase/migrations/20260823050000_create_hspp_evidence_assembly_reconstruction_provenance.sql",
  );

const q14h =
  readRepoFile(
    "supabase/migrations/20260823060000_persist_hspp_evidence_assembly_reconstruction.sql",
  );

const q14ad =
  readRepoFile(
    "supabase/migrations/20260823165505_guard_hspp_reconstruction_against_ceased_retained_membership.sql",
  );

const q14ag14 =
  readRepoFile(
    "supabase/migrations/20260823180730_read_hspp_historical_reconstruction_contexts.sql",
  );


test(
  "Q14ag21 exposes one focused single-successor schema invariant",
  () => {

    assert.match(
      migration,
      /alter\s+table\s+public\.hspp_evidence_assembly_reconstructions[\s\S]*add\s+constraint\s+hspp_reconstruction_parent_unique[\s\S]*unique\s*\(\s*organization_id\s*,\s*parent_assembly_id\s*\)/i,
    );
  },
);


test(
  "Q14ag21 fails closed if existing lineage already contains multiple successors",
  () => {

    assert.match(
      migration,
      /group\s+by\s+reconstruction\.organization_id\s*,\s*reconstruction\.parent_assembly_id[\s\S]*having\s+count\s*\(\s*\*\s*\)\s*>\s*1[\s\S]*raise\s+exception/i,
    );

    assert.match(
      migration,
      /existing lineage contains multiple immediate successors for one parent/i,
    );
  },
);


test(
  "Q14ag21 preserves the existing caller-owned child uniqueness invariant",
  () => {

    assert.match(
      reconstructionSchema,
      /constraint\s+hspp_reconstruction_child_unique[\s\S]*unique\s*\(\s*organization_id\s*,\s*child_assembly_id\s*\)/i,
    );

    assert.doesNotMatch(
      migration,
      /drop\s+constraint\s+hspp_reconstruction_child_unique/i,
    );
  },
);


test(
  "Q14ag21 complements the existing Q14h parent transaction lock",
  () => {

    assert.match(
      q14h,
      /Lock exact historical parent[\s\S]*p_parent_assembly_id[\s\S]*for\s+update/i,
    );

    assert.match(
      migration,
      /unique\s*\(\s*organization_id\s*,\s*parent_assembly_id\s*\)/i,
    );
  },
);


test(
  "Q14ag21 remains compatible with Q14ag14 reconstruction-leaf semantics",
  () => {

    assert.match(
      q14ag14,
      /not\s+exists\s*\([\s\S]*hspp_evidence_assembly_reconstructions[\s\S]*parent_assembly_id/i,
    );

    assert.match(
      migration,
      /one deterministic reconstruction lineage/i,
    );
  },
);


test(
  "Q14ag21 does not weaken Q14ad ceased-retained fail-closed authority",
  () => {

    assert.match(
      q14ad,
      /Exact idempotent child recovery has already returned above/i,
    );

    assert.match(
      q14ad,
      /HSPP reconstruction cannot RETAIN a historical membership whose current effective membership has ceased\./,
    );

    assert.doesNotMatch(
      migration,
      /create\s+or\s+replace\s+function\s+public\.persist_hspp_evidence_assembly_reconstruction/i,
    );
  },
);


test(
  "Q14ag21 changes no existing reconstruction rows",
  () => {

    assert.doesNotMatch(
      migration,
      /\bdelete\s+from\b/i,
    );

    assert.doesNotMatch(
      migration,
      /\bupdate\s+public\.hspp_evidence_assembly_reconstructions\b/i,
    );

    assert.doesNotMatch(
      migration,
      /\binsert\s+into\s+public\.hspp_evidence_assembly_reconstructions\b/i,
    );
  },
);


test(
  "Q14ag21 introduces no recovery execution sealing assessment trust or scheduling authority",
  () => {

    assert.doesNotMatch(
      migration,
      /\bread_hspp_historical_reconstruction_contexts\s*\(/i,
    );

    assert.doesNotMatch(
      migration,
      /\bpersist_hspp_evidence_assembly_reconstruction\s*\(/i,
    );

    assert.doesNotMatch(
      migration,
      /\bseal_hspp/i,
    );

    assert.doesNotMatch(
      migration,
      /\bassessment_retry\b/i,
    );

    assert.doesNotMatch(
      migration,
      /\bcron\b[\s\S]*schedule\s*\(/i,
    );
  },
);


test(
  "Q14ag21 documents the invariant without granting new privileges",
  () => {

    assert.match(
      migration,
      /comment\s+on\s+constraint\s+hspp_reconstruction_parent_unique/i,
    );

    assert.doesNotMatch(
      migration,
      /\bgrant\s+/i,
    );

    assert.doesNotMatch(
      migration,
      /\brevoke\s+/i,
    );
  },
);