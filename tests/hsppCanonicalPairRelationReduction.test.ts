import assert from "node:assert/strict";
import test from "node:test";

import type { HsppCanonicalClaimOutcome } from "../lib/hspp/evaluateHsppCanonicalContradiction";

import type { HsppAssemblyPairScan } from "../lib/hspp/scanHsppEvidenceAssembly";

import {
  HSPP_CANONICAL_PAIR_RELATION_REDUCTION_VERSION,
  reduceHsppCanonicalPairRelation,
} from "../lib/hspp/reduceHsppCanonicalPairRelation";

const claims = [
  "roadBlocked",
  "trafficFlowImpacted",
  "laneRestriction",
  "roadworksPresent",
] as const;

function pair(
  outcomes: HsppCanonicalClaimOutcome[],
  options: {
    contradictory?: boolean;
    firstEvidenceId?: string;
    secondEvidenceId?: string;
  } = {},
): HsppAssemblyPairScan {
  return {
    firstEvidenceId: options.firstEvidenceId ?? "evidence-a",

    secondEvidenceId: options.secondEvidenceId ?? "evidence-b",

    contradictory: options.contradictory ?? outcomes.includes("CONFLICT"),

    comparisons: outcomes.map((outcome, index) => ({
      claim: claims[index % claims.length],

      firstValue: outcome === "UNKNOWN" ? "UNKNOWN" : "TRUE",

      secondValue:
        outcome === "CONFLICT"
          ? "FALSE"
          : outcome === "UNKNOWN"
            ? "UNKNOWN"
            : "TRUE",

      outcome,

      comparable: outcome !== "UNKNOWN",
    })),
  };
}

test("B7490-07N3 gives canonical conflict highest precedence", () => {
  const result = reduceHsppCanonicalPairRelation(
    pair(["AGREE", "UNKNOWN", "CONFLICT"]),
  );

  assert.equal(
    result.policyVersion,
    HSPP_CANONICAL_PAIR_RELATION_REDUCTION_VERSION,
  );

  assert.equal(result.canonicalRelation, "CONFLICT");

  assert.equal(result.conflictCount, 1);

  assert.equal(result.agreementCount, 1);

  assert.equal(result.unknownCount, 1);

  assert.equal(result.authority, "NONE");
});

test("B7490-07N3 returns AGREE only when agreement exists without conflict", () => {
  const result = reduceHsppCanonicalPairRelation(
    pair(["UNKNOWN", "AGREE", "UNKNOWN"]),
  );

  assert.equal(result.canonicalRelation, "AGREE");

  assert.equal(result.conflictCount, 0);

  assert.equal(result.agreementCount, 1);

  assert.equal(result.unknownCount, 2);
});

test("B7490-07N3 preserves all-unresolved comparisons as UNKNOWN", () => {
  const result = reduceHsppCanonicalPairRelation(pair(["UNKNOWN", "UNKNOWN"]));

  assert.equal(result.canonicalRelation, "UNKNOWN");

  assert.equal(result.comparisonCount, 2);

  assert.equal(result.unknownCount, 2);
});

test("B7490-07N3 rejects an inconsistent B11C contradictory flag", () => {
  assert.throws(
    () =>
      reduceHsppCanonicalPairRelation(
        pair(["CONFLICT"], {
          contradictory: false,
        }),
      ),

    /contradictory flag does not match/,
  );

  assert.throws(
    () =>
      reduceHsppCanonicalPairRelation(
        pair(["AGREE"], {
          contradictory: true,
        }),
      ),

    /contradictory flag does not match/,
  );
});

test("B7490-07N3 rejects invalid pair identity", () => {
  assert.throws(
    () =>
      reduceHsppCanonicalPairRelation(
        pair(["AGREE"], {
          firstEvidenceId: "evidence-a",

          secondEvidenceId: "evidence-a",
        }),
      ),

    /two distinct evidence identities/,
  );

  assert.throws(
    () =>
      reduceHsppCanonicalPairRelation(
        pair(["AGREE"], {
          firstEvidenceId: " ",
        }),
      ),

    /firstEvidenceId must be a non-empty string/,
  );
});

test("B7490-07N3 is deterministic and does not mutate B11C provenance", () => {
  const input = pair(["UNKNOWN", "AGREE"]);

  const before = structuredClone(input);

  const first = reduceHsppCanonicalPairRelation(input);

  const second = reduceHsppCanonicalPairRelation(input);

  assert.deepEqual(first, second);

  assert.deepEqual(input, before);
});
