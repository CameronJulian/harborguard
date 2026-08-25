import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationUrl =
  new URL(
    "../supabase/migrations/20260825074500_guard_hspp_evidence_integrity_identity_immutable.sql",
    import.meta.url,
  );

const sql =
  fs.readFileSync(
    migrationUrl,
    "utf8",
  );

const guardedFields = [
  "id",
  "organization_id",
  "protocol_version",
  "canonicalization_version",
  "source_class",
  "source_provider",
  "source_stream",
  "source_message_id",
  "observed_at",
  "payload_schema_version",
  "normalized_payload",
  "integrity_algorithm",
  "integrity_fingerprint",
  "parent_evidence_id",
  "parent_integrity_fingerprint",
  "derivation_type",
  "derivation_version",
];

const mutableAssessmentFields = [
  "trust_state",
  "operational_eligible",
  "crowd_eligible",
  "training_eligible",
  "validation_eligible",
  "assessment_policy_version",
  "assessment_reason",
  "assessed_at",
];

test(
  "evidence identity immutability migration is UTF-8 without BOM",
  () => {
    assert.notEqual(
      sql.charCodeAt(0),
      0xfeff,
    );
  },
);

test(
  "migration creates the exact evidence identity guard",
  () => {
    assert.match(
      sql,
      /create or replace function\s+public\.guard_hspp_evidence_integrity_identity_immutable\(\)/i,
    );

    assert.match(
      sql,
      /create trigger\s+hspp_evidence_integrity_identity_immutable/i,
    );

    assert.match(
      sql,
      /before update of[\s\S]*?on public\.hspp_evidence/i,
    );
  },
);

test(
  "every verification-sensitive field is guarded with null-safe identity comparison",
  () => {
    for (const field of guardedFields) {
      const comparison =
        new RegExp(
          "new\\." +
            field +
            "\\s+is distinct from\\s+old\\." +
            field,
          "i",
        );

      assert.match(
        sql,
        comparison,
        field + " must be protected by IS DISTINCT FROM",
      );
    }
  },
);

test(
  "trigger update list contains every verification-sensitive field",
  () => {
    const trigger =
      sql.match(
        /before update of([\s\S]*?)on public\.hspp_evidence/i,
      );

    assert.ok(
      trigger,
      "guard trigger update list must exist",
    );

    const updateList =
      trigger[1];

    for (const field of guardedFields) {
      const fieldPattern =
        new RegExp(
          "\\b" +
            field +
            "\\b",
          "i",
        );

      assert.match(
        updateList,
        fieldPattern,
        field + " must be in the trigger update list",
      );
    }
  },
);

test(
  "existing assessment-state columns remain outside the immutable trigger list",
  () => {
    const trigger =
      sql.match(
        /before update of([\s\S]*?)on public\.hspp_evidence/i,
      );

    assert.ok(
      trigger,
      "guard trigger update list must exist",
    );

    const updateList =
      trigger[1];

    for (const field of mutableAssessmentFields) {
      const fieldPattern =
        new RegExp(
          "\\b" +
            field +
            "\\b",
          "i",
        );

      assert.doesNotMatch(
        updateList,
        fieldPattern,
        field + " must remain mutable through assessment writers",
      );
    }
  },
);

test(
  "migration performs no existing evidence rewrite",
  () => {
    assert.doesNotMatch(
      sql,
      /\bupdate\s+public\.hspp_evidence\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\bdelete\s+from\s+public\.hspp_evidence\b/i,
    );

    assert.doesNotMatch(
      sql,
      /\binsert\s+into\s+public\.hspp_evidence\b/i,
    );
  },
);

test(
  "migration does not introduce lifecycle orchestration",
  () => {
    const executableSql =
      sql.replace(
        /^\s*--.*$/gm,
        "",
      );

    assert.doesNotMatch(
      executableSql,
      /persist_hspp_member_unsuitability_checkpoint_under_lease/i,
    );

    assert.doesNotMatch(
      executableSql,
      /persist_hspp_assembly_member_effective_cessation/i,
    );

    assert.doesNotMatch(
      executableSql,
      /reservoir/i,
    );

    assert.doesNotMatch(
      executableSql,
      /reconstruction_execution/i,
    );
  },
);
