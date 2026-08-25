import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const root =
  process.cwd();

const sourcePath =
  "lib/hspp/runHsppPostPositiveRevalidationSelectionV2.ts";

const runtimeTestPath =
  "tests/hsppPostPositiveRevalidationSelectionRunnerV2.test.ts";

const contractPath =
  "tests/hsppPostPositiveRevalidationSelectionRunnerV2Contract.test.mjs";


function readText(
  relativePath,
) {
  return fs.readFileSync(
    path.join(
      root,
      relativePath,
    ),
    "utf8",
  );
}


function readBytes(
  relativePath,
) {
  return fs.readFileSync(
    path.join(
      root,
      relativePath,
    ),
  );
}


const source =
  readText(
    sourcePath,
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


test(
  "Selection V2 files are UTF-8 without BOM",
  () => {
    for (
      const relativePath
      of [
        sourcePath,
        runtimeTestPath,
        contractPath,
      ]
    ) {
      const bytes =
        readBytes(
          relativePath,
        );

      assert.equal(
        (
          bytes.length >= 3 &&
          bytes[0] === 0xef &&
          bytes[1] === 0xbb &&
          bytes[2] === 0xbf
        ),
        false,
        relativePath + " unexpectedly contains UTF-8 BOM",
      );
    }
  },
);


test(
  "Selection V2 owns one distinct version identity",
  () => {
    assert.match(
      source,
      /HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_V2_VERSION\s*=\s*"hspp-post-positive-revalidation-selection-runner-v2"/,
    );
  },
);


test(
  "Selection V2 composes only verified circular Reader V2 and pure evaluator",
  () => {
    assert.match(
      executableSource,
      /dependencies\.readCandidates\(\{/,
    );

    assert.match(
      executableSource,
      /dependencies\.evaluateCandidate\(\{/,
    );

    assert.match(
      source,
      /readHsppPostPositiveRevalidationCandidatesV2/,
    );

    assert.match(
      source,
      /evaluateHsppPostPositiveRevalidationEvidence/,
    );
  },
);


test(
  "Selection V2 preserves deterministic first-qualifying semantics",
  () => {
    assert.match(
      executableSource,
      /for\s*\(\s*const candidate\s+of discovery\.candidates\s*\)/,
    );

    assert.match(
      executableSource,
      /if\s*\(\s*!evaluation\.qualifiesUnsuitability\s*\)\s*\{\s*continue;/,
    );

    assert.match(
      source,
      /QUALIFYING_REVALIDATION_FOUND/,
    );

    assert.doesNotMatch(
      executableSource,
      /\.sort\s*\(/,
    );
  },
);


test(
  "Selection V2 propagates whole-page expected and proposed cursors on its result",
  () => {
    assert.match(
      source,
      /expectedCursor:[\s\S]*HsppPostPositiveRevalidationCandidatePageCursor \| null/,
    );

    assert.match(
      source,
      /proposedCursor:[\s\S]*HsppPostPositiveRevalidationCandidatePageCursor \| null/,
    );

    assert.match(
      source,
      /R1 Selection V2 page proposal must equal the final structural candidate/,
    );

    assert.match(
      source,
      /status:\s*"QUALIFYING_REVALIDATION_FOUND"[\s\S]*selectedBasis,[\s\S]*expectedCursor,[\s\S]*proposedCursor/,
    );

    assert.match(
      source,
      /status:\s*"NO_QUALIFYING_REVALIDATION"[\s\S]*selectedBasis:\s*null,[\s\S]*expectedCursor,[\s\S]*proposedCursor/,
    );
  },
);


test(
  "empty Selection V2 result cannot invent cursor advancement or semantic authority",
  () => {
    assert.match(
      source,
      /status:\s*"NO_CANDIDATES"[\s\S]*selectedBasis:\s*null,[\s\S]*expectedCursor,[\s\S]*proposedCursor:\s*null/,
    );
  },
);


test(
  "Selection V2 owns no DB CAS persistence lease clock or lifecycle authority",
  () => {
    assert.doesNotMatch(
      executableSource,
      /\.from\s*\(|\.rpc\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /compareAndSwapHsppPostPositiveRevalidationCandidateScanState|compare_and_swap_hspp_post_positive_revalidation_candidate_scan_state/,
    );

    assert.doesNotMatch(
      executableSource,
      /persistHsppMemberUnsuitabilityCheckpoint|persist_hspp_member_unsuitability|persistHsppAssemblyMemberEffectiveCessation/,
    );

    assert.doesNotMatch(
      executableSource,
      /acquireHsppAssemblyAssessmentExecutionLease|releaseHsppAssemblyAssessmentExecutionLease/,
    );

    assert.doesNotMatch(
      executableSource,
      /runHsppReservoirReevaluation|runHsppReconstructionActivationCycle|runHsppPostPositiveLifecycleCycle/,
    );

    assert.doesNotMatch(
      executableSource,
      /Date\.now\(|new Date\s*\(|randomUUID/,
    );
  },
);
