import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";


const scheduled =
  fs.readFileSync(
    "lib/hspp/evaluateHsppReservoirScheduledPairs.ts",
    "utf8",
  );

const b07a =
  fs.readFileSync(
    "lib/hspp/evaluateHsppReservoirReevaluation.ts",
    "utf8",
  );


test(
  "exact evaluator consumes established explicit scheduler pair identities",
  () => {
    assert.match(
      scheduled,
      /HsppReservoirScheduledPair/,
    );

    assert.match(
      scheduled,
      /scheduledPairs/,
    );

    assert.match(
      scheduled,
      /pair\.firstEvidenceId/,
    );

    assert.match(
      scheduled,
      /pair\.secondEvidenceId/,
    );

    assert.match(
      scheduled,
      /pair\.ordinal/,
    );
  },
);


test(
  "exact evaluator never sorts or regenerates a cross-pair space",
  () => {
    assert.doesNotMatch(
      scheduled,
      /\.sort\s*\(/,
    );

    assert.doesNotMatch(
      scheduled,
      /\bfirstIndex\b/,
    );

    assert.doesNotMatch(
      scheduled,
      /\bsecondIndex\b/,
    );

    assert.doesNotMatch(
      scheduled,
      /secondIndex\s*=\s*firstIndex\s*\+\s*1/,
    );

    assert.match(
      scheduled,
      /for\s*\(\s*const\s+pair\s+of\s+normalizedScheduledPairs\s*\)/s,
    );
  },
);


test(
  "exact evaluator skips pair when either revalidated endpoint is absent",
  () => {
    assert.match(
      scheduled,
      /eligibleById\.get\(\s*pair\.firstEvidenceId\s*,?\s*\)/s,
    );

    assert.match(
      scheduled,
      /eligibleById\.get\(\s*pair\.secondEvidenceId\s*,?\s*\)/s,
    );

    assert.match(
      scheduled,
      /if\s*\(\s*!firstCandidate\s*\|\|\s*!secondCandidate\s*\)\s*\{\s*continue;/s,
    );
  },
);


test(
  "exact evaluator reuses B07A with exactly two candidates and therefore the established B11A2 primitive",
  () => {
    assert.match(
      scheduled,
      /evaluateHsppReservoirReevaluation\(\[\s*firstCandidate,\s*secondCandidate,\s*\]\)/s,
    );

    assert.match(
      b07a,
      /evaluateHsppAssemblyMembership\s*\(/,
    );

    assert.match(
      b07a,
      /evaluations\.push\(\{[\s\S]*membershipDecision:\s*evaluateHsppAssemblyMembership\(/,
    );
  },
);


test(
  "exact evaluator preserves existing B07A result policy and comparison ceiling",
  () => {
    assert.match(
      scheduled,
      /HsppReservoirReevaluationResult/,
    );

    assert.match(
      scheduled,
      /HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION/,
    );

    assert.match(
      scheduled,
      /HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS/,
    );

    assert.match(
      scheduled,
      /HSPP_RESERVOIR_PAIR_MAX_LIMIT/,
    );

    assert.match(
      scheduled,
      /Scheduled Reservoir pair evaluation accepts at most/,
    );
  },
);


test(
  "exact evaluator preserves scheduler pair identity in its aggregated evaluations",
  () => {
    assert.match(
      scheduled,
      /evaluations\.push\(\{[\s\S]*firstEvidenceId:\s*pair\.firstEvidenceId[\s\S]*secondEvidenceId:\s*pair\.secondEvidenceId/s,
    );

    assert.match(
      scheduled,
      /membershipDecision:[\s\S]*singleEvaluation[\s\S]*\.membershipDecision/s,
    );

    assert.match(
      scheduled,
      /sameUnorderedPair/,
    );
  },
);


test(
  "exact scheduled-pair evaluator is pure and owns no scheduling or downstream authority",
  () => {
    for (
      const forbidden of
      [
        /SupabaseClient/,
        /\.rpc\s*\(/,
        /\.from\s*\(/,
        /\.insert\s*\(/,
        /\.update\s*\(/,
        /\.upsert\s*\(/,
        /\.delete\s*\(/,
        /compareAndSwapHsppReservoirPairScanState\s*\(/,
        /compareAndSwapHsppReservoirDiscoveryScanState\s*\(/,
        /persistHsppEvidenceAssembly\s*\(/,
        /persistHsppEvidenceAssemblyReconstruction\s*\(/,
      ]
    ) {
      assert.doesNotMatch(
        scheduled,
        forbidden,
      );
    }

    assert.match(
      scheduled,
      /no database access/i,
    );

    assert.match(
      scheduled,
      /scheduling cursor/i,
    );

    assert.match(
      scheduled,
      /downstream authority/i,
    );
  },
);