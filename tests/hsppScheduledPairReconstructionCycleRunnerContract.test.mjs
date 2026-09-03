import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/runHsppScheduledPairReconstructionCycle.ts",
    "utf8",
  );


test(
  "Q14ag35H dedicated orchestrator owns the exact PAIR lifecycle order",
  () => {
    const scheduled =
      source.indexOf(
        "await dependencies.runScheduledPairReevaluation({",
      );

    const producer =
      source.indexOf(
        "await dependencies.runScheduledPairProducer({",
      );

    const cas =
      source.indexOf(
        "await dependencies.compareAndSwapPairCursor({",
      );


    assert.notEqual(
      scheduled,
      -1,
    );

    assert.notEqual(
      producer,
      -1,
    );

    assert.notEqual(
      cas,
      -1,
    );

    assert.ok(
      scheduled < producer,
    );

    assert.ok(
      producer < cas,
    );
  },
);


test(
  "Q14ag35H null proposed cursor skips PAIR CAS after producer completion",
  () => {
    const producer =
      source.indexOf(
        "await dependencies.runScheduledPairProducer({",
      );

    const nullBranch =
      source.indexOf(
        "if (proposedCursor === null)",
      );

    const cas =
      source.indexOf(
        "await dependencies.compareAndSwapPairCursor({",
      );


    assert.ok(
      producer < nullBranch,
    );

    assert.ok(
      nullBranch < cas,
    );

    assert.match(
      source,
      /state:\s*"SKIPPED_NO_PROPOSED_CURSOR"/,
    );
  },
);


test(
  "Q14ag35H producer outcome does not gate scheduling progress",
  () => {
    assert.doesNotMatch(
      source,
      /producer\.state\s*===\s*"RECONSTRUCTION_INTENT_V2_CLAIMED"[\s\S]*compareAndSwapHsppReservoirPairScanState/,
    );

    assert.doesNotMatch(
      source,
      /producer\.state\s*!==\s*"NO_RECONSTRUCTION_CLAIM"/,
    );
  },
);


test(
  "Q14ag35H PAIR CAS uses only scheduler-owned cursor material",
  () => {
    assert.match(
      source,
      /expectedCursor:\s*scheduled[\s\S]*\.pairPage[\s\S]*\.expectedCursor/,
    );

    assert.match(
      source,
      /const proposedCursor\s*=[\s\S]*scheduled[\s\S]*\.pairPage[\s\S]*\.proposedCursor/,
    );

    assert.match(
      source,
      /proposedCursor,/,
    );
  },
);


test(
  "Q14ag35H orchestrator does not own machine activation authority",
  () => {
    for (
      const forbidden of [
        "randomUUID",
        "crypto.randomUUID",
        "resolveHsppReconstructionActivationPolicy(",
        "runHsppReconstructionExecutionIntentCycleV2(",
        "runHsppReconstructionActivationCycle(",
        "app/api/",
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
  },
);