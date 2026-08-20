import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const persistedReader =
  fs.readFileSync(
    "lib/hspp/readAndVerifyHsppEvidence.ts",
    "utf8"
  );

const operationalReader =
  fs.readFileSync(
    "lib/hspp/readHsppEvidenceForOperationalUse.ts",
    "utf8"
  );

test("batch persisted HSPP read exists", () => {
  assert.match(
    persistedReader,
    /readAndVerifyHsppEvidenceBatch/
  );
});

test("batch persisted HSPP read is organization scoped", () => {
  assert.match(
    persistedReader,
    /\.eq\(\s*"organization_id",\s*normalizedOrganizationId\s*\)/
  );
});

test("batch persisted HSPP read uses bounded id-set queries", () => {
  assert.match(
    persistedReader,
    /HSPP_EVIDENCE_BATCH_SIZE\s*=\s*100/
  );

  assert.match(
    persistedReader,
    /normalizedEvidenceIds\.slice/
  );

  assert.match(
    persistedReader,
    /\.in\(\s*"id",\s*evidenceIdChunk\s*\)/
  );
});

test("batch persisted read reuses canonical mapping", () => {
  assert.match(
    persistedReader,
    /mapPersistedHsppEvidence\(\s*row,\s*normalizedOrganizationId,\s*evidenceId\s*\)/
  );
});

test("batch persisted read reuses integrity verification", () => {
  assert.match(
    persistedReader,
    /verifyPersistedHsppEvidence\(\s*evidence\s*\)/
  );
});

test("batch operational reader reuses centralized policy", () => {
  assert.match(
    operationalReader,
    /readHsppEvidenceBatchForOperationalUse/
  );

  assert.match(
    operationalReader,
    /decideHsppOperationalUse\(\s*readResult\s*\)/
  );
});

test("batch HSPP readers perform no database writes", () => {
  assert.doesNotMatch(
    persistedReader,
    /\.insert\(/
  );

  assert.doesNotMatch(
    persistedReader,
    /\.update\(/
  );

  assert.doesNotMatch(
    persistedReader,
    /\.upsert\(/
  );

  assert.doesNotMatch(
    persistedReader,
    /\.delete\(/
  );
});
