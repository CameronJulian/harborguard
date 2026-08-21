import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  "lib/hspp/runHsppSealedEvidenceAssemblyScan.ts",
  "utf8",
);

test("B07E is explicitly versioned", () => {
  assert.match(source, /HSPP_SEALED_ASSEMBLY_SCAN_RUNNER_VERSION/);

  assert.match(source, /hspp-sealed-assembly-scan-runner-v1/);
});

test("B07E composes B07D then B11C exactly once", () => {
  const reads =
    source.match(/await\s+readHsppSealedEvidenceAssembly\s*\(/g) ?? [];

  const scans = source.match(/\bscanHsppEvidenceAssembly\s*\(/g) ?? [];

  assert.equal(reads.length, 1);

  assert.equal(scans.length, 1);

  assert.match(
    source,
    /scanHsppEvidenceAssembly\(\s*read\.scanInput\s*,?\s*\)/s,
  );
});

test("B07E preserves reader and scanner provenance", () => {
  assert.match(source, /HSPP_SEALED_ASSEMBLY_READER_VERSION/);

  assert.match(source, /HSPP_ASSEMBLY_SCAN_VERSION/);

  assert.match(source, /readerVersion:\s*read\.readerVersion/s);

  assert.match(source, /scanVersion:\s*scan\.scanVersion/s);
});

test("B07E does not absorb B11D or B11E", () => {
  assert.doesNotMatch(source, /\bevaluateHsppAssemblyDecision\s*\(/);

  assert.doesNotMatch(source, /\bpersistHsppAssemblyDecision\s*\(/);

  assert.doesNotMatch(source, /\bevaluateHsppAssemblyAuthority\s*\(/);

  assert.doesNotMatch(source, /\bapplyHsppAssessmentDecision\s*\(/);
});

test("B07E contains no direct database mutation", () => {
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

test("B07E grants no downstream authority", () => {
  assert.match(source, /does NOT/i);

  assert.match(source, /Route Safety authority/);

  assert.match(source, /Crowd Intelligence eligibility/);

  assert.match(source, /ML training or validation eligibility/);
});

test("B07E introduces no API cron retry or scheduling behavior", () => {
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
