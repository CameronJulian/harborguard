import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const runtimeUrl = new URL(
  "../lib/hspp/readHsppAssemblyRecoveryWorkItems.ts",
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

test("Q13b has one explicit versioned bounded recovery-discovery contract", () => {
  assert.match(
    executable,
    /HSPP_ASSEMBLY_RECOVERY_DISCOVERY_VERSION\s*=\s*"hspp-assembly-recovery-discovery-v1"/,
  );

  assert.match(
    executable,
    /HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT\s*=\s*100/,
  );
});

test("Q13b reads exactly the assembly table and exact lifecycle columns", () => {
  assert.equal(count(/\.from\(\s*["']hspp_evidence_assemblies["']\s*\)/g), 1);

  for (const column of [
    '"id"',
    '"organization_id"',
    '"assembly_version"',
    '"membership_policy_version"',
    '"assembly_state"',
    '"created_at"',
    '"sealed_at"',
  ]) {
    assert.match(executable, new RegExp(column));
  }
});

test("Q13b is exactly organization and single-state scoped", () => {
  assert.equal(count(/\.eq\(\s*["']organization_id["']/g), 1);
  assert.equal(count(/\.eq\(\s*["']assembly_state["']/g), 1);

  assert.match(
    executable,
    /\.eq\(\s*["']organization_id["']\s*,\s*normalizedOrganizationId\s*\)/,
  );

  assert.match(
    executable,
    /\.eq\(\s*["']assembly_state["']\s*,\s*normalizedAssemblyState\s*\)/,
  );

  assert.doesNotMatch(executable, /\.in\(\s*["']assembly_state["']/);
});

test("Q13b uses deterministic created_at then id ordering", () => {
  const createdAtOrder = executable.indexOf('.order("created_at",');
  const idOrder = executable.indexOf('.order("id",');

  assert.ok(createdAtOrder >= 0);
  assert.ok(idOrder > createdAtOrder);

  assert.match(
    executable,
    /\.order\(\s*["']created_at["']\s*,\s*\{\s*ascending:\s*true\s*,?\s*\}\s*\)/s,
  );

  assert.match(
    executable,
    /\.order\(\s*["']id["']\s*,\s*\{\s*ascending:\s*true\s*,?\s*\}\s*\)/s,
  );

  assert.equal(count(/\.order\s*\(/g), 2);
});

test("Q13b applies exactly one bounded requested limit", () => {
  assert.equal(count(/\.limit\s*\(/g), 1);

  assert.match(executable, /\.limit\(\s*requestedLimit\s*\)/);

  assert.match(executable, /normalized\s*<=\s*0/);

  assert.match(
    executable,
    /normalized\s*>\s*HSPP_ASSEMBLY_RECOVERY_DISCOVERY_MAX_LIMIT/,
  );
});

test("Q13b accepts only OPEN or SEALED lifecycle state", () => {
  assert.match(
    executable,
    /assemblyState\s*!==\s*"OPEN"\s*&&\s*assemblyState\s*!==\s*"SEALED"/s,
  );

  assert.match(
    executable,
    /persistedAssemblyState\s*!==\s*"OPEN"\s*&&\s*persistedAssemblyState\s*!==\s*"SEALED"/s,
  );
});

test("Q13b validates the persisted sealed_at lifecycle invariant", () => {
  assert.match(
    executable,
    /persistedAssemblyState\s*===\s*"OPEN"\s*&&\s*sealedAt\s*!==\s*null/,
  );

  assert.match(
    executable,
    /persistedAssemblyState\s*===\s*"SEALED"\s*&&\s*sealedAt\s*===\s*null/,
  );
});

test("Q13b does not read assembly membership or evidence state", () => {
  for (const forbidden of [
    "hspp_evidence_assembly_members",
    "hspp_assembly_membership_relations",
    "hspp_evidence_assessments",
    "hspp_assembly_decisions",
  ]) {
    assert.equal(
      executable.includes(forbidden),
      false,
      `Q13b must not access ${forbidden}.`,
    );
  }

  assert.equal(count(/\.from\s*\(/g), 1);
});

test("Q13b performs no database mutation or RPC", () => {
  assert.doesNotMatch(executable, /\.insert\s*\(/);
  assert.doesNotMatch(executable, /\.update\s*\(/);
  assert.doesNotMatch(executable, /\.upsert\s*\(/);
  assert.doesNotMatch(executable, /\.delete\s*\(/);
  assert.doesNotMatch(executable, /\.rpc\s*\(/);
});

test("Q13b does not invoke Reservoir assembly sealing scan or Q12 execution", () => {
  for (const forbiddenSymbol of [
    "readHsppReservoirCandidates",
    "runHsppReservoirReevaluation",
    "persistHsppReservoirAssemblyCandidate",
    "persistHsppEvidenceAssembly",
    "sealHsppEvidenceAssembly",
    "readHsppSealedEvidenceAssembly",
    "runHsppSealedEvidenceAssemblyScan",
    "runHsppSealedEvidenceAssemblyCorroboratedOperationalAssessmentPersistenceRouting",
    "applyHsppAssessmentDecision",
  ]) {
    assert.doesNotMatch(executable, new RegExp(`\\b${forbiddenSymbol}\\s*\\(`));
  }
});

test("Q13b does not create assessment retry identity or wall-clock time", () => {
  assert.doesNotMatch(executable, /\bassessedAt\b/);
  assert.doesNotMatch(executable, /\bassessed_at\b/);
  assert.doesNotMatch(executable, /\bDate\.now\s*\(/);
  assert.doesNotMatch(executable, /\bnew\s+Date\s*\(/);
  assert.doesNotMatch(executable, /\.toISOString\s*\(/);
});

test("Q13b constructs no downstream trust or eligibility grant", () => {
  assert.doesNotMatch(executable, /\boperationalEligible\s*:\s*true\b/);

  assert.doesNotMatch(executable, /\bcrowdEligible\s*:\s*true\b/);

  assert.doesNotMatch(executable, /\btrainingEligible\s*:\s*true\b/);

  assert.doesNotMatch(executable, /\bvalidationEligible\s*:\s*true\b/);

  assert.doesNotMatch(executable, /\btrustState\s*:\s*["']VERIFIED["']/);
});

test("Q13b contains no API cron queue or scheduler execution", () => {
  assert.doesNotMatch(
    executable,
    /\bNextRequest\b|\bNextResponse\b|setInterval\s*\(|setTimeout\s*\(/,
  );
});
