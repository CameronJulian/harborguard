import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateHsppReservoirScheduledPairs,
} from "../lib/hspp/evaluateHsppReservoirScheduledPairs";

import {
  HSPP_RESERVOIR_PAIR_MAX_LIMIT,
  type HsppReservoirScheduledPair,
} from "../lib/hspp/readHsppReservoirPairPage";

import {
  HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS,
  HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION,
} from "../lib/hspp/evaluateHsppReservoirReevaluation";

import type {
  HsppReservoirEligibleEvidence,
} from "../lib/hspp/readHsppReservoirEligibleEvidenceByIds";


function evidenceId(
  value: number,
): string {
  return (
    "00000000-0000-4000-8000-" +
    value
      .toString(16)
      .padStart(
        12,
        "0",
      )
  );
}


function eligibleEvidence(
  id: string,
  provider: string,
  overrides: {
    persistedEvidenceId?: string;
    eventType?: string;
    latitude?: number;
    longitude?: number;
    observedAt?: string;
  } = {},
): HsppReservoirEligibleEvidence {
  const persistedEvidenceId =
    overrides
      .persistedEvidenceId ??
    id;

  return {
    evidenceId:
      id,

    operationalRead: {
      evidence: {
        id:
          persistedEvidenceId,

        organizationId:
          "11111111-1111-4111-8111-111111111111",

        integrityFingerprint:
          "a".repeat(64),

        sourceClass:
          "external_intelligence",

        sourceProvider:
          provider,

        observedAt:
          overrides
            .observedAt ??
          "2026-09-01T08:00:00.000Z",

        normalizedPayload: {
          latitude:
            overrides
              .latitude ??
            -33.946,

          longitude:
            overrides
              .longitude ??
            18.587,

          eventType:
            overrides
              .eventType ??
            "accident",
        },
      },
    },

    hasAssemblyMembership:
      false,

    membershipClassification:
      "NEVER_ASSEMBLED",

    reservoirDecision: {
      eligible:
        true,
    },
  } as unknown as
    HsppReservoirEligibleEvidence;
}


function pair(
  ordinal: number,
  firstEvidenceId: string,
  secondEvidenceId: string,
): HsppReservoirScheduledPair {
  return {
    ordinal,
    firstEvidenceId,
    secondEvidenceId,
  };
}


test(
  "exact scheduled-pair evaluator preserves scheduler order and never generates cross-pairs",
  () => {
    const a =
      evidenceId(1);

    const b =
      evidenceId(2);

    const c =
      evidenceId(3);

    const d =
      evidenceId(4);

    const extra =
      evidenceId(5);


    const result =
      evaluateHsppReservoirScheduledPairs({
        scheduledPairs: [
          pair(
            1,
            b,
            c,
          ),

          pair(
            2,
            a,
            d,
          ),
        ],

        eligibleEvidence: [
          eligibleEvidence(
            a,
            "tomtom",
          ),

          eligibleEvidence(
            b,
            "here",
          ),

          eligibleEvidence(
            c,
            "azure",
          ),

          eligibleEvidence(
            d,
            "google",
          ),

          /*
           * Deliberately eligible but never scheduled.
           * It must never create synthetic A-E, B-E, etc. pairs.
           */
          eligibleEvidence(
            extra,
            "extra-provider",
          ),
        ],
      });


    assert.equal(
      result.policyVersion,
      HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION,
    );

    assert.equal(
      result.comparisonLimit,
      HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS,
    );

    assert.equal(
      result.comparisonCount,
      2,
    );

    assert.equal(
      result.candidateCount,
      4,
    );

    assert.equal(
      result.state,
      "ASSEMBLY_CANDIDATE",
    );

    assert.deepEqual(
      result.evaluations.map(
        (evaluation) => [
          evaluation
            .firstEvidenceId,

          evaluation
            .secondEvidenceId,
        ],
      ),
      [
        [
          b,
          c,
        ],

        [
          a,
          d,
        ],
      ],
    );

    assert.equal(
      result
        .assemblyCandidates
        .length,
      2,
    );

    assert.equal(
      result.evaluations.some(
        (evaluation) =>
          evaluation
            .firstEvidenceId ===
            a &&
          evaluation
            .secondEvidenceId ===
            b,
      ),
      false,
    );

    assert.equal(
      result.evaluations.some(
        (evaluation) =>
          evaluation
            .firstEvidenceId ===
            a &&
          evaluation
            .secondEvidenceId ===
            extra,
      ),
      false,
    );
  },
);


