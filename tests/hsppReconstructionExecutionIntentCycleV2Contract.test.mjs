import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";


const cyclePath =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "runHsppReconstructionExecutionIntentCycleV2.ts",
  );

const legacyCyclePath =
  path.join(
    process.cwd(),
    "lib",
    "hspp",
    "runHsppReconstructionExecutionIntentCycle.ts",
  );


const source =
  fs.readFileSync(
    cyclePath,
    "utf8",
  ).replace(
    /\r\n/g,
    "\n",
  );

const legacySource =
  fs.readFileSync(
    legacyCyclePath,
    "utf8",
  ).replace(
    /\r\n/g,
    "\n",
  );


test(
  "Q14ag33E3E2 defines a separate V2 successor cycle",
  () => {
    assert.match(
      source,
      /export\s+async\s+function\s+runHsppReconstructionExecutionIntentCycleV2\s*\(/,
    );

    assert.match(
      source,
      /readHsppReconstructionExecutionIntentsV2/,
    );

    assert.match(
      source,
      /runHsppReconstructionExecutionIntentV2/,
    );
  },
);


test(
  "Q14ag33E3E2 reads only CLAIMED_NOT_PERSISTED successor work",
  () => {
    assert.match(
      source,
      /persistenceStateFilter:\s*"CLAIMED_NOT_PERSISTED"/,
    );

    assert.doesNotMatch(
      source,
      /persistenceStateFilter:\s*"RECONSTRUCTION_PERSISTED"/,
    );
  },
);


test(
  "Q14ag33E3E2 consumes exactly one reader page and does not follow the cursor",
  () => {
    const readCalls =
      source.match(
        /await\s+dependencies\.readIntents\s*\(\s*\{/g,
      ) ?? [];

    assert.equal(
      readCalls.length,
      1,
    );

    assert.match(
      source,
      /hasMore:\s*page\.nextCursor\s*!==\s*null/,
    );

    assert.doesNotMatch(
      source,
      /beforeCreatedAt:\s*page\.nextCursor/,
    );

    assert.doesNotMatch(
      source,
      /while\s*\(/,
    );
  },
);


test(
  "Q14ag33E3E2 executes each selected successor intent through E3D2",
  () => {
    assert.match(
      source,
      /for\s*\(\s*const\s+intent\s+of\s+page\.intents\s*\)/,
    );

    assert.match(
      source,
      /await\s+dependencies\.runIntent\s*\(\s*\{\s*supabase,\s*intent,\s*\}\s*\)/,
    );
  },
);


test(
  "Q14ag33E3E2 isolates per-intent execution failures",
  () => {
    assert.match(
      source,
      /catch\s*\(\s*error\s*\)/,
    );

    assert.match(
      source,
      /failedCount\s*\+=\s*1/,
    );

    assert.match(
      source,
      /succeededCount\s*\+=\s*1/,
    );

    assert.match(
      source,
      /normalizeErrorMessage\s*\(\s*error,\s*\)/,
    );
  },
);


test(
  "Q14ag33E3E2 preserves selection-source provenance in cycle outcomes",
  () => {
    const provenanceCopies =
      source.match(
        /selectionSource:\s*intent\.selectionSource/g,
      ) ?? [];

    assert.equal(
      provenanceCopies.length,
      2,
    );
  },
);


test(
  "Q14ag33E3E2 has no claim discovery scheduling or direct database authority",
  () => {
    assert.doesNotMatch(
      source,
      /claimHsppReconstructionExecutionIntent/,
    );

    assert.doesNotMatch(
      source,
      /claim_hspp_reconstruction_execution_intent/,
    );

    assert.doesNotMatch(
      source,
      /runHsppReconstructionExecutionIntentClaim/,
    );

    assert.doesNotMatch(
      source,
      /readHsppReservoirPairPage/,
    );

    assert.doesNotMatch(
      source,
      /evaluateHsppReservoirScheduledPairs/,
    );

    assert.doesNotMatch(
      source,
      /\.rpc\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.from\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.insert\s*\(/,
    );

    assert.doesNotMatch(
      source,
      /\.update\s*\(/,
    );
  },
);


test(
  "Q14ag33E3E2 defines production defaults as the exact certified reader and executor",
  () => {
    assert.match(
      source,
      /readIntents:\s*readHsppReconstructionExecutionIntentsV2/,
    );

    assert.match(
      source,
      /runIntent:\s*runHsppReconstructionExecutionIntentV2/,
    );
  },
);


test(
  "Q14ag33E3E2 does not alter the legacy cycle into successor routing",
  () => {
    assert.doesNotMatch(
      legacySource,
      /readHsppReconstructionExecutionIntentsV2/,
    );

    assert.doesNotMatch(
      legacySource,
      /runHsppReconstructionExecutionIntentV2/,
    );

    assert.doesNotMatch(
      legacySource,
      /SCHEDULED_PAIR/,
    );

    assert.doesNotMatch(
      legacySource,
      /selectionSource/,
    );
  },
);