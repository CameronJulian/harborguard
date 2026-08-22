import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runtimeUrl = new URL(
  "../lib/hspp/runHsppOpenAssemblyRecoverySealing.ts",
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

test("Q13c has one explicit versioned OPEN recovery sealing contract", () => {
  assert.match(
    executable,
    /HSPP_OPEN_ASSEMBLY_RECOVERY_SEALING_RUNNER_VERSION\s*=\s*"hspp-open-assembly-recovery-sealing-runner-v1"/,
  );
});

test("Q13c consumes the committed Q13b recovery work-item type", () => {
  assert.match(
    source,
    /import\s+type\s+\{\s*HsppAssemblyRecoveryWorkItem\s*\}\s+from\s+["']@\/lib\/hspp\/readHsppAssemblyRecoveryWorkItems["']/s,
  );

  assert.match(executable, /workItem:\s*HsppAssemblyRecoveryWorkItem/);
});

test("Q13c calls the existing sealing boundary exactly once", () => {
  assert.equal(count(/\bawait\s+sealHsppEvidenceAssembly\s*\(/g), 1);

  assert.match(
    executable,
    /sealHsppEvidenceAssembly\s*\(\s*\{\s*supabase\s*,\s*organizationId\s*,\s*assemblyId\s*,?\s*\}\s*\)/s,
  );
});

test("Q13c accepts only a persisted OPEN work item with null sealedAt", () => {
  assert.match(executable, /workItem\.assemblyState\s*!==\s*"OPEN"/);

  assert.match(executable, /workItem\.sealedAt\s*!==\s*null/);
});

test("Q13c performs no recovery discovery itself", () => {
  assert.doesNotMatch(executable, /\breadHsppAssemblyRecoveryWorkItems\s*\(/);

  assert.doesNotMatch(executable, /\.from\s*\(/);

  assert.doesNotMatch(executable, /\.select\s*\(/);
});

test("Q13c performs no direct database mutation or RPC", () => {
  assert.doesNotMatch(executable, /\.rpc\s*\(/);

  assert.doesNotMatch(executable, /\.insert\s*\(/);

  assert.doesNotMatch(executable, /\.update\s*\(/);

  assert.doesNotMatch(executable, /\.upsert\s*\(/);

  assert.doesNotMatch(executable, /\.delete\s*\(/);
});

test("Q13c does not rerun Reservoir membership or assembly creation", () => {
  for (const forbiddenSymbol of [
    "readHsppReservoirCandidates",
    "runHsppReservoirReevaluation",
    "evaluateHsppReservoirReevaluation",
    "persistHsppReservoirAssemblyCandidate",
    "persistHsppEvidenceAssembly",
    "evaluateHsppAssemblyMembership",
  ]) {
    assert.doesNotMatch(executable, new RegExp(`\\b${forbiddenSymbol}\\s*\\(`));
  }
});

test("Q13c does not read scan assess corroborate or invoke Q12", () => {
  for (const forbiddenSymbol of [
    "readHsppSealedEvidenceAssembly",
    "runHsppSealedEvidenceAssemblyScan",
    "runHsppSealedEvidenceAssemblyDecision",
    "runHsppSealedEvidenceAssemblyCorroboratedPersistenceRouting",
    "runHsppSealedEvidenceAssemblyCorroboratedCandidacyRouting",
    "runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentRouting",
    "runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting",
    "applyHsppAssessmentDecision",
  ]) {
    assert.doesNotMatch(executable, new RegExp(`\\b${forbiddenSymbol}\\s*\\(`));
  }
});

test("Q13c contains no assessedAt or wall-clock retry identity", () => {
  assert.doesNotMatch(executable, /\bassessedAt\b/);

  assert.doesNotMatch(executable, /\bassessed_at\b/);

  assert.doesNotMatch(executable, /\bDate\.now\s*\(/);

  assert.doesNotMatch(executable, /\bnew\s+Date\s*\(/);

  assert.doesNotMatch(executable, /\.toISOString\s*\(/);
});

test("Q13c introduces no loop batch retry or scheduler execution", () => {
  assert.doesNotMatch(executable, /\bfor\s*\(/);

  assert.doesNotMatch(executable, /\.forEach\s*\(/);

  assert.doesNotMatch(executable, /\.map\s*\(/);

  assert.doesNotMatch(executable, /\bPromise\.all\s*\(/);

  assert.doesNotMatch(
    executable,
    /\bNextRequest\b|\bNextResponse\b|setInterval\s*\(|setTimeout\s*\(/,
  );
});

test("Q13c exposes exact input and exact sealing result references", () => {
  assert.match(executable, /workItem\s*,\s*sealedAssembly\s*,?\s*\}\s*;/s);

  assert.match(executable, /sealingVersion:\s*sealedAssembly\.sealingVersion/);
});
