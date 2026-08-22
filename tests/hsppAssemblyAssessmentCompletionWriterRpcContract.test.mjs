import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "supabase/migrations/20260822162200_record_hspp_assembly_assessment_completion.sql",
  "utf8",
);

const executable = source.replace(/--.*$/gm, "");

test("Q13d5 creates exactly one privileged completion RPC", () => {
  const functions =
    executable.match(
      /create\s+or\s+replace\s+function\s+public\.record_hspp_assembly_assessment_completion\s*\(/gi,
    ) ?? [];

  assert.equal(functions.length, 1);

  assert.match(
    executable,
    /language\s+plpgsql[\s\S]*security\s+definer[\s\S]*set\s+search_path\s*=\s*public/i,
  );
});

test("Q13d5 RPC accepts only organization and assembly identity", () => {
  assert.match(
    executable,
    /record_hspp_assembly_assessment_completion\s*\(\s*p_organization_id\s+uuid\s*,\s*p_assembly_id\s+uuid\s*\)/i,
  );

  assert.doesNotMatch(executable, /\bp_assessed_at\b/i);
});

test("Q13d5 locks the exact parent assembly and requires SEALED", () => {
  assert.match(
    executable,
    /from\s+public\.hspp_evidence_assemblies[\s\S]*organization_id[\s\S]*p_organization_id[\s\S]*assembly\.id[\s\S]*p_assembly_id[\s\S]*for\s+update/i,
  );

  assert.match(executable, /v_assembly_state\s*<>\s*'SEALED'/i);
});

test("Q13d5 requires the pre-existing immutable retry identity", () => {
  assert.match(
    executable,
    /from\s+public\.hspp_assembly_assessment_retry_identities/i,
  );

  assert.match(executable, /completion requires an existing retry identity/i);
});

test("Q13d5 returns an existing completion before inserting", () => {
  const existingRead = executable.search(
    /from\s+public\.hspp_assembly_assessment_completions/i,
  );

  const insert = executable.search(
    /insert\s+into\s+public\.hspp_assembly_assessment_completions/i,
  );

  assert.ok(existingRead >= 0);

  assert.ok(insert > existingRead);

  assert.match(executable, /if\s+found\s+then[\s\S]*return\s+query/i);
});

test("Q13d5 inserts exactly one immutable completion fact", () => {
  const inserts =
    executable.match(
      /insert\s+into\s+public\.hspp_assembly_assessment_completions/gi,
    ) ?? [];

  assert.equal(inserts.length, 1);

  assert.doesNotMatch(executable, /on\s+conflict/i);

  assert.doesNotMatch(
    executable,
    /update\s+public\.hspp_assembly_assessment_completions/i,
  );

  assert.doesNotMatch(
    executable,
    /delete\s+from\s+public\.hspp_assembly_assessment_completions/i,
  );
});

test("Q13d5 does not duplicate assessedAt in the RPC data contract", () => {
  assert.doesNotMatch(executable, /\bp_assessed_at\b/i);

  const returnsTable = executable.match(
    /returns\s+table\s*\(([\s\S]*?)\)\s*language\s+plpgsql/i,
  );

  assert.ok(returnsTable);

  assert.doesNotMatch(returnsTable[1], /\bassessed_at\b/i);

  const completionInsert = executable.match(
    /insert\s+into\s+public\.hspp_assembly_assessment_completions\s*\(([\s\S]*?)\)\s*values/i,
  );

  assert.ok(completionInsert);

  assert.doesNotMatch(completionInsert[1], /\bassessed_at\b/i);
});
test("Q13d5 revokes default execute and grants only service_role", () => {
  assert.match(
    executable,
    /revoke\s+all[\s\S]*record_hspp_assembly_assessment_completion\s*\(\s*uuid\s*,\s*uuid\s*\)[\s\S]*from[\s\S]*public[\s\S]*anon[\s\S]*authenticated[\s\S]*service_role/i,
  );

  assert.match(
    executable,
    /grant\s+execute[\s\S]*record_hspp_assembly_assessment_completion\s*\(\s*uuid\s*,\s*uuid\s*\)[\s\S]*to\s+service_role/i,
  );
});

test("Q13d5 does not reopen direct completion table INSERT privileges", () => {
  assert.doesNotMatch(
    executable,
    /grant\s+insert[\s\S]*hspp_assembly_assessment_completions/i,
  );

  assert.doesNotMatch(
    executable,
    /grant\s+(update|delete)[\s\S]*hspp_assembly_assessment_completions/i,
  );
});

test("Q13d5 introduces no Q12 execution or mutable processing state", () => {
  assert.doesNotMatch(executable, /\b(started|running|failed|pending)\b/i);

  assert.doesNotMatch(executable, /\brun_hspp\b/i);
});
