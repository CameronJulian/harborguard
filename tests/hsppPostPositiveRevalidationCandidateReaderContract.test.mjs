import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sourcePath =
  "lib/hspp/readHsppPostPositiveRevalidationCandidates.ts";

const source =
  fs.readFileSync(
    sourcePath,
    "utf8",
  );


test("R1 candidate reader is explicitly bounded", () => {
  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_MAX_LIMIT\s*=\s*25/,
  );

  assert.match(
    source,
    /\.limit\(\s*requestedLimit\s*,?\s*\)/,
  );

  assert.match(
    source,
    /Number\.isInteger/,
  );
});


test("R1 reader queries only the exact immutable structural domain", () => {
  for (const column of [
    "organization_id",
    "source_class",
    "source_provider",
    "source_stream",
    "payload_schema_version",
    "parent_evidence_id",
    "parent_integrity_fingerprint",
    "derivation_type",
    "derivation_version",
  ]) {
    assert.ok(
      source.includes(
        `"${column}"`,
      ),
      `Missing exact R1 query column: ${column}`,
    );
  }

  for (const constant of [
    "HSPP_POST_POSITIVE_REVALIDATION_SOURCE_CLASS",
    "HSPP_POST_POSITIVE_REVALIDATION_SOURCE_PROVIDER",
    "HSPP_POST_POSITIVE_REVALIDATION_SOURCE_STREAM",
    "HSPP_POST_POSITIVE_REVALIDATION_PAYLOAD_SCHEMA_VERSION",
    "HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_TYPE",
    "HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_VERSION",
  ]) {
    assert.ok(
      source.includes(
        constant,
      ),
      `Missing canonical R1 query constant: ${constant}`,
    );
  }
});


test("R1 reader applies exact post-positive chronology at the database boundary", () => {
  assert.match(
    source,
    /\.gte\(\s*"observed_at",\s*positiveAssessedAt\.value\s*,?\s*\)/,
  );

  assert.match(
    source,
    /candidateObservedAt\.epochMs\s*<\s*positiveAssessedAt\.epochMs/,
  );
});


test("R1 reader has deterministic observed-at then id ordering", () => {
  const observedOrder =
    source.indexOf(
      '.order(\n        "observed_at"',
    );

  const idOrder =
    source.indexOf(
      '.order(\n        "id"',
    );

  assert.ok(
    observedOrder >= 0,
  );

  assert.ok(
    idOrder > observedOrder,
  );

  assert.match(
    source,
    /"observed_at"[\s\S]{0,100}ascending:\s*true/,
  );

  assert.match(
    source,
    /"id"[\s\S]{0,100}ascending:\s*true/,
  );
});


test("R1 reader reuses canonical batch integrity verification", () => {
  assert.match(
    source,
    /readAndVerifyHsppEvidenceBatch/,
  );

  assert.match(
    source,
    /dependencies\.readEvidenceBatch\(\{[\s\S]*organizationId,[\s\S]*evidenceIds,[\s\S]*\}\)/,
  );
});


test("R1 reader does not itself interpret semantic unsuitability", () => {
  const executableSource =
    source
      .replace(
        /\/\*[\s\S]*?\*\//g,
        "",
      )
      .replace(
        /\/\/.*$/gm,
        "",
      );

  assert.doesNotMatch(
    executableSource,
    /\bevaluateHsppPostPositiveRevalidationEvidence\s*\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /QUALIFYING_UNSUITABILITY_BASIS|R1_UNSUITABILITY_BASIS_CONFIRMED/,
  );
});


test("R1 reader remains read-only and owns no lifecycle authority", () => {
  assert.doesNotMatch(
    source,
    /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/,
  );

  assert.doesNotMatch(
    source,
    /persistHsppMemberUnsuitabilityCheckpoint|persistHsppAssemblyMemberEffectiveCessation/,
  );

  assert.doesNotMatch(
    source,
    /acquireHsppAssemblyAssessmentExecutionLease|releaseHsppAssemblyAssessmentExecutionLease/,
  );

  assert.doesNotMatch(
    source,
    /runHsppReservoirReevaluation|runHsppReconstructionActivationCycle/,
  );

  assert.doesNotMatch(
    source,
    /Date\.now\(|randomUUID/,
  );
});


test("R1 reader refuses work that already has Q14v authority", () => {
  assert.match(
    source,
    /workItem\.workState\s*!==\s*"REEVALUATION_REQUIRED"/,
  );

  assert.match(
    source,
    /workItem\.unsuitabilityCheckpointId/,
  );

  assert.match(
    source,
    /workItem\.unsuitabilityObservedAt/,
  );

  assert.match(
    source,
    /workItem\.unsuitabilityDecidedAt/,
  );
});
