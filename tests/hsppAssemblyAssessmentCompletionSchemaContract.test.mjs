import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260822160000_create_hspp_assembly_assessment_completions.sql",
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

const tableMatch = executable.match(
  /create\s+table\s+public\.hspp_assembly_assessment_completions\s*\(([\s\S]*?)\)\s*;/i,
);

assert.ok(tableMatch, "Q13d4 completion table body must exist.");

const tableBody = tableMatch[1];

test("Q13d4 creates exactly one whole-Q12 completion table", () => {
  assert.equal(
    count(
      /create\s+table\s+public\.hspp_assembly_assessment_completions\s*\(/gi,
    ),
    1,
  );
});

test("Q13d4 keys exactly one completion fact by organization and assembly", () => {
  assert.match(tableBody, /\borganization_id\s+uuid\s+not\s+null\b/i);

  assert.match(tableBody, /\bassembly_id\s+uuid\s+not\s+null\b/i);

  assert.match(
    tableBody,
    /primary\s+key\s*\(\s*organization_id\s*,\s*assembly_id\s*\)/is,
  );
});

test("Q13d4 requires an already persisted immutable retry identity", () => {
  assert.match(
    tableBody,
    /foreign\s+key\s*\(\s*organization_id\s*,\s*assembly_id\s*\)\s*references\s+public\.hspp_assembly_assessment_retry_identities\s*\(\s*organization_id\s*,\s*assembly_id\s*\)\s*on\s+delete\s+restrict/is,
  );
});

test("Q13d4 versions the completion fact explicitly", () => {
  assert.match(
    tableBody,
    /\bcompletion_version\s+text\s+not\s+null\s+default\s+'hspp-assembly-assessment-completion-v1'/is,
  );

  assert.match(
    tableBody,
    /check\s*\(\s*length\s*\(\s*btrim\s*\(\s*completion_version\s*\)\s*\)\s*>\s*0\s*\)/is,
  );
});

test("Q13d4 does not duplicate or regenerate the canonical assessedAt identity", () => {
  assert.doesNotMatch(tableBody, /\bassessed_at\b/i);

  assert.doesNotMatch(executable, /\bp_proposed_assessed_at\b/i);

  assert.doesNotMatch(
    executable,
    /\bclaim_hspp_assembly_assessment_retry_identity\s*\(/i,
  );
});

test("Q13d4 uses created_at only as checkpoint persistence provenance", () => {
  assert.match(
    tableBody,
    /\bcreated_at\s+timestamptz\s+not\s+null\s+default\s+now\s*\(\s*\)/is,
  );

  assert.doesNotMatch(tableBody, /\bcompleted_at\b/i);
});

test("Q13d4 uses immutable row existence rather than a mutable execution state machine", () => {
  assert.doesNotMatch(
    tableBody,
    /\b(?:completion_state|processing_state|q12_state|q12_status|execution_id|attempt_id|started_at|finished_at)\b/i,
  );
});

test("Q13d4 does not extend the OPEN SEALED assembly lifecycle state machine", () => {
  assert.doesNotMatch(
    executable,
    /alter\s+table\s+public\.hspp_evidence_assemblies\b/is,
  );

  assert.doesNotMatch(
    executable,
    /update\s+public\.hspp_evidence_assemblies\b/is,
  );
});

test("Q13d4 is dormant and creates no completion writer or execution RPC", () => {
  assert.doesNotMatch(
    executable,
    /insert\s+into\s+public\.hspp_assembly_assessment_completions\b/is,
  );

  assert.doesNotMatch(
    executable,
    /update\s+public\.hspp_assembly_assessment_completions\b/is,
  );

  assert.doesNotMatch(
    executable,
    /delete\s+from\s+public\.hspp_assembly_assessment_completions\b/is,
  );

  assert.equal(count(/create\s+or\s+replace\s+function\s+public\./gi), 1);

  assert.match(
    executable,
    /create\s+or\s+replace\s+function\s+public\.prevent_hspp_assembly_assessment_completion_changes\s*\(\s*\)/is,
  );
});

test("Q13d4 exposes service-role read access only", () => {
  assert.match(
    executable,
    /revoke\s+all\s+on\s+table\s+public\.hspp_assembly_assessment_completions\s+from\s+public\s*,\s*anon\s*,\s*authenticated\s*,\s*service_role/is,
  );

  assert.match(
    executable,
    /grant\s+select\s+on\s+table\s+public\.hspp_assembly_assessment_completions\s+to\s+service_role/is,
  );

  assert.doesNotMatch(
    executable,
    /grant\s+(?:insert|update|delete|all)\b[\s\S]{0,160}public\.hspp_assembly_assessment_completions/i,
  );
});

test("Q13d4 enables RLS without inventing authenticated policy access", () => {
  assert.match(
    executable,
    /alter\s+table\s+public\.hspp_assembly_assessment_completions\s+enable\s+row\s+level\s+security/is,
  );

  assert.doesNotMatch(executable, /create\s+policy\b/i);
});

test("Q13d4 makes the completion fact immutable after insertion", () => {
  assert.match(
    executable,
    /before\s+update\s+on\s+public\.hspp_assembly_assessment_completions/is,
  );

  assert.match(
    executable,
    /before\s+delete\s+on\s+public\.hspp_assembly_assessment_completions/is,
  );

  assert.match(
    executable,
    /HSPP assembly assessment completions are immutable\./,
  );
});

test("Q13d4 does not mutate HSPP evidence assessment state", () => {
  assert.doesNotMatch(executable, /alter\s+table\s+public\.hspp_evidence\b/is);

  assert.doesNotMatch(executable, /update\s+public\.hspp_evidence\b/is);

  assert.doesNotMatch(executable, /\btrust_state\b/i);

  assert.doesNotMatch(executable, /\boperational_eligible\b/i);
});

test("Q13d4 does not mutate the immutable retry identity", () => {
  assert.doesNotMatch(
    executable,
    /insert\s+into\s+public\.hspp_assembly_assessment_retry_identities\b/is,
  );

  assert.doesNotMatch(
    executable,
    /update\s+public\.hspp_assembly_assessment_retry_identities\b/is,
  );

  assert.doesNotMatch(
    executable,
    /delete\s+from\s+public\.hspp_assembly_assessment_retry_identities\b/is,
  );
});

test("Q13d4 does not mutate assembly-decision provenance", () => {
  assert.doesNotMatch(
    executable,
    /alter\s+table\s+public\.hspp_assembly_decisions\b/is,
  );

  assert.doesNotMatch(
    executable,
    /insert\s+into\s+public\.hspp_assembly_decisions\b/is,
  );
});
