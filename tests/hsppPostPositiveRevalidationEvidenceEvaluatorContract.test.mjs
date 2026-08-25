import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sourcePath =
  "lib/hspp/evaluateHsppPostPositiveRevalidationEvidence.ts";

const source =
  fs.readFileSync(
    sourcePath,
    "utf8",
  );


test("R1 evaluator introduces exact policy-v2 identity", () => {
  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_POLICY_VERSION\s*=\s*["']hspp-post-positive-member-unsuitability-v2["']/,
  );

  assert.doesNotMatch(
    source,
    /hspp-post-positive-member-unsuitability-v1/,
  );
});


test("R1 evaluator defines one exact immutable revalidation evidence domain", () => {
  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_SOURCE_CLASS\s*=\s*["']derived["']/,
  );

  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_SOURCE_PROVIDER\s*=\s*["']harborguard["']/,
  );

  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_SOURCE_STREAM\s*=\s*["']post-positive-revalidation["']/,
  );

  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_PAYLOAD_SCHEMA_VERSION\s*=\s*["']hspp-post-positive-revalidation-v1["']/,
  );

  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_TYPE\s*=\s*["']post_positive_revalidation["']/,
  );

  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_VERSION\s*=\s*["']hspp-post-positive-revalidation-v1["']/,
  );
});


test("R1 requires independent MATCH integrity", () => {
  assert.match(
    source,
    /revalidationEvidence\.verification\.status\s*!==\s*["']MATCH["']/,
  );

  assert.match(
    source,
    /expectedFingerprint\s*!==\s*revalidationIntegrityFingerprint/,
  );

  assert.match(
    source,
    /actualFingerprint\s*!==\s*revalidationIntegrityFingerprint/,
  );
});


test("R1 lineage must bind exact historical C identity", () => {
  assert.match(
    source,
    /lineage\.parentEvidenceId/,
  );

  assert.match(
    source,
    /lineage\.parentIntegrityFingerprint/,
  );

  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_TYPE/,
  );

  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_VERSION/,
  );
});


test("R1 chronology is compared against the exact positive assessment", () => {
  assert.match(
    source,
    /workItem\.positiveAssessedAt/,
  );

  assert.match(
    source,
    /revalidationObservedAt\.epochMs\s*<\s*positiveAssessedAt\.epochMs/,
  );
});


test("R1 payload binds H1 Q14p C policy reason and irreversible decision", () => {
  for (const literal of [
    "subjectAssemblyId",
    "subjectPositiveCheckpointId",
    "subjectEvidenceId",
    "subjectIntegrityFingerprint",
    "decision",
    "unsuitabilityPolicyVersion",
    "unsuitabilityReason",
    "UNSUITABLE_FOR_DESCENDANT_COMPOSITION",
    "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION",
  ]) {
    assert.ok(
      source.includes(
        literal,
      ),
      `Missing canonical R1 semantic literal: ${literal}`,
    );
  }
});


test("R1 evaluator distinguishes qualifying from non-qualifying evidence", () => {
  assert.match(
    source,
    /QUALIFYING_UNSUITABILITY_BASIS/,
  );

  assert.match(
    source,
    /NON_QUALIFYING_REVALIDATION/,
  );

  assert.match(
    source,
    /R1_UNSUITABILITY_BASIS_CONFIRMED/,
  );
});


test("R1 evaluator remains pure and has no lifecycle mutation authority", () => {
  assert.doesNotMatch(
    source,
    /SupabaseClient|\.from\(|\.rpc\(/,
  );

  assert.doesNotMatch(
    source,
    /acquireHsppAssemblyAssessmentExecutionLease|releaseHsppAssemblyAssessmentExecutionLease/,
  );

  assert.doesNotMatch(
    source,
    /persistHsppMemberUnsuitabilityCheckpoint|persistHsppAssemblyMemberEffectiveCessation/,
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
