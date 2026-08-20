import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const persistence = fs.readFileSync(
  "lib/hspp/persistHsppEvidence.ts",
  "utf8"
);

const reader = fs.readFileSync(
  "lib/hspp/readAndVerifyHsppEvidence.ts",
  "utf8"
);

test("HSPP persistence writes all four derivation lineage columns", () => {
  assert.match(
    persistence,
    /parent_evidence_id/
  );

  assert.match(
    persistence,
    /parent_integrity_fingerprint/
  );

  assert.match(
    persistence,
    /derivation_type/
  );

  assert.match(
    persistence,
    /derivation_version/
  );
});

test("root HSPP evidence persists null lineage", () => {
  assert.match(
    persistence,
    /lineage\?\.parentEvidenceId[\s\S]*\?\?\s*null/
  );

  assert.match(
    persistence,
    /lineage\?\.parentIntegrityFingerprint[\s\S]*\?\?\s*null/
  );

  assert.match(
    persistence,
    /lineage\?\.derivationType[\s\S]*\?\?\s*null/
  );

  assert.match(
    persistence,
    /lineage\?\.derivationVersion[\s\S]*\?\?\s*null/
  );
});

test("persisted HSPP read selects all four lineage columns", () => {
  assert.match(reader, /"parent_evidence_id"/);
  assert.match(reader, /"parent_integrity_fingerprint"/);
  assert.match(reader, /"derivation_type"/);
  assert.match(reader, /"derivation_version"/);
});

test("persisted HSPP read reconstructs derivation lineage", () => {
  assert.match(
    reader,
    /function mapDerivationLineage/
  );

  assert.match(
    reader,
    /parentEvidenceId:/
  );

  assert.match(
    reader,
    /parentIntegrityFingerprint:/
  );

  assert.match(
    reader,
    /derivationType:/
  );

  assert.match(
    reader,
    /derivationVersion:/
  );
});

test("partial persisted lineage fails closed", () => {
  assert.match(
    reader,
    /derivation lineage must be either entirely null or complete/
  );
});

test("reconstructed lineage is passed into integrity verification", () => {
  assert.match(
    reader,
    /derivationLineage:\s*evidence\.derivationLineage/
  );
});

test("HSPP-005B does not alter downstream eligibility", () => {
  assert.doesNotMatch(
    reader,
    /crowdEligible\s*:/
  );

  assert.doesNotMatch(
    reader,
    /trainingEligible\s*:/
  );

  assert.doesNotMatch(
    persistence,
    /crowd_eligible:\s*true/
  );

  assert.doesNotMatch(
    persistence,
    /training_eligible:\s*true/
  );
});
