import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/runHsppScheduledPairReconstructionExecutionIntentClaimV2.ts",
    "utf8",
  );


test(
  "Q14ag35A scheduled producer reuses the canonical neutral semantic pipeline",
  () => {
    assert.match(
      source,
      /createHsppReservoirDownstreamSnapshotFromScheduledPairs/,
    );

    assert.match(
      source,
      /resolveHsppReconstructionSelectionMaterialFromSnapshot/,
    );

    assert.match(
      source,
      /claimHsppReconstructionExecutionIntentV2/,
    );
  },
);


test(
  "Q14ag35A scheduled producer uses only scheduled-pair provenance",
  () => {
    assert.match(
      source,
      /selectionSource:\s*"SCHEDULED_PAIR"/,
    );

    assert.match(
      source,
      /discoveryPolicyVersion:\s*null/,
    );

    assert.match(
      source,
      /pairSchedulingVersion:[\s\S]*scheduledReevaluationResult[\s\S]*\.pairPage[\s\S]*\.schedulingVersion/,
    );
  },
);


test(
  "Q14ag35A scheduled producer has no scheduler cursor or runtime activation authority",
  () => {
    for (
      const forbidden of [
        "runHsppReservoirScheduledPairReevaluation(",
        "readHsppReservoirPairPage(",
        "compareAndSwapHsppReservoirPairScanState(",
        "compare_and_swap_hspp_reservoir_pair_scan_state",
        "randomUUID",
        "crypto.randomUUID",
      ]
    ) {
      assert.equal(
        source.includes(
          forbidden,
        ),
        false,
        `Unexpected authority token: ${forbidden}`,
      );
    }


    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*app\/api\/[^"']*["']/,
    );


    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*cron[^"']*["']/i,
    );


    assert.doesNotMatch(
      source,
      /from\s+["'][^"']*queue[^"']*["']/i,
    );
  },
);


test(
  "Q14ag35A scheduled producer keeps child identity and reconstruction policy caller-owned",
  () => {
    assert.match(
      source,
      /proposedChildAssemblyId:\s*string/,
    );

    assert.match(
      source,
      /reconstructionPolicyVersion:\s*string/,
    );

    assert.match(
      source,
      /reconstructionReason:\s*string/,
    );

    assert.match(
      source,
      /proposedChildAssemblyId,/,
    );

    assert.match(
      source,
      /reconstructionPolicyVersion,/,
    );

    assert.match(
      source,
      /reconstructionReason,/,
    );
  },
);