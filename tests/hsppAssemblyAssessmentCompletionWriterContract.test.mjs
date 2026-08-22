import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/recordHsppAssemblyAssessmentCompletion.ts",
  "utf8",
);

test("Q13d5 exposes one versioned completion writer", () => {
  assert.match(source, /hspp-assembly-assessment-completion-writer-v1/);

  assert.match(source, /hspp-assembly-assessment-completion-v1/);

  assert.match(source, /record_hspp_assembly_assessment_completion/);
});

test("Q13d5 requires an already-returned terminal Q12 result", () => {
  assert.match(source, /terminalResult/);

  assert.match(source, /MEMBER_CORROBORATION_DENIED/);

  assert.match(source, /MEMBER_CORROBORATION_ELIGIBLE/);

  assert.match(source, /persistenceVersion !==[\s\S]*null/);

  assert.match(
    source,
    /HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_PERSISTENCE_VERSION/,
  );
});

test("Q13d5 performs exactly one RPC and no direct table access", () => {
  const rpcCalls = source.match(/\.rpc\s*\(/g) ?? [];

  assert.equal(rpcCalls.length, 1);

  assert.doesNotMatch(source, /\.from\s*\(/);

  assert.doesNotMatch(source, /\.(insert|upsert|update|delete)\s*\(/);
});

test("Q13d5 does not execute Q12 or recovery discovery", () => {
  assert.doesNotMatch(
    source,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting\s*\(/,
  );

  assert.doesNotMatch(
    source,
    /\bclaimHsppAssemblyAssessmentRetryIdentity\s*\(/,
  );

  assert.doesNotMatch(source, /\breadHsppAssemblyRecoveryWorkItems\s*\(/);

  assert.doesNotMatch(source, /\brunHsppOpenAssemblyRecoverySealing\s*\(/);
});

test("Q13d5 creates no wall-clock assessment identity", () => {
  assert.doesNotMatch(source, /Date\.now\s*\(/);

  assert.doesNotMatch(source, /new\s+Date\s*\(/);

  assert.doesNotMatch(source, /\.toISOString\s*\(/);
});

test("Q13d5 validates persisted organization assembly version and createdAt", () => {
  assert.match(source, /persistedOrganizationId/);

  assert.match(source, /persistedAssemblyId/);

  assert.match(source, /completionVersion/);

  assert.match(source, /createdAt/);

  assert.match(source, /Date\.parse/);
});
