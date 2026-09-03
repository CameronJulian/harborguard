import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/runHsppReconstructionExecutionIntentClaimV2.ts",
    "utf8",
  );


test(
  "Q14ag34N producer reuses canonical B07B claim material",
  () => {
    assert.match(
      source,
      /resolveHsppReconstructionClaimMaterial/,
    );

    assert.match(
      source,
      /claimMaterial\.selectedFirstEvidenceId/,
    );

    assert.match(
      source,
      /claimMaterial\.selectedSecondEvidenceId/,
    );

    assert.match(
      source,
      /claimMaterial\.reservoirEligibilityPolicyVersion/,
    );
  },
);


test(
  "Q14ag34N initial producer is B07B only",
  () => {
    assert.match(
      source,
      /selectionSource:\s*"B07B_DISCOVERY"/,
    );

    assert.match(
      source,
      /discoveryPolicyVersion:\s*claimMaterial\.discoveryPolicyVersion/,
    );

    assert.match(
      source,
      /pairSchedulingVersion:\s*null/,
    );
  },
);


test(
  "Q14ag34N producer invokes successor wrapper at most one syntactic call site",
  () => {
    const matches =
      source.match(
        /claimHsppReconstructionExecutionIntentV2\s*\(/g,
      ) ?? [];

    assert.equal(
      matches.length,
      1,
    );
  },
);


test(
  "Q14ag34N producer owns no PAIR activation or scheduler authority",
  () => {
    assert.doesNotMatch(
      source,
      /read_hspp_reservoir_pair_page/,
    );

    assert.doesNotMatch(
      source,
      /compare_and_swap_hspp_reservoir_pair_scan_state/,
    );

    assert.doesNotMatch(
      source,
      /runHsppReservoirScheduledPairReevaluation/,
    );

    assert.doesNotMatch(
      source,
      /randomUUID/,
    );
  },
);
