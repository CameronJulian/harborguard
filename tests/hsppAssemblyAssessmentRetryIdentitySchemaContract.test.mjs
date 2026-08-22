import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260822152800_create_hspp_assembly_assessment_retry_identities.sql",
  import.meta.url,
);

const migration = fs.readFileSync(migrationUrl, "utf8");

function removeSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*--.*$/gm, "");
}

const executable = removeSqlComments(migration);

function count(pattern) {
  return (executable.match(pattern) ?? []).length;
}

test("Q13d1 creates exactly one assembly retry-identity table", () => {
  assert.equal(
    count(
      /create\s+table\s+public\.hspp_assembly_assessment_retry_identities\s*\(/gi,
    ),
    1,
  );

  assert.doesNotMatch(
    executable,
    /create\s+table\s+public\.hspp_evidence_assemblies\b/i,
  );
});

test("Q13d1 binds exactly one retry identity to one organization-scoped assembly", () => {
  assert.match(executable, /organization_id\s+uuid\s+not\s+null/i);

  assert.match(executable, /assembly_id\s+uuid\s+not\s+null/i);

  assert.match(executable, /assessed_at\s+timestamptz\s+not\s+null/i);

  assert.match(
    executable,
    /primary\s+key\s*\(\s*organization_id\s*,\s*assembly_id\s*\)/is,
  );
});

test("Q13d1 uses the existing organization-scoped assembly identity", () => {
  assert.match(
    executable,
    /foreign\s+key\s*\(\s*organization_id\s*,\s*assembly_id\s*\)\s*references\s+public\.hspp_evidence_assemblies\s*\(\s*organization_id\s*,\s*id\s*\)\s*on\s+delete\s+restrict/is,
  );
});

test("Q13d1 versions the retry-identity protocol explicitly", () => {
  assert.match(
    executable,
    /retry_identity_version\s+text\s+not\s+null\s+default\s+'hspp-assembly-assessment-retry-identity-v1'/is,
  );

  assert.match(
    executable,
    /length\s*\(\s*btrim\s*\(\s*retry_identity_version\s*\)\s*\)\s*>\s*0/is,
  );
});

test("Q13d1 assessed_at is caller-owned and has no SQL default", () => {
  assert.match(executable, /\bassessed_at\s+timestamptz\s+not\s+null\s*,/i);

  assert.doesNotMatch(
    executable,
    /\bassessed_at\s+timestamptz\s+not\s+null\s+default\b/i,
  );
});

test("Q13d1 keeps persistence provenance separate from retry identity", () => {
  assert.match(
    executable,
    /\bcreated_at\s+timestamptz\s+not\s+null\s+default\s+now\s*\(\s*\)/is,
  );

  assert.equal(count(/\bcreated_at\s+timestamptz\b/gi), 1);

  assert.equal(count(/\bassessed_at\s+timestamptz\b/gi), 1);
});

test("Q13d1 introduces no Q12 completion or processing columns", () => {
  const forbiddenColumnPattern =
    /\b(?:completed_at|completion_state|processing_state|processed_at|execution_id|attempt_id|started_at|finished_at|q12_state|q12_status)\s+(?:text|boolean|bool|uuid|timestamptz|timestamp|integer|bigint|jsonb)\b/i;

  assert.doesNotMatch(executable, forbiddenColumnPattern);
});

test("Q13d1 does not extend the assembly lifecycle state machine", () => {
  assert.doesNotMatch(
    executable,
    /alter\s+table\s+public\.hspp_evidence_assemblies/is,
  );

  assert.doesNotMatch(
    executable,
    /\bassembly_state\s+(?:text|varchar|character)/i,
  );

  assert.doesNotMatch(executable, /'OPEN'\s*,\s*'SEALED'/i);
});

test("Q13d1 is dormant and creates no writer or Q12 execution primitive", () => {
  assert.doesNotMatch(executable, /\binsert\s+into\b/i);

  assert.doesNotMatch(executable, /\bupdate\s+public\.hspp_/i);

  assert.doesNotMatch(executable, /\bdelete\s+from\b/i);

  assert.doesNotMatch(executable, /\bgrant\s+insert\b/i);

  assert.doesNotMatch(executable, /\bgrant\s+update\b/i);

  assert.doesNotMatch(executable, /\bgrant\s+delete\b/i);

  assert.doesNotMatch(executable, /\bgrant\s+execute\b/i);

  assert.doesNotMatch(executable, /\bclaim_hspp\b/i);

  assert.doesNotMatch(executable, /\bresume_hspp\b/i);

  assert.doesNotMatch(executable, /\brun_hspp\b/i);
});

test("Q13d1 exposes only service-role read access at the table boundary", () => {
  assert.match(
    executable,
    /revoke\s+all\s+on\s+table\s+public\.hspp_assembly_assessment_retry_identities\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/is,
  );

  assert.match(
    executable,
    /grant\s+select\s+on\s+table\s+public\.hspp_assembly_assessment_retry_identities\s+to\s+service_role/is,
  );

  assert.doesNotMatch(
    executable,
    /grant\s+select[\s\S]{0,120}\bto\s+(?:anon|authenticated)\b/i,
  );
});

test("Q13d1 enables RLS without inventing an authenticated policy", () => {
  assert.match(
    executable,
    /alter\s+table\s+public\.hspp_assembly_assessment_retry_identities\s+enable\s+row\s+level\s+security/is,
  );

  assert.doesNotMatch(executable, /create\s+policy\b/i);
});

test("Q13d1 makes persisted retry identity immutable", () => {
  assert.match(
    executable,
    /create\s+or\s+replace\s+function\s+public\.prevent_hspp_assembly_assessment_retry_identity_changes\s*\(\s*\)/is,
  );

  assert.match(
    executable,
    /before\s+update\s+on\s+public\.hspp_assembly_assessment_retry_identities/is,
  );

  assert.match(
    executable,
    /before\s+delete\s+on\s+public\.hspp_assembly_assessment_retry_identities/is,
  );

  assert.match(
    executable,
    /HSPP assembly assessment retry identities are immutable\./,
  );
});

test("Q13d1 does not modify HSPP evidence assessment state", () => {
  assert.doesNotMatch(executable, /alter\s+table\s+public\.hspp_evidence\b/is);

  assert.doesNotMatch(executable, /update\s+public\.hspp_evidence\b/is);

  assert.doesNotMatch(executable, /\btrust_state\b/i);

  assert.doesNotMatch(executable, /\bvalidation_state\b/i);

  assert.doesNotMatch(executable, /\boperational_eligible\b/i);
});

test("Q13d1 does not mutate assembly decision provenance", () => {
  assert.doesNotMatch(
    executable,
    /alter\s+table\s+public\.hspp_assembly_decisions\b/is,
  );

  assert.doesNotMatch(
    executable,
    /insert\s+into\s+public\.hspp_assembly_decisions\b/is,
  );
});