test(
  "scheduled pair is skipped when either endpoint is no longer Reservoir eligible",
  () => {
    const a =
      evidenceId(1);

    const b =
      evidenceId(2);

    const c =
      evidenceId(3);


    const result =
      evaluateHsppReservoirScheduledPairs({
        scheduledPairs: [
          pair(
            1,
            a,
            b,
          ),

          pair(
            2,
            b,
            c,
          ),
        ],

        eligibleEvidence: [
          eligibleEvidence(
            a,
            "tomtom",
          ),

          eligibleEvidence(
            c,
            "here",
          ),
        ],
      });


    assert.equal(
      result.state,
      "NO_COUNTERPART",
    );

    assert.equal(
      result.comparisonCount,
      0,
    );

    assert.equal(
      result.candidateCount,
      0,
    );

    assert.deepEqual(
      result.evaluations,
      [],
    );

    assert.deepEqual(
      result.assemblyCandidates,
      [],
    );
  },
);


test(
  "exact evaluator preserves B11A2 denial semantics through the established B07A path",
  () => {
    const a =
      evidenceId(1);

    const b =
      evidenceId(2);


    const result =
      evaluateHsppReservoirScheduledPairs({
        scheduledPairs: [
          pair(
            1,
            a,
            b,
          ),
        ],

        eligibleEvidence: [
          eligibleEvidence(
            a,
            "tomtom",
          ),

          eligibleEvidence(
            b,
            "tomtom",
          ),
        ],
      });


    assert.equal(
      result.state,
      "MEMBERSHIP_DENIED",
    );

    assert.equal(
      result.comparisonCount,
      1,
    );

    assert.equal(
      result
        .assemblyCandidates
        .length,
      0,
    );

    assert.equal(
      result
        .evaluations[0]
        .membershipDecision
        .eligible,
      false,
    );

    assert.equal(
      result
        .evaluations[0]
        .membershipDecision
        .reason,
      "SAME_PROVIDER",
    );
  },
);


test(
  "exact evaluator accepts the full bounded one-hundred-pair scheduler page",
  () => {
    const first =
      evidenceId(1);

    const scheduledPairs =
      Array.from(
        {
          length:
            HSPP_RESERVOIR_PAIR_MAX_LIMIT,
        },
        (
          _,
          index,
        ) =>
          pair(
            index + 1,
            first,
            evidenceId(
              index + 2,
            ),
          ),
      );


    const result =
      evaluateHsppReservoirScheduledPairs({
        scheduledPairs,
        eligibleEvidence: [],
      });


    assert.equal(
      scheduledPairs.length,
      100,
    );

    assert.equal(
      result.state,
      "NO_COUNTERPART",
    );

    assert.equal(
      result.comparisonCount,
      0,
    );
  },
);


test(
  "exact evaluator rejects more than one hundred scheduled pairs",
  () => {
    const first =
      evidenceId(1);

    const scheduledPairs =
      Array.from(
        {
          length:
            HSPP_RESERVOIR_PAIR_MAX_LIMIT +
            1,
        },
        (
          _,
          index,
        ) =>
          pair(
            index + 1,
            first,
            evidenceId(
              index + 2,
            ),
          ),
      );


    assert.throws(
      () =>
        evaluateHsppReservoirScheduledPairs({
          scheduledPairs,
          eligibleEvidence: [],
        }),

      /at most 100 pairs/i,
    );
  },
);


test(
  "exact evaluator rejects duplicate scheduled pair identities",
  () => {
    const a =
      evidenceId(1);

    const b =
      evidenceId(2);


    assert.throws(
      () =>
        evaluateHsppReservoirScheduledPairs({
          scheduledPairs: [
            pair(
              1,
              a,
              b,
            ),

            pair(
              2,
              a,
              b,
            ),
          ],

          eligibleEvidence: [],
        }),

      /Duplicate scheduled Reservoir pair/i,
    );
  },
);


test(
  "exact evaluator rejects duplicate eligible evidence identities",
  () => {
    const a =
      evidenceId(1);


    assert.throws(
      () =>
        evaluateHsppReservoirScheduledPairs({
          scheduledPairs: [],

          eligibleEvidence: [
            eligibleEvidence(
              a,
              "tomtom",
            ),

            eligibleEvidence(
              a,
              "here",
            ),
          ],
        }),

      /Duplicate Reservoir-eligible evidence/i,
    );
  },
);


test(
  "exact evaluator fails closed when scheduled identity and persisted evidence identity diverge",
  () => {
    const a =
      evidenceId(1);

    const b =
      evidenceId(2);

    const c =
      evidenceId(3);


    assert.throws(
      () =>
        evaluateHsppReservoirScheduledPairs({
          scheduledPairs: [
            pair(
              1,
              a,
              b,
            ),
          ],

          eligibleEvidence: [
            eligibleEvidence(
              a,
              "tomtom",
              {
                persistedEvidenceId:
                  c,
              },
            ),

            eligibleEvidence(
              b,
              "here",
            ),
          ],
        }),

      /does not match the persisted evidence identities evaluated by B07A/i,
    );
  },
);