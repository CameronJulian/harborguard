import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const sourcePath =
  "lib/hspp/runHsppPostPositiveRevalidationSelection.ts";

const source =
  fs.readFileSync(
    sourcePath,
    "utf8",
  );

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


test("selection runner has one explicit version identity", () => {
  assert.match(
    source,
    /HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_VERSION\s*=\s*"hspp-post-positive-revalidation-selection-runner-v1"/,
  );
});


test("selection runner composes the bounded reader and pure evaluator only", () => {
  assert.match(
    executableSource,
    /dependencies\.readCandidates\(\{/,
  );

  assert.match(
    executableSource,
    /dependencies\.evaluateCandidate\(\{/,
  );

  assert.match(
    executableSource,
    /candidate\.readResult/,
  );
});


test("selection is deterministic first-qualifying in reader order", () => {
  assert.match(
    executableSource,
    /for\s*\(\s*const candidate\s+of discovery\.candidates\s*\)/,
  );

  assert.match(
    executableSource,
    /if\s*\(\s*!evaluation\.qualifiesUnsuitability\s*\)\s*\{\s*continue;/,
  );

  assert.match(
    executableSource,
    /status:\s*"QUALIFYING_REVALIDATION_FOUND"/,
  );
});


test("qualifying proposal carries exact R1 durable identity", () => {
  for (const literal of [
    "revalidationEvidenceId",
    "revalidationIntegrityFingerprint",
    "observedAt",
    "hspp-post-positive-member-unsuitability-v2",
    "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION",
  ]) {
    assert.ok(
      source.includes(
        literal,
      ),
      `Missing selected R1 basis field: ${literal}`,
    );
  }
});


test("non-qualifying and empty pages never invent a selected basis", () => {
  assert.match(
    source,
    /status:\s*"NO_CANDIDATES"[\s\S]*selectedBasis:\s*null/,
  );

  assert.match(
    source,
    /status:\s*"NO_QUALIFYING_REVALIDATION"[\s\S]*selectedBasis:\s*null/,
  );
});


test("selection runner owns no persistence or lease authority", () => {
  assert.doesNotMatch(
    executableSource,
    /\.from\(|\.rpc\(|\.insert\(|\.update\(|\.upsert\(|\.delete\(/,
  );

  assert.doesNotMatch(
    executableSource,
    /persistHsppMemberUnsuitabilityCheckpoint|persist_hspp_member_unsuitability/,
  );

  assert.doesNotMatch(
    executableSource,
    /acquireHsppAssemblyAssessmentExecutionLease|releaseHsppAssemblyAssessmentExecutionLease/,
  );

  assert.doesNotMatch(
    executableSource,
    /persistHsppAssemblyMemberEffectiveCessation/,
  );

  assert.doesNotMatch(
    executableSource,
    /runHsppReservoirReevaluation|runHsppReconstructionActivationCycle/,
  );
});


test("selection runner owns no caller identity or clock generation", () => {
  assert.doesNotMatch(
    executableSource,
    /Date\.now\(|new Date\(|randomUUID/,
  );
});
