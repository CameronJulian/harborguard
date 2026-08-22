import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedAssemblyRecoveryAssessment.ts",
  "utf8",
);

const functionMarker =
  "export async function runHsppSealedAssemblyRecoveryAssessment";

const functionStart = source.indexOf(functionMarker);

assert.notEqual(functionStart, -1);

const runtime = source.slice(functionStart);

function callCount(pattern) {
  return (runtime.match(pattern) ?? []).length;
}

test("Q13d7 exposes the versioned execution-lease recovery runner", () => {
  assert.match(source, /hspp-sealed-assembly-recovery-assessment-runner-v2/);

  assert.match(
    source,
    /export\s+async\s+function\s+runHsppSealedAssemblyRecoveryAssessment\s*\(/,
  );
});

test("Q13d7 input keeps caller-owned retry and execution identities", () => {
  assert.match(
    source,
    /export\s+type\s+RunHsppSealedAssemblyRecoveryAssessmentInput\s*=\s*\{[\s\S]*?supabase:\s*SupabaseClient;[\s\S]*?workItem:\s*HsppAssemblyRecoveryWorkItem;[\s\S]*?proposedAssessedAt:\s*string;[\s\S]*?leaseToken:\s*string;[\s\S]*?leaseSeconds:\s*number;[\s\S]*?\};/,
  );
});

test("Q13d7 accepts only a persisted SEALED recovery work item", () => {
  assert.match(runtime, /workItem\.assemblyState\s*!==\s*"SEALED"/);
  assert.match(runtime, /workItem\.organizationId/);
  assert.match(runtime, /workItem\.assemblyId/);
});

test("Q13d7 owns the exact recovery orchestration primitives", () => {
  assert.equal(callCount(/\breadHsppAssemblyAssessmentCompletion\s*\(/g), 2);
  assert.equal(
    callCount(/\bacquireHsppAssemblyAssessmentExecutionLease\s*\(/g),
    1,
  );
  assert.equal(
    callCount(/\bclaimHsppAssemblyAssessmentRetryIdentity\s*\(/g),
    1,
  );
  assert.equal(
    callCount(
      /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting\s*\(/g,
    ),
    1,
  );
  assert.equal(
    callCount(
      /\brecordHsppAssemblyAssessmentCompletionUnderExecutionLease\s*\(/g,
    ),
    1,
  );
  assert.equal(
    callCount(/\breleaseHsppAssemblyAssessmentExecutionLease\s*\(/g),
    1,
  );
  assert.equal(
    callCount(/\brenewHsppAssemblyAssessmentExecutionLease\s*\(/g),
    0,
  );
  assert.equal(
    callCount(/\brecordHsppAssemblyAssessmentCompletion\s*\(/g),
    0,
  );
});

test("Q13d7 orders preflight acquire re-read retry Q12 completion and release", () => {
  const preflightRead = runtime.indexOf(
    "await readHsppAssemblyAssessmentCompletion",
  );
  const acquire = runtime.indexOf(
    "await acquireHsppAssemblyAssessmentExecutionLease",
  );
  const busy = runtime.indexOf('branch: "EXECUTION_BUSY"');
  const postAcquireRead = runtime.lastIndexOf(
    "await readHsppAssemblyAssessmentCompletion",
  );
  const retryClaim = runtime.indexOf(
    "await claimHsppAssemblyAssessmentRetryIdentity",
  );
  const q12 = runtime.indexOf(
    "await runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting",
  );
  const completion = runtime.indexOf(
    "await recordHsppAssemblyAssessmentCompletionUnderExecutionLease",
  );
  const release = runtime.indexOf(
    "await releaseHsppAssemblyAssessmentExecutionLease",
  );

  assert.ok(preflightRead >= 0);
  assert.ok(acquire > preflightRead);
  assert.ok(busy > acquire);
  assert.ok(postAcquireRead > busy);
  assert.ok(retryClaim > postAcquireRead);
  assert.ok(q12 > retryClaim);
  assert.ok(completion > q12);
  assert.ok(release > completion);
});

test("Q13d7 BUSY stops without retry identity Q12 completion or release", () => {
  assert.match(
    runtime,
    /if\s*\(\s*leaseAcquisition\.state\s*===\s*"BUSY"\s*\)[\s\S]*?branch:\s*"EXECUTION_BUSY"[\s\S]*?leaseAcquisition,[\s\S]*?completion:\s*null[\s\S]*?retryIdentity:\s*null[\s\S]*?terminalResult:\s*null/,
  );
});

test("Q13d7 re-checks completion after acquisition before retry identity", () => {
  assert.match(
    runtime,
    /const\s+completionAfterAcquire\s*=[\s\S]*?await\s+readHsppAssemblyAssessmentCompletion\s*\([\s\S]*?if\s*\(\s*completionAfterAcquire\s*!==\s*null\s*\)[\s\S]*?branch:\s*"ALREADY_COMPLETED"[\s\S]*?completion:\s*completionAfterAcquire/,
  );
});

test("Q13d7 passes canonical retry identity and exact lease context into Q12", () => {
  assert.match(
    runtime,
    /runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting\s*\(\s*\{[\s\S]*?organizationId:\s*retryIdentity\.organizationId,[\s\S]*?assemblyId:\s*retryIdentity\.assemblyId,[\s\S]*?assessedAt:\s*retryIdentity\.assessedAt,[\s\S]*?executionLease,[\s\S]*?\}\s*,?\s*\)/,
  );

  assert.match(
    runtime,
    /const\s+executionLease:\s*HsppAssessmentExecutionLeaseContext\s*=\s*\{[\s\S]*?assemblyId:\s*leaseAcquisition\.assemblyId,[\s\S]*?leaseToken:\s*leaseAcquisition\.leaseToken/,
  );
});

test("Q13d7 records terminal Q12 completion only through the fenced writer", () => {
  assert.match(
    runtime,
    /recordHsppAssemblyAssessmentCompletionUnderExecutionLease\s*\(\s*\{[\s\S]*?organizationId:\s*retryIdentity\.organizationId,[\s\S]*?assemblyId:\s*retryIdentity\.assemblyId,[\s\S]*?leaseToken:\s*executionLease\.leaseToken,[\s\S]*?terminalResult,[\s\S]*?\}\s*\)/,
  );
});

test("Q13d7 releases acquired ownership in finally and preserves a primary failure", () => {
  assert.match(runtime, /\bfinally\s*\{/);

  assert.match(
    runtime,
    /finally\s*\{[\s\S]*?releaseHsppAssemblyAssessmentExecutionLease\s*\([\s\S]*?leaseToken:\s*leaseAcquisition\.leaseToken/,
  );

  assert.match(
    runtime,
    /catch\s*\(\s*releaseError\s*\)[\s\S]*?if\s*\(\s*primaryError\s*===\s*null\s*\)[\s\S]*?throw\s+releaseError/,
  );
});

test("Q13d7 has no direct database or recovery-discovery bypass", () => {
  assert.doesNotMatch(runtime, /\.from\s*\(/);
  assert.doesNotMatch(runtime, /\.rpc\s*\(/);
  assert.doesNotMatch(runtime, /\.(insert|upsert|update|delete)\s*\(/);
  assert.doesNotMatch(runtime, /\breadHsppAssemblyRecoveryWorkItems\s*\(/);
  assert.doesNotMatch(runtime, /\brunHsppOpenAssemblyRecoverySealing\s*\(/);
  assert.doesNotMatch(runtime, /\bsealHsppEvidenceAssembly\s*\(/);
});

test("Q13d7 does not generate assessment time lease identity or lease duration", () => {
  assert.doesNotMatch(runtime, /Date\.now\s*\(/);
  assert.doesNotMatch(runtime, /new\s+Date\s*\(\s*\)/);
  assert.doesNotMatch(runtime, /\.toISOString\s*\(/);
  assert.doesNotMatch(runtime, /\bcreatedAt\b/);
  assert.doesNotMatch(runtime, /\bsealedAt\b/);
  assert.doesNotMatch(runtime, /crypto\.randomUUID\s*\(/);
  assert.doesNotMatch(runtime, /leaseSeconds\s*=/);
});

test("Q13d7 adds no mutable attempt-state vocabulary", () => {
  assert.doesNotMatch(runtime, /\bSTARTED\b/);
  assert.doesNotMatch(runtime, /\bRUNNING\b/);
  assert.doesNotMatch(runtime, /\bPROCESSING\b/);
  assert.doesNotMatch(runtime, /\bexecution_id\b/);
  assert.doesNotMatch(runtime, /\battempt_id\b/);
});
