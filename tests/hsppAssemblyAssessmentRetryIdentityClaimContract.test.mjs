import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runtimeUrl = new URL(
  "../lib/hspp/claimHsppAssemblyAssessmentRetryIdentity.ts",
  import.meta.url,
);

const source = fs.readFileSync(runtimeUrl, "utf8");

function stripComments(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

const executable = stripComments(source);

function count(pattern) {
  return (executable.match(pattern) ?? []).length;
}

test("Q13d2 exposes one explicit versioned claim boundary", () => {
  assert.match(
    executable,
    /HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_VERSION\s*=\s*"hspp-assembly-assessment-retry-identity-claim-v1"/,
  );

  assert.match(
    executable,
    /HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_VERSION\s*=\s*"hspp-assembly-assessment-retry-identity-v1"/,
  );
});

test("Q13d2 calls only the exact claim-or-recover RPC once", () => {
  assert.match(
    executable,
    /HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_CLAIM_RPC\s*=\s*"claim_hspp_assembly_assessment_retry_identity"/,
  );

  assert.equal(count(/\bawait\s+supabase\.rpc\s*\(/g), 1);

  assert.doesNotMatch(executable, /\.from\s*\(/);

  assert.doesNotMatch(executable, /\.(?:insert|update|upsert|delete)\s*\(/);
});

test("Q13d2 passes organization assembly and caller proposal exactly to RPC", () => {
  assert.match(executable, /p_organization_id:\s*normalizedOrganizationId/s);

  assert.match(executable, /p_assembly_id:\s*normalizedAssemblyId/s);

  assert.match(
    executable,
    /p_proposed_assessed_at:\s*normalizedProposedAssessedAt/s,
  );
});

test("Q13d2 accepts persisted assessedAt independently of the later proposal", () => {
  assert.match(
    executable,
    /assessedAt\s*=\s*requireTimestamp\s*\(\s*row\.assessed_at/s,
  );

  assert.doesNotMatch(
    executable,
    /assessedAt\s*!==\s*normalizedProposedAssessedAt/,
  );

  assert.doesNotMatch(
    executable,
    /row\.assessed_at\s*!==\s*normalizedProposedAssessedAt/,
  );
});

test("Q13d2 validates organization assembly version and persisted timestamps", () => {
  assert.match(
    executable,
    /persistedOrganizationId\s*!==\s*normalizedOrganizationId/s,
  );

  assert.match(executable, /persistedAssemblyId\s*!==\s*normalizedAssemblyId/s);

  assert.match(
    executable,
    /retryIdentityVersion\s*!==\s*HSPP_ASSEMBLY_ASSESSMENT_RETRY_IDENTITY_VERSION/s,
  );

  assert.match(executable, /row\.created_at/);
});

test("Q13d2 does not generate wall-clock retry identity", () => {
  assert.doesNotMatch(executable, /\bDate\.now\s*\(/);

  assert.doesNotMatch(executable, /\bnew\s+Date\s*\(/);

  assert.doesNotMatch(executable, /\.toISOString\s*\(/);
});

test("Q13d2 introduces no Q12 execution or completion protocol", () => {
  for (const forbidden of [
    "runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting",
    "completionState",
    "completedAt",
    "processingState",
    "executionId",
    "attemptId",
    "PENDING",
    "RUNNING",
    "COMPLETED",
    "FAILED",
  ]) {
    assert.equal(
      executable.includes(forbidden),
      false,
      `Q13d2 runtime must not introduce ${forbidden}.`,
    );
  }
});

test("Q13d2 returns only canonical retry identity facts", () => {
  assert.match(executable, /claimVersion:/);

  assert.match(executable, /retryIdentityVersion:/);

  assert.match(executable, /organizationId:/);

  assert.match(executable, /assemblyId:/);

  assert.match(executable, /assessedAt,/);

  assert.match(executable, /createdAt,/);

  assert.doesNotMatch(
    executable,
    /\bclaimState\b|\brecoveryState\b|\bcompletionState\b/,
  );
});
