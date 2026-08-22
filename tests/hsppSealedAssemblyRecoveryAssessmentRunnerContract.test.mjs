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

test("Q13d7 exposes one explicit versioned SEALED recovery runner", () => {
  assert.match(source, /hspp-sealed-assembly-recovery-assessment-runner-v1/);

  assert.match(
    source,
    /export\s+async\s+function\s+runHsppSealedAssemblyRecoveryAssessment\s*\(/,
  );
});

test("Q13d7 input is supabase workItem and caller-owned proposedAssessedAt", () => {
  assert.match(
    source,
    /export\s+type\s+RunHsppSealedAssemblyRecoveryAssessmentInput\s*=\s*\{[\s\S]*?supabase:\s*SupabaseClient;[\s\S]*?workItem:\s*HsppAssemblyRecoveryWorkItem;[\s\S]*?proposedAssessedAt:\s*string;[\s\S]*?\};/,
  );
});

test("Q13d7 accepts only a persisted SEALED recovery work item", () => {
  assert.match(runtime, /workItem\.assemblyState\s*!==\s*"SEALED"/);

  assert.match(runtime, /workItem\.organizationId/);

  assert.match(runtime, /workItem\.assemblyId/);
});

test("Q13d7 invokes each recovery primitive exactly once in source", () => {
  assert.equal(callCount(/\breadHsppAssemblyAssessmentCompletion\s*\(/g), 1);

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

  assert.equal(callCount(/\brecordHsppAssemblyAssessmentCompletion\s*\(/g), 1);
});

test("Q13d7 checks completion before claiming retry identity", () => {
  const completionRead = runtime.indexOf(
    "await readHsppAssemblyAssessmentCompletion",
  );

  const alreadyCompleted = runtime.search(/branch:\s*"ALREADY_COMPLETED"/);

  const retryClaim = runtime.indexOf(
    "await claimHsppAssemblyAssessmentRetryIdentity",
  );

  assert.ok(completionRead >= 0);

  assert.ok(alreadyCompleted > completionRead);

  assert.ok(retryClaim > alreadyCompleted);
});

test("Q13d7 ALREADY_COMPLETED stops without retry identity or terminal result", () => {
  assert.match(
    runtime,
    /branch:\s*"ALREADY_COMPLETED"[\s\S]*?completion:\s*existingCompletion[\s\S]*?retryIdentity:\s*null[\s\S]*?terminalResult:\s*null/,
  );
});

test("Q13d7 passes exact caller-owned proposal into Q13d2", () => {
  assert.match(
    runtime,
    /claimHsppAssemblyAssessmentRetryIdentity\s*\(\s*\{[\s\S]*?organizationId,[\s\S]*?assemblyId,[\s\S]*?proposedAssessedAt,[\s\S]*?\}\s*\)/,
  );

  assert.doesNotMatch(runtime, /proposedAssessedAt\s*=\s*/);
});

test("Q13d7 passes only canonical Q13d2 identity into Q12 assessment identity", () => {
  assert.match(
    runtime,
    /runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting\s*\(\s*\{[\s\S]*?organizationId:\s*retryIdentity\.organizationId,[\s\S]*?assemblyId:\s*retryIdentity\.assemblyId,[\s\S]*?assessedAt:\s*retryIdentity\.assessedAt,[\s\S]*?\}\s*,?\s*\)/,
  );
});

test("Q13d7 passes the exact terminal Q12 result to Q13d5", () => {
  assert.match(
    runtime,
    /recordHsppAssemblyAssessmentCompletion\s*\(\s*\{[\s\S]*?organizationId:\s*retryIdentity\.organizationId,[\s\S]*?assemblyId:\s*retryIdentity\.assemblyId,[\s\S]*?terminalResult,[\s\S]*?\}\s*\)/,
  );

  assert.match(
    runtime,
    /branch:\s*"ASSESSMENT_COMPLETED"[\s\S]*?completion,[\s\S]*?retryIdentity,[\s\S]*?terminalResult,/,
  );
});

test("Q13d7 has no direct persistence bypass or recovery-discovery call", () => {
  assert.doesNotMatch(runtime, /\.from\s*\(/);

  assert.doesNotMatch(runtime, /\.rpc\s*\(/);

  assert.doesNotMatch(runtime, /\.(insert|upsert|update|delete)\s*\(/);

  assert.doesNotMatch(runtime, /\breadHsppAssemblyRecoveryWorkItems\s*\(/);

  assert.doesNotMatch(runtime, /\brunHsppOpenAssemblyRecoverySealing\s*\(/);

  assert.doesNotMatch(runtime, /\bsealHsppEvidenceAssembly\s*\(/);
});

test("Q13d7 does not generate or reconstruct assessment time", () => {
  assert.doesNotMatch(runtime, /Date\.now\s*\(/);

  assert.doesNotMatch(runtime, /new\s+Date\s*\(\s*\)/);

  assert.doesNotMatch(runtime, /\.toISOString\s*\(/);

  assert.doesNotMatch(runtime, /\bcreatedAt\b/);

  assert.doesNotMatch(runtime, /\bsealedAt\b/);
});

test("Q13d7 adds no mutable execution-state vocabulary", () => {
  assert.doesNotMatch(runtime, /\bSTARTED\b/);

  assert.doesNotMatch(runtime, /\bRUNNING\b/);

  assert.doesNotMatch(runtime, /\bPROCESSING\b/);

  assert.doesNotMatch(runtime, /\bexecution_id\b/);

  assert.doesNotMatch(runtime, /\battempt_id\b/);
});
