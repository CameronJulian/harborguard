import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260822154000_claim_hspp_assembly_assessment_retry_identity.sql",
  import.meta.url,
);

const migration = fs.readFileSync(migrationUrl, "utf8");

function stripSqlComments(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*--.*$/gm, "");
}

const executable = stripSqlComments(migration);

function count(pattern) {
  return (executable.match(pattern) ?? []).length;
}

test("Q13d2 creates exactly one claim-or-recover RPC", () => {
  assert.equal(
    count(
      /create\s+or\s+replace\s+function\s+public\.claim_hspp_assembly_assessment_retry_identity\s*\(/gi,
    ),
    1,
  );
});

test("Q13d2 accepts only organization assembly and caller-owned proposed assessedAt", () => {
  assert.match(
    executable,
    /p_organization_id\s+uuid\s*,\s*p_assembly_id\s+uuid\s*,\s*p_proposed_assessed_at\s+timestamptz/is,
  );

  assert.match(executable, /p_proposed_assessed_at\s+is\s+null/is);
});

test("Q13d2 returns canonical identity facts without execution status", () => {
  assert.match(
    executable,
    /returns\s+table\s*\(\s*organization_id\s+uuid\s*,\s*assembly_id\s+uuid\s*,\s*retry_identity_version\s+text\s*,\s*assessed_at\s+timestamptz\s*,\s*created_at\s+timestamptz\s*\)/is,
  );

  assert.doesNotMatch(
    executable,
    /\bclaim_state\s+(?:text|varchar)|\brecovery_state\s+(?:text|varchar)|\bcompletion_state\s+(?:text|varchar)/i,
  );
});

test("Q13d2 is the narrow security-definer exception with fixed search path", () => {
  assert.match(
    executable,
    /language\s+plpgsql\s+security\s+definer\s+set\s+search_path\s*=\s*public/is,
  );

  assert.doesNotMatch(executable, /security\s+invoker/i);
});

test("Q13d2 exposes execute only to service_role", () => {
  assert.match(
    executable,
    /revoke\s+all\s+on\s+function\s+public\.claim_hspp_assembly_assessment_retry_identity\s*\(\s*uuid\s*,\s*uuid\s*,\s*timestamptz\s*\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/is,
  );

  assert.match(
    executable,
    /grant\s+execute\s+on\s+function\s+public\.claim_hspp_assembly_assessment_retry_identity\s*\(\s*uuid\s*,\s*uuid\s*,\s*timestamptz\s*\)\s+to\s+service_role/is,
  );

  assert.doesNotMatch(
    executable,
    /grant\s+execute[\s\S]{0,180}\bto\s+(?:anon|authenticated)\b/i,
  );
});

test("Q13d2 does not reopen direct retry-identity table write privileges", () => {
  assert.doesNotMatch(
    executable,
    /grant\s+(?:insert|update|delete|all)[\s\S]{0,120}hspp_assembly_assessment_retry_identities/i,
  );

  assert.doesNotMatch(
    executable,
    /alter\s+table\s+public\.hspp_assembly_assessment_retry_identities[\s\S]{0,120}(?:enable|disable)\s+row\s+level\s+security/i,
  );
});

test("Q13d2 locks the exact organization-scoped assembly row", () => {
  assert.match(
    executable,
    /from\s+public\.hspp_evidence_assemblies\s+as\s+assembly[\s\S]*?assembly\.organization_id\s*=\s*p_organization_id[\s\S]*?assembly\.id\s*=\s*p_assembly_id[\s\S]*?for\s+update/is,
  );
});

test("Q13d2 permits claims only for SEALED assemblies", () => {
  assert.match(executable, /v_assembly_state\s*<>\s*'SEALED'/i);

  assert.doesNotMatch(executable, /v_assembly_state\s*=\s*'OPEN'/i);
});

test("Q13d2 reads the persisted identity before attempting first insert", () => {
  const readIndex = executable.search(
    /select\s+identity\.\*[\s\S]*?from\s+public\.hspp_assembly_assessment_retry_identities\s+as\s+identity/i,
  );

  const insertIndex = executable.search(
    /insert\s+into\s+public\.hspp_assembly_assessment_retry_identities/i,
  );

  assert.ok(readIndex >= 0, "Persisted retry identity read is required.");

  assert.ok(
    insertIndex > readIndex,
    "Persisted identity must be checked before insert.",
  );
});

test("Q13d2 has exactly one create-only identity insert using caller proposal", () => {
  assert.equal(
    count(
      /insert\s+into\s+public\.hspp_assembly_assessment_retry_identities\b/gi,
    ),
    1,
  );

  assert.match(
    executable,
    /values\s*\(\s*p_organization_id\s*,\s*p_assembly_id\s*,\s*p_proposed_assessed_at\s*\)/is,
  );

  assert.doesNotMatch(executable, /on\s+conflict\s+do\s+update/i);
});

test("Q13d2 never updates or deletes persisted retry identity", () => {
  assert.doesNotMatch(
    executable,
    /update\s+public\.hspp_assembly_assessment_retry_identities/i,
  );

  assert.doesNotMatch(
    executable,
    /delete\s+from\s+public\.hspp_assembly_assessment_retry_identities/i,
  );
});

test("Q13d2 returns existing persisted identity without comparing it to later proposal", () => {
  assert.match(
    executable,
    /if\s+found\s+then[\s\S]*?return\s+query[\s\S]*?v_identity\.assessed_at[\s\S]*?return\s*;/is,
  );

  assert.doesNotMatch(
    executable,
    /v_identity\.assessed_at\s*(?:<>|!=|=)\s*p_proposed_assessed_at/i,
  );
});

test("Q13d2 does not generate assessedAt from wall clock or lifecycle provenance", () => {
  assert.doesNotMatch(executable, /\bp_proposed_assessed_at\s*:=/i);

  assert.doesNotMatch(
    executable,
    /\bnow\s*\(\s*\)[\s\S]{0,100}\bassessed_at\b/i,
  );

  assert.doesNotMatch(
    executable,
    /\bcreated_at\b[\s\S]{0,60}\bp_proposed_assessed_at\b/i,
  );

  assert.doesNotMatch(
    executable,
    /\bsealed_at\b[\s\S]{0,60}\bp_proposed_assessed_at\b/i,
  );
});

test("Q13d2 introduces no Q12 completion or processing fields", () => {
  const forbiddenColumnPattern =
    /\b(?:completed_at|completion_state|processing_state|processed_at|execution_id|attempt_id|started_at|finished_at|q12_state|q12_status)\s+(?:text|boolean|bool|uuid|timestamptz|timestamp|integer|bigint|jsonb)\b/i;

  assert.doesNotMatch(executable, forbiddenColumnPattern);
});

test("Q13d2 does not mutate assembly state membership evidence or assessment results", () => {
  assert.doesNotMatch(executable, /update\s+public\.hspp_evidence_assemblies/i);

  assert.doesNotMatch(
    executable,
    /insert\s+into\s+public\.hspp_evidence_assembly_members\b/i,
  );

  assert.doesNotMatch(executable, /update\s+public\.hspp_evidence\b/i);

  assert.doesNotMatch(
    executable,
    /insert\s+into\s+public\.hspp_assembly_decisions\b/i,
  );
});
