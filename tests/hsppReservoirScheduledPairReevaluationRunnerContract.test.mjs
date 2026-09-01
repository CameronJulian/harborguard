import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const source =
  fs.readFileSync(
    "lib/hspp/runHsppReservoirScheduledPairReevaluation.ts",
    "utf8",
  );


test(
  "scheduled-pair runner reads exactly one bounded raw pair page",
  () => {
    assert.match(
      source,
      /HSPP_RESERVOIR_PAIR_MAX_LIMIT/,
    );

    const calls =
      source.match(
        /await\s+readHsppReservoirPairPage\s*\(/g,
      ) ?? [];

    assert.equal(
      calls.length,
      1,
    );

    assert.match(
      source,
      /limit:\s*[\r\n]+\s*normalizedLimit/,
    );
  },
);


test(
  "scheduled-pair runner derives endpoint IDs in first-seen pair order without sorting",
  () => {
    assert.match(
      source,
      /for\s*\(\s*const\s+pair\s+of\s+scheduledPairs\s*\)/s,
    );

    assert.match(
      source,
      /pair\.firstEvidenceId/,
    );

    assert.match(
      source,
      /pair\.secondEvidenceId/,
    );

    assert.match(
      source,
      /new Set<string>\s*\(\s*\)/s,
    );

    assert.doesNotMatch(
      source,
      /\.sort\s*\(/,
    );
  },
);


test(
  "scheduled-pair runner preserves the shared maximum of two hundred unique endpoints",
  () => {
    assert.match(
      source,
      /HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS/,
    );

    assert.match(
      source,
      /evidenceIds\.length\s*>\s*HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS/s,
    );
  },
);


test(
  "scheduled-pair runner calls shared revalidation exactly once",
  () => {
    const calls =
      source.match(
        /await\s+readHsppReservoirEligibleEvidenceByIds\s*\(/g,
      ) ?? [];

    assert.equal(
      calls.length,
      1,
    );

    assert.match(
      source,
      /evidenceIds:\s*[\r\n]+\s*endpointEvidenceIds/,
    );
  },
);


test(
  "scheduled-pair runner calls the exact evaluator once using the original raw pair identities",
  () => {
    const calls =
      source.match(
        /evaluateHsppReservoirScheduledPairs\s*\(/g,
      ) ?? [];

    assert.equal(
      calls.length,
      1,
    );

    assert.match(
      source,
      /scheduledPairs:\s*[\r\n]+\s*pairPage\.pairs/,
    );

    assert.match(
      source,
      /\beligibleEvidence,\s*[\r\n]+\s*\}\s*\)/,
    );
  },
);


test(
  "runner operation order is raw pair page then revalidation then exact evaluation",
  () => {
    const pairPageIndex =
      source.indexOf(
        "await readHsppReservoirPairPage({",
      );

    const revalidationIndex =
      source.indexOf(
        "await readHsppReservoirEligibleEvidenceByIds({",
      );

    const evaluationIndex =
      source.indexOf(
        "evaluateHsppReservoirScheduledPairs({",
      );


    assert.ok(
      pairPageIndex >= 0,
    );

    assert.ok(
      revalidationIndex >
        pairPageIndex,
    );

    assert.ok(
      evaluationIndex >
        revalidationIndex,
    );
  },
);


test(
  "runner returns the original pair page rather than fabricating B06B discovery metadata",
  () => {
    assert.match(
      source,
      /return\s*\{[\s\S]*pairPage,[\s\S]*endpointEvidenceIds,[\s\S]*eligibleEvidence,[\s\S]*reevaluation,/,
    );

    assert.doesNotMatch(
      source,
      /ReadHsppReservoirCandidatesResult/,
    );

    assert.doesNotMatch(
      source,
      /\bdiscovery\s*:/,
    );
  },
);


test(
  "pair cursor mutation and downstream authority remain outside the runner",
  () => {
    for (
      const forbidden of
      [
        /compareAndSwapHsppReservoirPairScanState/,
        /compareAndSwapHsppReservoirDiscoveryScanState/,
        /persistHsppReservoirAssemblyCandidate/,
        /persistHsppEvidenceAssembly/,
        /resolveHsppReservoirLifecycleRoute/,
        /runHsppReconstructionActivationCycle/,
        /\.insert\s*\(/,
        /\.update\s*\(/,
        /\.upsert\s*\(/,
        /\.delete\s*\(/,
        /supabase\.rpc\s*\(/,
        /supabase\.from\s*\(/,
      ]
    ) {
      assert.doesNotMatch(
        source,
        forbidden,
      );
    }

    assert.match(
      source,
      /Cursor advancement deliberately remains outside this boundary/i,
    );

    assert.match(
      source,
      /no scheduling state is mutated here/i,
    );

    assert.match(
      source,
      /no assembly is persisted here/i,
    );

    assert.match(
      source,
      /no trust, corroboration or downstream authority is granted here/i,
    );
  },
);