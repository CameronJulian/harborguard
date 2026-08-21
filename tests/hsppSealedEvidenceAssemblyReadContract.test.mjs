import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/readHsppSealedEvidenceAssembly.ts",
  "utf8",
);

test("B07D is an explicitly versioned SEALED assembly read boundary", () => {
  assert.match(source, /HSPP_SEALED_ASSEMBLY_READER_VERSION/);

  assert.match(source, /hspp-sealed-assembly-reader-v1/);

  assert.match(source, /readHsppSealedEvidenceAssembly/);
});

test("B07D is organization and assembly scoped", () => {
  assert.match(source, /\.from\("hspp_evidence_assemblies"\)/);

  assert.match(source, /\.eq\(\s*"organization_id"/s);

  assert.match(source, /\.eq\(\s*"id"/s);

  assert.match(source, /assemblyState !== "SEALED"/);
});

test("B07D loads immutable membership deterministically", () => {
  assert.match(source, /hspp_evidence_assembly_members/);

  assert.match(source, /evidence_integrity_fingerprint/);

  assert.match(source, /member_ordinal/);

  assert.match(source, /\.order\(\s*"member_ordinal"[\s\S]*ascending:\s*true/s);
});

test("B07D reuses the existing batch integrity reader exactly once", () => {
  assert.match(source, /readAndVerifyHsppEvidenceBatch/);

  const calls =
    source.match(/await\s+readAndVerifyHsppEvidenceBatch\s*\(/g) ?? [];

  assert.equal(calls.length, 1);

  assert.doesNotMatch(source, /\bverifyHsppEvidenceIntegrity\s*\(/);
});

test("B07D requires successful cryptographic verification and exact membership fingerprint binding", () => {
  assert.match(source, /result\.verification\.status !==\s*"MATCH"/s);

  assert.match(
    source,
    /result\.evidence\.integrityFingerprint !==\s*member\.integrityFingerprint/s,
  );

  assert.match(source, /membership-bound integrity fingerprint/);
});

test("B07D reconstructs canonical claims through existing B11B2 policy", () => {
  assert.match(source, /buildHsppCanonicalClaims/);

  assert.match(source, /normalizedPayload\.eventType/);

  assert.match(source, /typeof eventType !== "string"/);

  assert.match(source, /canonicalClaims:\s*buildHsppCanonicalClaims/s);
});

test("B07D returns B11C-compatible input but does not invoke B11C", () => {
  assert.match(source, /HsppAssemblyScanInput/);

  assert.match(source, /assemblyState:\s*"SEALED"/s);

  assert.match(source, /members,/);

  assert.doesNotMatch(source, /\bscanHsppEvidenceAssembly\s*\(/);
});

test("B07D remains SELECT-only", () => {
  const forbidden = [
    /\.insert\s*\(/,
    /\.update\s*\(/,
    /\.upsert\s*\(/,
    /\.delete\s*\(/,
    /\.rpc\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});

test("B07D does not absorb later HSPP protocol authority", () => {
  assert.doesNotMatch(source, /\bevaluateHsppAssemblyDecision\s*\(/);

  assert.doesNotMatch(source, /\bpersistHsppAssemblyDecision\s*\(/);

  assert.doesNotMatch(source, /\bapplyHsppAssessmentDecision\s*\(/);

  assert.match(source, /does NOT/i);

  assert.match(source, /Route Safety authority/);

  assert.match(source, /Crowd Intelligence eligibility/);

  assert.match(source, /ML training or validation eligibility/);
});

test("B07D introduces no API cron retry or scheduling implementation", () => {
  const forbidden = [
    /\bNextRequest\b/,
    /\bNextResponse\b/,
    /\bCRON_SECRET\b/,
    /\bsetInterval\s*\(/,
    /\bsetTimeout\s*\(/,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(source, pattern);
  }
});
