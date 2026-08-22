import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyAssessmentContext.ts",
  "utf8",
);

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B07I is explicitly versioned", () => {
  assert.match(
    source,
    /HSPP_SEALED_ASSEMBLY_ASSESSMENT_CONTEXT_RUNNER_VERSION/,
  );

  assert.match(source, /hspp-sealed-assembly-assessment-context-runner-v1/);
});

test("B07I invokes B07H exactly once", () => {
  const calls =
    executableSource.match(
      /await\s+runHsppSealedEvidenceAssemblyAuthority\s*\(/g,
    ) ?? [];

  assert.equal(calls.length, 1);
});

test("B07I invokes B11F2 exactly once", () => {
  const calls =
    executableSource.match(/\bbuildHsppAssemblyAssessmentInput\s*\(/g) ?? [];

  assert.equal(calls.length, 1);
});

test("B07I uses the exact retained B07D member provenance path", () => {
  assert.match(
    executableSource,
    /const\s+read\s*=\s*authority\.decisionPersistence\s*\.decisionRun\s*\.scanRun\s*\.read/s,
  );

  assert.match(executableSource, /const\s+scanInput\s*=\s*read\.scanInput/s);

  assert.match(executableSource, /scanInput\.members\.map/s);
});

test("B07I maps canonical member identity without reinterpretation", () => {
  assert.match(
    executableSource,
    /organizationId:\s*scanInput\.organizationId/s,
  );

  assert.match(executableSource, /assemblyId:\s*scanInput\.assemblyId/s);

  assert.match(executableSource, /evidenceId:\s*member\.evidenceId/s);

  assert.match(
    executableSource,
    /integrityFingerprint:\s*member\.integrityFingerprint/s,
  );

  assert.match(executableSource, /memberOrdinal:\s*member\.memberOrdinal/s);
});

test("B07I fails closed before B11F2 for non-candidate authority", () => {
  assert.match(
    executableSource,
    /authority\.authorityDecision\.state\s*!==\s*"ASSESSMENT_CANDIDATE"/s,
  );

  assert.match(
    executableSource,
    /authority\.authorityDecision\.reason\s*!==\s*"CONSISTENT_ASSEMBLY_CANDIDATE"/s,
  );
});

test("B07I does not re-read B07D", () => {
  assert.doesNotMatch(
    executableSource,
    /\breadHsppSealedEvidenceAssembly\s*\(/,
  );
});

test("B07I performs no direct database access", () => {
  const forbidden = [
    /\.from\s*\(/,
    /\.select\s*\(/,
    /\.insert\s*\(/,
    /\.update\s*\(/,
    /\.upsert\s*\(/,
    /\.delete\s*\(/,
    /\.rpc\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test("B07I does not persist or apply corroborated assessment", () => {
  assert.doesNotMatch(
    executableSource,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
  );

  assert.doesNotMatch(executableSource, /\bapplyHsppAssessmentDecision\s*\(/);
});

test("B07I introduces no downstream authority or scheduling behavior", () => {
  const forbidden = [
    /operationalEligible\s*:/,
    /crowdEligible\s*:/,
    /trainingEligible\s*:/,
    /validationEligible\s*:/,
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bCRON_SECRET\b/,
    /\bsetInterval\s*\(/,
    /\bsetTimeout\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(executableSource, pattern);
  }
});

test("B07M preserves the exact retained B07D membership relation", () => {
  assert.match(
    executableSource,
    /const\s+read\s*=\s*authority\.decisionPersistence\s*\.decisionRun\s*\.scanRun\s*\.read/s,
  );

  assert.match(
    executableSource,
    /const\s+membershipRelation\s*=\s*read\.membershipRelation/s,
  );

  assert.match(
    source,
    /membershipRelation:\s*HsppSealedAssemblyMembershipRelation\s*\|\s*null/,
  );

  assert.match(
    executableSource,
    /membershipRelation,\s*[\r\n]+\s*assessmentContext/s,
  );
});

test("B07M does not recompute or reload B11A2 membership provenance", () => {
  assert.doesNotMatch(
    executableSource,
    /\bevaluateHsppAssemblyMembership\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /\breadHsppSealedEvidenceAssembly\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /hspp_evidence_assembly_membership_relations/,
  );

  assert.doesNotMatch(executableSource, /\.from\s*\(/);

  assert.doesNotMatch(executableSource, /\.rpc\s*\(/);
});

test("B07M does not invoke B11F4", () => {
  assert.doesNotMatch(
    executableSource,
    /\bevaluateHsppMemberCorroboration\s*\(/,
  );

  assert.doesNotMatch(executableSource, /\bassessHsppCorroboratedMember\s*\(/);

  assert.doesNotMatch(
    executableSource,
    /\bpersistHsppCorroboratedMemberAssessment\s*\(/,
  );

  assert.doesNotMatch(executableSource, /\bapplyHsppAssessmentDecision\s*\(/);
});
