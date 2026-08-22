import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/readHsppAssemblyAssessmentCompletion.ts",
  "utf8",
);

test("Q13d6 exposes one explicit versioned completion reader", () => {
  assert.match(source, /hspp-assembly-assessment-completion-reader-v1/);

  assert.match(
    source,
    /export\s+async\s+function\s+readHsppAssemblyAssessmentCompletion\s*\(/,
  );
});

test("Q13d6 performs exactly one direct read of the completion table", () => {
  const fromCalls = source.match(/\.from\s*\(/g) ?? [];

  assert.equal(fromCalls.length, 1);

  assert.match(
    source,
    /\.from\s*\(\s*"hspp_assembly_assessment_completions"\s*,?\s*\)/s,
  );

  assert.match(source, /\.maybeSingle\s*\(\s*\)/s);
});

test("Q13d6 selects only immutable completion fact fields", () => {
  assert.match(source, /"organization_id"/);

  assert.match(source, /"assembly_id"/);

  assert.match(source, /"completion_version"/);

  assert.match(source, /"created_at"/);

  assert.doesNotMatch(source, /\bassessed_at\b/);
});

test("Q13d6 scopes lookup by exact organization and assembly", () => {
  assert.match(
    source,
    /\.eq\s*\(\s*"organization_id"\s*,\s*normalizedOrganizationId\s*,?\s*\)/s,
  );

  assert.match(
    source,
    /\.eq\s*\(\s*"assembly_id"\s*,\s*normalizedAssemblyId\s*,?\s*\)/s,
  );
});

test("Q13d6 returns null only when the immutable completion row is absent", () => {
  assert.match(
    source,
    /if\s*\(\s*data\s*===\s*null\s*\)\s*\{\s*return\s+null\s*;/s,
  );
});

test("Q13d6 validates persisted identity version and createdAt", () => {
  assert.match(source, /persistedOrganizationId/);

  assert.match(source, /persistedAssemblyId/);

  assert.match(source, /HSPP_ASSEMBLY_ASSESSMENT_COMPLETION_VERSION/);

  assert.match(source, /createdAt/);

  assert.match(source, /Date\.parse/);
});

test("Q13d6 has no mutation or privileged RPC path", () => {
  assert.doesNotMatch(source, /\.rpc\s*\(/);

  assert.doesNotMatch(source, /\.(insert|upsert|update|delete)\s*\(/);
});

test("Q13d6 does not orchestrate retry identity Q12 or completion writes", () => {
  assert.doesNotMatch(
    source,
    /\bclaimHsppAssemblyAssessmentRetryIdentity\s*\(/,
  );

  assert.doesNotMatch(
    source,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting\s*\(/,
  );

  assert.doesNotMatch(source, /\brecordHsppAssemblyAssessmentCompletion\s*\(/);

  assert.doesNotMatch(source, /\breadHsppAssemblyRecoveryWorkItems\s*\(/);
});

test("Q13d6 does not generate wall-clock lifecycle identity", () => {
  assert.doesNotMatch(source, /Date\.now\s*\(/);

  assert.doesNotMatch(source, /new\s+Date\s*\(/);

  assert.doesNotMatch(source, /\.toISOString\s*\(/);
});
