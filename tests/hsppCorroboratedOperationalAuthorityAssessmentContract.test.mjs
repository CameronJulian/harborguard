import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const runtimePath = path.join(
  process.cwd(),
  "lib/hspp/assessHsppCorroboratedOperationalAuthority.ts",
);

const source = fs.readFileSync(runtimePath, "utf8");

const executableSource = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

test("B7490-07Q4 defines an explicit versioned operational assessment policy", () => {
  assert.match(source, /HSPP_CORROBORATED_OPERATIONAL_ASSESSMENT_VERSION/);

  assert.match(source, /hspp-corroborated-operational-assessment-v1/);
});

test("B7490-07Q4 consumes the B11G2 authority decision directly", () => {
  assert.match(source, /HsppCorroboratedOperationalAuthorityDecision/);

  assert.match(source, /HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION/);

  assert.match(
    source,
    /authorityDecision:\s*HsppCorroboratedOperationalAuthorityDecision/,
  );
});

test("B7490-07Q4 constructs an HsppAssessmentDecision-compatible result", () => {
  assert.match(source, /HsppAssessmentDecision/);

  assert.match(
    source,
    /HsppCorroboratedOperationalAssessment[\s\S]*HsppAssessmentDecision/,
  );

  assert.match(source, /operationalEligible:\s*boolean/);

  assert.match(source, /crowdEligible:\s*false/);

  assert.match(source, /trainingEligible:\s*false/);

  assert.match(source, /validationEligible:\s*false/);
});

test("B7490-07Q4 requires the exact successful B11G2 candidacy contract", () => {
  assert.match(
    executableSource,
    /decision\.policyVersion\s*!==\s*HSPP_CORROBORATED_OPERATIONAL_AUTHORITY_VERSION/,
  );

  assert.match(
    executableSource,
    /decision\.state\s*!==[\s\S]*"OPERATIONAL_AUTHORITY_CANDIDATE"/,
  );

  assert.match(
    executableSource,
    /decision\.reason\s*!==[\s\S]*"CORROBORATED_OPERATIONAL_PRECONDITIONS_MET"/,
  );

  assert.match(executableSource, /decision\.authority\s*!==\s*"NONE"/);

  assert.match(executableSource, /decision\.trustState\s*!==\s*"CORROBORATED"/);
});

test("B7490-07Q4 verifies exact B11F6 and B11F5 provenance versions", () => {
  assert.match(
    executableSource,
    /decision\.sourcePersistenceVersion\s*!==[\s\S]*HSPP_MEMBER_CORROBORATED_PERSISTENCE_VERSION/,
  );

  assert.match(
    executableSource,
    /decision\.sourceAssessmentPolicyVersion\s*!==[\s\S]*HSPP_MEMBER_CORROBORATED_ASSESSMENT_VERSION/,
  );
});

test("B7490-07Q4 validates immutable target and support provenance", () => {
  assert.match(executableSource, /decision\.organizationId/);

  assert.match(executableSource, /decision\.assemblyId/);

  assert.match(executableSource, /decision\.assemblyDecisionId/);

  assert.match(executableSource, /decision\.evidenceId/);

  assert.match(executableSource, /decision\.integrityFingerprint/);

  assert.match(executableSource, /decision\.supportingEvidenceIds/);

  assert.match(executableSource, /decision\.independentSupportCount/);

  assert.match(executableSource, /\^\[a-f0-9\]\{64\}\$/);

  assert.match(executableSource, /new Set\(/);
});

test("B7490-07Q4 successful assessment grants operational eligibility only", () => {
  assert.match(executableSource, /operationalEligible[\s\S]*true/);

  assert.match(
    executableSource,
    /"CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED"/,
  );

  assert.doesNotMatch(executableSource, /crowdEligible:\s*true/);

  assert.doesNotMatch(executableSource, /trainingEligible:\s*true/);

  assert.doesNotMatch(executableSource, /validationEligible:\s*true/);

  assert.doesNotMatch(executableSource, /trustState:\s*"VERIFIED"/);
});

test("B7490-07Q4 is fail closed", () => {
  assert.match(executableSource, /"CORROBORATED_OPERATIONAL_AUTHORITY_DENIED"/);

  assert.match(
    executableSource,
    /false,[\s\S]*"CORROBORATED_OPERATIONAL_AUTHORITY_DENIED"/,
  );
});

test("B7490-07Q4 performs no persistence or direct database mutation", () => {
  assert.doesNotMatch(executableSource, /\bapplyHsppAssessmentDecision\s*\(/);

  assert.doesNotMatch(executableSource, /\bpersistHspp[A-Za-z0-9_]*\s*\(/);

  assert.doesNotMatch(
    executableSource,
    /\.(from|select|insert|update|upsert|delete|rpc)\s*\(/,
  );

  assert.doesNotMatch(executableSource, /\bSupabaseClient\b/);
});

test("B7490-07Q4 is a pure policy and does not create orchestration or downstream authority", () => {
  assert.doesNotMatch(
    executableSource,
    /\brunHsppSealedEvidenceAssemblyCorroboratedOperationalAuthority\s*\(/,
  );

  assert.doesNotMatch(executableSource, /\bawait\b/);

  assert.doesNotMatch(executableSource, /\bfetch\s*\(/);

  assert.doesNotMatch(executableSource, /\bDate\.now\s*\(/);

  assert.doesNotMatch(executableSource, /\bnew\s+Date\s*\(/);

  assert.doesNotMatch(executableSource, /\.toISOString\s*\(/);
});
