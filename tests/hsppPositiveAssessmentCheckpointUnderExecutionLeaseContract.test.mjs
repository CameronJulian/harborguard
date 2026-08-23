import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260823080000_persist_hspp_positive_assessment_checkpoint_under_execution_lease.sql";

const wrapperPath =
  "lib/hspp/persistHsppPositiveAssessmentCheckpointUnderExecutionLease.ts";

const q6Path =
  "lib/hspp/persistHsppCorroboratedOperationalAssessment.ts";

const sql =
  fs.readFileSync(
    migrationPath,
    "utf8",
  );

const wrapper =
  fs.readFileSync(
    wrapperPath,
    "utf8",
  );

const q6 =
  fs.readFileSync(
    q6Path,
    "utf8",
  );

const executableSql =
  sql
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /--[^\r\n]*/g,
      "",
    );

const executableQ6 =
  q6
    .replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    )
    .replace(
      /\/\/[^\r\n]*/g,
      "",
    );

test(
  "Q14r defines exactly one service-role-only SECURITY DEFINER atomic RPC",
  () => {
    assert.equal(
      (
        executableSql.match(
          /\bcreate\s+or\s+replace\s+function\s+public\.persist_hspp_positive_assessment_checkpoint_under_execution_lease\s*\(/gi,
        ) ?? []
      ).length,
      1,
    );

    assert.match(
      executableSql,
      /\blanguage\s+plpgsql\b[\s\S]*\bsecurity\s+definer\b[\s\S]*\bset\s+search_path\s*=\s*public\b/i,
    );

    assert.match(
      executableSql,
      /revoke\s+all[\s\S]*persist_hspp_positive_assessment_checkpoint_under_execution_lease[\s\S]*from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/i,
    );

    assert.match(
      executableSql,
      /grant\s+execute[\s\S]*persist_hspp_positive_assessment_checkpoint_under_execution_lease[\s\S]*to\s+service_role/i,
    );
  },
);

test(
  "Q14r independently proves SEALED assembly and exact same-assembly decision provenance",
  () => {
    assert.match(
      executableSql,
      /assembly\.organization_id\s*=\s*p_organization_id[\s\S]*assembly\.id\s*=\s*p_assembly_id[\s\S]*v_assembly_state\s*<>\s*'SEALED'/i,
    );

    assert.match(
      executableSql,
      /decision\.id\s*=\s*p_assembly_decision_id[\s\S]*decision\.organization_id\s*=\s*p_organization_id[\s\S]*decision\.assembly_id\s*=\s*p_assembly_id/i,
    );

    assert.match(
      executableSql,
      /assembly_decision_state\s*<>\s*'CONSISTENT'[\s\S]*assembly_decision_reason\s*<>[\s\S]*'CANONICAL_AGREEMENT_WITHOUT_CONFLICT'[\s\S]*authority\s*<>\s*'NONE'/i,
    );
  },
);

test(
  "Q14r delegates exactly once to the existing fenced mutation before checkpoint insertion",
  () => {
    const delegated =
      executableSql.search(
        /\bpublic\.apply_hspp_assessment_decision_under_execution_lease\s*\(/i,
      );

    const checkpointInsert =
      executableSql.search(
        /\binsert\s+into\s+public\.hspp_assembly_positive_assessment_checkpoints\s*\(/i,
      );

    assert.ok(
      delegated >= 0,
      "existing fenced assessment RPC must be delegated to",
    );

    assert.ok(
      checkpointInsert > delegated,
      "checkpoint INSERT must follow fenced assessment mutation in the same RPC",
    );

    assert.equal(
      (
        executableSql.match(
          /\bpublic\.apply_hspp_assessment_decision_under_execution_lease\s*\(/gi,
        ) ?? []
      ).length,
      1,
    );

    assert.equal(
      (
        executableSql.match(
          /\binsert\s+into\s+public\.hspp_assembly_positive_assessment_checkpoints\s*\(/gi,
        ) ?? []
      ).length,
      1,
    );
  },
);

test(
  "Q14r database-owns the exact positive Q6 assessment tuple",
  () => {
    assert.match(
      executableSql,
      /'CORROBORATED'\s*,\s*true\s*,\s*false\s*,\s*false\s*,\s*false\s*,\s*'hspp-corroborated-operational-assessment-v1'\s*,\s*'CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED'\s*,\s*p_assessed_at/i,
    );

    assert.match(
      executableSql,
      /'hspp-corroborated-operational-assessment-persistence-v1'/i,
    );

    assert.match(
      executableSql,
      /v_applied\.assessment_reason\s*<>\s*'CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED'/i,
    );
  },
);

test(
  "Q14r preserves immutable checkpoint provenance and exact-retry identity",
  () => {
    assert.match(
      executableSql,
      /assembly_decision_id[\s\S]*evidence_id[\s\S]*integrity_fingerprint[\s\S]*assessment_persistence_version[\s\S]*assessment_policy_version[\s\S]*trust_state[\s\S]*operational_eligible[\s\S]*assessment_reason[\s\S]*assessed_at/i,
    );

    assert.match(
      executableSql,
      /on\s+conflict\s*\(\s*organization_id\s*,\s*assembly_id\s*\)\s*do\s+nothing/i,
    );

    assert.match(
      executableSql,
      /v_checkpoint\.assembly_decision_id\s*<>\s*p_assembly_decision_id/i,
    );

    assert.match(
      executableSql,
      /v_checkpoint\.evidence_id\s*<>\s*p_evidence_id/i,
    );

    assert.match(
      executableSql,
      /v_checkpoint\.integrity_fingerprint\s*<>\s*p_integrity_fingerprint/i,
    );

    assert.match(
      executableSql,
      /v_checkpoint\.assessed_at\s*<>\s*p_assessed_at/i,
    );

    assert.match(
      executableSql,
      /raise\s+exception\s+'Conflicting positive HSPP checkpoint retry'/i,
    );
  },
);

test(
  "Q14r never updates or deletes immutable checkpoint history",
  () => {
    assert.doesNotMatch(
      executableSql,
      /\bupdate\s+public\.hspp_assembly_positive_assessment_checkpoints\b/i,
    );

    assert.doesNotMatch(
      executableSql,
      /\bdelete\s+from\s+public\.hspp_assembly_positive_assessment_checkpoints\b/i,
    );
  },
);

test(
  "Q14r TypeScript wrapper uses only the atomic RPC and binds decision provenance",
  () => {
    assert.match(
      wrapper,
      /persist_hspp_positive_assessment_checkpoint_under_execution_lease/,
    );

    assert.match(
      wrapper,
      /p_assembly_decision_id:\s*normalizedAssemblyDecisionId/,
    );

    assert.match(
      wrapper,
      /p_assembly_id:\s*normalizedAssemblyId/,
    );

    assert.match(
      wrapper,
      /p_evidence_id:\s*normalizedEvidenceId/,
    );

    assert.match(
      wrapper,
      /p_integrity_fingerprint:\s*normalizedFingerprint/,
    );

    assert.match(
      wrapper,
      /typeof\s+row\.checkpoint_id\s*!==\s*"string"/,
    );

    assert.doesNotMatch(
      wrapper,
      /\.from\s*\(\s*["']hspp_assembly_positive_assessment_checkpoints["']\s*\)/,
    );
  },
);

test(
  "Q14r changes exactly the leased Q6 persistence branch while retaining one executable generic branch",
  () => {
    assert.match(
      q6,
      /persistHsppPositiveAssessmentCheckpointUnderExecutionLease/,
    );

    assert.equal(
      (
        executableQ6.match(
          /\?\s*await\s+persistHsppPositiveAssessmentCheckpointUnderExecutionLease\s*\(\{/g,
        ) ?? []
      ).length,
      1,
    );

    assert.equal(
      (
        executableQ6.match(
          /:\s*await\s+applyHsppAssessmentDecision\s*\(\{/g,
        ) ?? []
      ).length,
      1,
    );

    assert.equal(
      (
        executableQ6.match(
          /\bapplyHsppAssessmentDecisionUnderExecutionLease\s*\(/g,
        ) ?? []
      ).length,
      0,
    );

    assert.match(
      executableQ6,
      /persistHsppPositiveAssessmentCheckpointUnderExecutionLease\s*\(\{[\s\S]*?organizationId,[\s\S]*?assemblyId,[\s\S]*?assemblyDecisionId,[\s\S]*?leaseToken:/,
    );
  },
);

test(
  "Q14r Q6 documentation no longer claims the generic writer exclusively owns all evidence mutation",
  () => {
    assert.doesNotMatch(
      q6,
      /Evidence mutation remains exclusively owned by/,
    );

    assert.match(
      q6,
      /lease-only atomic positive-[\r\n]+\s*\* checkpoint boundary/,
    );
  },
);