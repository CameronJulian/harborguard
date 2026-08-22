import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const migration = fs.readFileSync(
  "supabase/migrations/20260822195000_rename_hspp_completion_execution_lease_rpc.sql",
  "utf8"
);

const wrapper = fs.readFileSync(
  "lib/hspp/recordHsppAssemblyAssessmentCompletionUnderExecutionLease.ts",
  "utf8"
);

const canonicalRpc =
  "record_hspp_assembly_assessment_completion_with_lease";

test("Q13e5c uses a PostgreSQL-safe canonical completion RPC identifier", () => {
  assert.ok(canonicalRpc.length <= 63);
});

test("Q13e5c renames the actual truncated Q13e5b function", () => {
  assert.match(
    migration,
    /alter\s+function\s+public\.record_hspp_assembly_assessment_completion_under_execution_leas\s*\(\s*uuid\s*,\s*uuid\s*,\s*uuid\s*\)\s*rename\s+to\s+record_hspp_assembly_assessment_completion_with_lease\s*;/i
  );
});

test("Q13e5c preserves the service-role-only execution boundary", () => {
  assert.match(
    migration,
    /revoke\s+all\s+on\s+function\s+public\.record_hspp_assembly_assessment_completion_with_lease[\s\S]*?from\s+public\s*;/i
  );

  assert.match(
    migration,
    /grant\s+execute\s+on\s+function\s+public\.record_hspp_assembly_assessment_completion_with_lease[\s\S]*?to\s+service_role\s*;/i
  );
});

test("Q13e5c reloads the PostgREST schema cache", () => {
  assert.match(
    migration,
    /notify\s+pgrst\s*,\s*'reload schema'\s*;/i
  );
});

test("the fenced completion wrapper calls only the canonical RPC name", () => {
  assert.match(
    wrapper,
    /"record_hspp_assembly_assessment_completion_with_lease"\s+as\s+const/
  );

  assert.doesNotMatch(
    wrapper,
    /"record_hspp_assembly_assessment_completion_under_execution_lease"\s+as\s+const/
  );
});