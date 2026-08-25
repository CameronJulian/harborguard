import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const root =
  process.cwd();

const sourcePath =
  "lib/hspp/runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2.ts";

const runtimePath =
  "tests/hsppPostPositiveRevalidationUnsuitabilityAssessmentRunnerV2.test.ts";

const contractPath =
  "tests/hsppPostPositiveRevalidationUnsuitabilityAssessmentRunnerV2Contract.test.mjs";


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


function occurrenceCount(
  text,
  token,
) {
  return (
    text.split(token).length -
    1
  );
}


test(
  "Authority V2 files are UTF-8 without BOM",
  () => {
    for (
      const relativePath
      of [
        sourcePath,
        runtimePath,
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
        relativePath +
          " unexpectedly contains UTF-8 BOM",
      );
    }
  },
);


test(
  "Authority V2 has distinct identity and consumes Selection V2 without inventing a version-constant dependency",
  () => {
    assert.match(
      source,
      /hspp-post-positive-revalidation-unsuitability-assessment-runner-v2/,
    );

    assert.match(
      source,
      /runHsppPostPositiveRevalidationUnsuitabilityAssessmentV2/,
    );

    assert.match(
      source,
      /runHsppPostPositiveRevalidationSelectionV2/,
    );

    assert.match(
      source,
      /RunHsppPostPositiveRevalidationSelectionV2Input/,
    );

    assert.match(
      source,
      /RunHsppPostPositiveRevalidationSelectionV2Result/,
    );

    assert.match(
      source,
      /from\s+"@\/lib\/hspp\/runHsppPostPositiveRevalidationSelectionV2";/,
    );

    assert.doesNotMatch(
      source,
      /from\s+"@\/lib\/hspp\/runHsppPostPositiveRevalidationSelection";/,
    );

    assert.doesNotMatch(
      source,
      /HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_VERSION/,
    );

    assert.doesNotMatch(
      source,
      /HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_V2_VERSION/,
    );
  },
);


test(
  "Authority V2 exposes candidate cursor scheduling only as non-authoritative summary",
  () => {
    assert.match(
      source,
      /CURSOR_ADVANCE_RESULT/,
    );

    assert.match(
      source,
      /CURSOR_ADVANCE_ERROR/,
    );

    assert.match(
      source,
      /cursorAdvance:\s*HsppPostPositiveRevalidationCandidateCursorAdvanceSummaryV2 \| null/,
    );

    assert.match(
      source,
      /CompareAndSwapHsppPostPositiveRevalidationCandidateScanStateResult/,
    );

    assert.match(
      source,
      /expectedCursor:\s*HsppPostPositiveRevalidationCandidatePageCursor \| null/,
    );

    assert.match(
      source,
      /proposedCursor:\s*HsppPostPositiveRevalidationCandidatePageCursor/,
    );
  },
);


test(
  "only NO_QUALIFYING owns the one candidate CAS call",
  () => {
    assert.equal(
      occurrenceCount(
        executableSource,
        "await dependencies.advanceCandidateCursor({",
      ),
      1,
    );

    const firstStatus =
      executableSource.indexOf(
        "selection.status ===",
      );

    const noCandidates =
      executableSource.indexOf(
        '"NO_CANDIDATES"',
        firstStatus,
      );

    const noQualifying =
      executableSource.indexOf(
        '"NO_QUALIFYING_REVALIDATION"',
        noCandidates + 1,
      );

    const qualifying =
      executableSource.indexOf(
        '"QUALIFYING_REVALIDATION_FOUND"',
        noQualifying + 1,
      );

    const finallyIndex =
      executableSource.indexOf(
        "finally {",
        qualifying,
      );

    assert.ok(
      firstStatus >= 0 &&
      noCandidates >= 0 &&
      noQualifying > noCandidates &&
      qualifying > noQualifying &&
      finallyIndex > qualifying,
    );

    const noCandidateSection =
      executableSource.slice(
        noCandidates,
        noQualifying,
      );

    const noQualifyingSection =
      executableSource.slice(
        noQualifying,
        qualifying,
      );

    const qualifyingSection =
      executableSource.slice(
        qualifying,
        finallyIndex,
      );

    assert.doesNotMatch(
      noCandidateSection,
      /advanceCandidateCursor/,
    );

    assert.match(
      noQualifyingSection,
      /await dependencies\.advanceCandidateCursor\(\{/,
    );

    assert.doesNotMatch(
      qualifyingSection,
      /advanceCandidateCursor/,
    );

    assert.match(
      qualifyingSection,
      /await dependencies\.persistUnsuitability\(\{/,
    );
  },
);


test(
  "qualifying Q14x-v2 persistence remains lease-fenced and has no post-persistence CAS",
  () => {
    assert.match(
      executableSource,
      /await dependencies\.acquireLease\(\{/,
    );

    assert.match(
      executableSource,
      /await dependencies\.selectRevalidation\(\{/,
    );

    assert.match(
      executableSource,
      /await dependencies\.persistUnsuitability\(\{/,
    );

    assert.match(
      executableSource,
      /finally\s*\{/,
    );

    assert.match(
      executableSource,
      /await dependencies\.releaseLease\(\{/,
    );

    assert.equal(
      occurrenceCount(
        executableSource,
        "await dependencies.persistUnsuitability({",
      ),
      1,
    );
  },
);


test(
  "candidate CAS failure is isolated and no same-call retry exists",
  () => {
    assert.match(
      source,
      /branch:\s*"CURSOR_ADVANCE_ERROR"/,
    );

    assert.match(
      source,
      /errorMessage\(\s*error,\s*\)/,
    );

    assert.equal(
      occurrenceCount(
        executableSource,
        "await dependencies.advanceCandidateCursor({",
      ),
      1,
    );

    assert.doesNotMatch(
      executableSource,
      /while\s*\(|do\s*\{|setTimeout|Promise\.all/,
    );
  },
);


test(
  "Authority V2 owns no direct DB lifecycle cessation Reservoir reconstruction clock or UUID authority",
  () => {
    assert.doesNotMatch(
      executableSource,
      /\.from\s*\(|\.rpc\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,
    );

    assert.doesNotMatch(
      executableSource,
      /persistHsppAssemblyMemberEffectiveCessation|runHsppReservoirReevaluation|runHsppReconstructionActivationCycle|runHsppPostPositiveLifecycleCycle/,
    );

    assert.doesNotMatch(
      executableSource,
      /Date\.now\s*\(|randomUUID|crypto\.randomUUID/,
    );
  },
);
