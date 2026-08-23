import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260823072000_create_hspp_assembly_positive_assessment_checkpoints.sql";

const source =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

const executableSource =
  source
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /--[^\r\n]*/g,
      "",
    );

const mutationSource =
  executableSource
    .replace(
      /\bcomment\s+on\s+(?:table|column|constraint|function)[\s\S]*?;\s*/gi,
      "",
    );

function count(pattern) {
  return (
    mutationSource.match(pattern) ??
    []
  ).length;
}


test(
  "Q14p creates exactly one dedicated positive-assessment checkpoint table",
  () => {
    assert.equal(
      count(
        /\bcreate\s+table\s+public\.hspp_assembly_positive_assessment_checkpoints\s*\(/gi,
      ),
      1,
    );

    assert.match(
      mutationSource,
      /\bcheckpoint_version\s+text\s+not\s+null[\s\S]*hspp-assembly-positive-assessment-checkpoint-v1/i,
    );

    assert.match(
      mutationSource,
      /\borganization_id\s+uuid\s+not\s+null/i,
    );

    assert.match(
      mutationSource,
      /\bassembly_id\s+uuid\s+not\s+null/i,
    );

    assert.match(
      mutationSource,
      /\bassembly_decision_id\s+uuid\s+not\s+null/i,
    );

    assert.match(
      mutationSource,
      /\bevidence_id\s+uuid\s+not\s+null/i,
    );

    assert.match(
      mutationSource,
      /\bintegrity_fingerprint\s+text\s+not\s+null/i,
    );

    assert.match(
      mutationSource,
      /\bassessed_at\s+timestamptz\s+not\s+null/i,
    );
  },
);


test(
  "Q14p checkpoint can represent only the exact positive Q6 assessment tuple",
  () => {
    for (const expected of [
      "hspp-corroborated-operational-assessment-persistence-v1",
      "hspp-corroborated-operational-assessment-v1",
      "CORROBORATED",
      "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",
    ]) {
      assert.match(
        mutationSource,
        new RegExp(
          expected,
        ),
      );
    }

    assert.match(
      mutationSource,
      /operational_eligible\s*=\s*true/i,
    );

    assert.match(
      mutationSource,
      /crowd_eligible\s*=\s*false/i,
    );

    assert.match(
      mutationSource,
      /training_eligible\s*=\s*false/i,
    );

    assert.match(
      mutationSource,
      /validation_eligible\s*=\s*false/i,
    );

    assert.match(
      mutationSource,
      /integrity_fingerprint\s*~\s*'\^\[a-f0-9\]\{64\}\$'/i,
    );
  },
);


test(
  "Q14p binds checkpoint provenance to assembly decision and evidence identity",
  () => {
    assert.match(
      mutationSource,
      /foreign\s+key\s*\(\s*organization_id\s*,\s*assembly_id\s*\)[\s\S]*references\s+public\.hspp_evidence_assemblies\s*\(\s*organization_id\s*,\s*id\s*\)[\s\S]*on\s+delete\s+restrict/i,
    );

    assert.match(
      mutationSource,
      /foreign\s+key\s*\(\s*assembly_decision_id\s*\)[\s\S]*references\s+public\.hspp_assembly_decisions\s*\(\s*id\s*\)[\s\S]*on\s+delete\s+restrict/i,
    );

    assert.match(
      mutationSource,
      /foreign\s+key\s*\(\s*evidence_id\s*\)[\s\S]*references\s+public\.hspp_evidence\s*\(\s*id\s*\)[\s\S]*on\s+delete\s+restrict/i,
    );
  },
);


test(
  "Q14p permits at most one positive checkpoint per organization-scoped assembly",
  () => {
    assert.equal(
      count(
        /constraint\s+hspp_positive_checkpoint_assembly_unique\s+unique\s*\(\s*organization_id\s*,\s*assembly_id\s*\)/gi,
      ),
      1,
    );
  },
);


test(
  "Q14p checkpoint history is immutable",
  () => {
    assert.equal(
      count(
        /create\s+or\s+replace\s+function\s+public\.prevent_hspp_assembly_positive_assessment_checkpoint_changes\s*\(\s*\)/gi,
      ),
      1,
    );

    assert.match(
      mutationSource,
      /before\s+update[\s\S]*on\s+public\.hspp_assembly_positive_assessment_checkpoints[\s\S]*prevent_hspp_assembly_positive_assessment_checkpoint_changes/i,
    );

    assert.match(
      mutationSource,
      /before\s+delete[\s\S]*on\s+public\.hspp_assembly_positive_assessment_checkpoints[\s\S]*prevent_hspp_assembly_positive_assessment_checkpoint_changes/i,
    );

    assert.match(
      mutationSource,
      /immutable\s+and\s+cannot\s+be\s+changed/i,
    );
  },
);


test(
  "Q14p exposes checkpoint history read-only to service role and provides no insert writer",
  () => {
    assert.match(
      mutationSource,
      /alter\s+table\s+public\.hspp_assembly_positive_assessment_checkpoints\s+enable\s+row\s+level\s+security/i,
    );

    assert.match(
      mutationSource,
      /revoke\s+all\s+on\s+table\s+public\.hspp_assembly_positive_assessment_checkpoints\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i,
    );

    assert.match(
      mutationSource,
      /grant\s+select\s+on\s+table\s+public\.hspp_assembly_positive_assessment_checkpoints\s+to\s+service_role/i,
    );

    assert.doesNotMatch(
      mutationSource,
      /grant\s+(?:insert|update|delete|all)[\s\S]*hspp_assembly_positive_assessment_checkpoints/i,
    );

    assert.equal(
      count(
        /\binsert\s+into\s+public\.hspp_assembly_positive_assessment_checkpoints\b/gi,
      ),
      0,
    );
  },
);


test(
  "Q14p adds no promotion detach Reservoir reconstruction or downstream authority",
  () => {
    for (const forbidden of [
      /\breconstruction_promotion\b/i,
      /\bassembly_promotion\b/i,
      /\bcurrent_assembly\b/i,
      /\beffective_assembly\b/i,
      /\beffective_membership\b/i,
      /\bsuperseded_by\b/i,
      /\bdetach(?:ed|ment)?\b/i,
      /\breservoir\b/i,
      /\breplacement\b/i,
      /\broute_safety\b/i,
      /\bcrowd_intelligence\b/i,
      /\bmachine_learning\b/i,
    ]) {
      assert.doesNotMatch(
        mutationSource,
        forbidden,
      );
    }

    assert.equal(
      count(
        /\binsert\s+into\s+public\./gi,
      ),
      0,
    );

    assert.equal(
      count(
        /\bupdate\s+public\./gi,
      ),
      0,
    );

    assert.equal(
      count(
        /\bdelete\s+from\s+public\./gi,
      ),
      0,
    );
  },
);


test(
  "Q14p migration alters no pre-existing HSPP table",
  () => {
    const alterTargets =
      [
        ...mutationSource.matchAll(
          /\balter\s+table\s+public\.([a-z_][a-z0-9_]*)/gi,
        ),
      ].map(
        (match) =>
          match[1],
      );

    assert.deepEqual(
      [...new Set(alterTargets)],
      [
        "hspp_assembly_positive_assessment_checkpoints",
      ],
    );
  },
);
