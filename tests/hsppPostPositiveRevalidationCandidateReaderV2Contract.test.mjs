import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const root =
  process.cwd();

const sourcePath =
  "lib/hspp/readHsppPostPositiveRevalidationCandidatesV2.ts";

const runtimeTestPath =
  "tests/hsppPostPositiveRevalidationCandidateReaderV2.test.ts";

const contractPath =
  "tests/hsppPostPositiveRevalidationCandidateReaderV2Contract.test.mjs";


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


test(
  "V2 reader files are UTF-8 without BOM",
  () => {
    for (
      const relativePath of
      [
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
  "V2 has distinct version and preserves bound of 25",
  () => {
    assert.match(
      source,
      /hspp-post-positive-revalidation-candidate-reader-v2/,
    );

    assert.match(
      source,
      /HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_V2_MAX_LIMIT\s*=\s*25/,
    );

    assert.match(
      source,
      /Number\.isInteger/,
    );
  },
);


test(
  "V2 composes circular page before canonical batch verification",
  () => {
    assert.match(
      source,
      /readHsppPostPositiveRevalidationCandidatePage/,
    );

    assert.match(
      source,
      /readAndVerifyHsppEvidenceBatch/,
    );

    const pageCall =
      source.indexOf(
        "await dependencies.readCandidatePage",
      );

    const batchCall =
      source.indexOf(
        "await dependencies.readEvidenceBatch",
      );

    assert.ok(
      pageCall >= 0,
    );

    assert.ok(
      batchCall > pageCall,
    );
  },
);


test(
  "V2 propagates expected and proposed scheduling cursors",
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
      /proposed cursor must equal the final selected candidate/i,
    );
  },
);


test(
  "V2 reuses canonical batch identity boundary",
  () => {
    assert.match(
      source,
      /dependencies\.readEvidenceBatch\(\{[\s\S]*?supabase,[\s\S]*?organizationId,[\s\S]*?evidenceIds,[\s\S]*?\}\)/,
    );

    assert.match(
      source,
      /Canonical HSPP evidence batch reader omitted selected R1 candidate/,
    );

    assert.match(
      source,
      /Canonical HSPP evidence reader returned a conflicting R1 candidate identity/,
    );
  },
);


test(
  "V2 preserves circular page order rather than sorting candidates itself",
  () => {
    assert.doesNotMatch(
      source,
      /\.sort\s*\(/,
    );

    assert.match(
      source,
      /page\.candidates\.map/,
    );
  },
);


test(
  "V2 owns no direct DB query mutation semantic decision or CAS",
  () => {
    assert.doesNotMatch(
      source,
      /\.from\s*\(|\.rpc\s*\(|\.insert\s*\(|\.update\s*\(|\.upsert\s*\(|\.delete\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /compareAndSwapHsppPostPositiveRevalidationCandidateScanState|compare_and_swap_hspp_revalidation_candidate_scan_state/,
    );

    assert.doesNotMatch(
      source,
      /evaluateHsppPostPositiveRevalidationEvidence|persistHsppMemberUnsuitabilityCheckpoint|persistHsppAssemblyMemberEffectiveCessation/,
    );
  },
);
