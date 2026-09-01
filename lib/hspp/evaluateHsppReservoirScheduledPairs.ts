import {
  HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS,
  HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION,
  evaluateHsppReservoirReevaluation,
  type HsppReservoirPairEvaluation,
  type HsppReservoirReevaluationResult,
} from "@/lib/hspp/evaluateHsppReservoirReevaluation";

import {
  HSPP_RESERVOIR_PAIR_MAX_LIMIT,
  type HsppReservoirScheduledPair,
} from "@/lib/hspp/readHsppReservoirPairPage";

import type {
  HsppReservoirCandidate,
} from "@/lib/hspp/readHsppReservoirCandidates";

import type {
  HsppReservoirEligibleEvidence,
} from "@/lib/hspp/readHsppReservoirEligibleEvidenceByIds";


export const HSPP_RESERVOIR_SCHEDULED_PAIR_EVALUATION_VERSION =
  "hspp-reservoir-scheduled-pair-evaluation-v1" as const;


export type EvaluateHsppReservoirScheduledPairsInput = {
  /**
   * Exact canonical pair identities selected by the global
   * Reservoir pair scheduler.
   *
   * Array order is protocol-significant and must be preserved.
   */
  scheduledPairs:
    HsppReservoirScheduledPair[];

  /**
   * Current Reservoir-eligible evidence returned by the shared
   * evidence-id revalidation boundary.
   *
   * Missing evidence is intentionally allowed here because an
   * endpoint may have become ineligible after its raw pair was
   * scheduled. Such a pair is consumed as a scheduling
   * opportunity but is not sent to B11A2.
   */
  eligibleEvidence:
    HsppReservoirEligibleEvidence[];
};


const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;


function requireUuid(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !UUID_PATTERN.test(
      value.trim(),
    )
  ) {
    throw new Error(
      `${fieldName} must be a UUID.`,
    );
  }

  return value
    .trim()
    .toLowerCase();
}


function normalizeScheduledPairs(
  scheduledPairs:
    HsppReservoirScheduledPair[],
): HsppReservoirScheduledPair[] {
  if (!Array.isArray(scheduledPairs)) {
    throw new Error(
      "scheduledPairs must be an array.",
    );
  }

  if (
    scheduledPairs.length >
    HSPP_RESERVOIR_PAIR_MAX_LIMIT
  ) {
    throw new Error(
      `Scheduled Reservoir pair evaluation accepts at most ${HSPP_RESERVOIR_PAIR_MAX_LIMIT} pairs.`,
    );
  }

  if (
    HSPP_RESERVOIR_PAIR_MAX_LIMIT !==
    HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS
  ) {
    throw new Error(
      "Reservoir scheduler and reevaluation comparison ceilings differ.",
    );
  }

  const seenPairs =
    new Set<string>();

  return scheduledPairs.map(
    (
      pair,
      index,
    ) => {
      if (
        !pair ||
        typeof pair !== "object"
      ) {
        throw new Error(
          `scheduledPairs[${index}] is invalid.`,
        );
      }

      if (
        !Number.isInteger(
          pair.ordinal,
        ) ||
        pair.ordinal !==
          index + 1
      ) {
        throw new Error(
          "Scheduled Reservoir pair ordinals must be contiguous and one-based.",
        );
      }

      const firstEvidenceId =
        requireUuid(
          pair.firstEvidenceId,
          `scheduledPairs[${index}].firstEvidenceId`,
        );

      const secondEvidenceId =
        requireUuid(
          pair.secondEvidenceId,
          `scheduledPairs[${index}].secondEvidenceId`,
        );

      if (
        !(
          firstEvidenceId <
          secondEvidenceId
        )
      ) {
        throw new Error(
          `scheduledPairs[${index}] must preserve canonical firstEvidenceId < secondEvidenceId ordering.`,
        );
      }

      const pairKey =
        `${firstEvidenceId}:${secondEvidenceId}`;

      if (
        seenPairs.has(
          pairKey,
        )
      ) {
        throw new Error(
          `Duplicate scheduled Reservoir pair ${pairKey}.`,
        );
      }

      seenPairs.add(
        pairKey,
      );

      return {
        ordinal:
          pair.ordinal,

        firstEvidenceId,

        secondEvidenceId,
      };
    },
  );
}


function indexEligibleEvidence(
  eligibleEvidence:
    HsppReservoirEligibleEvidence[],
): Map<
  string,
  HsppReservoirCandidate
> {
  if (!Array.isArray(eligibleEvidence)) {
    throw new Error(
      "eligibleEvidence must be an array.",
    );
  }

  const indexed =
    new Map<
      string,
      HsppReservoirCandidate
    >();

  for (
    let index = 0;
    index <
      eligibleEvidence.length;
    index++
  ) {
    const candidate =
      eligibleEvidence[index];

    if (
      !candidate ||
      typeof candidate !== "object"
    ) {
      throw new Error(
        `eligibleEvidence[${index}] is invalid.`,
      );
    }

    const evidenceId =
      requireUuid(
        candidate.evidenceId,
        `eligibleEvidence[${index}].evidenceId`,
      );

    if (
      indexed.has(
        evidenceId,
      )
    ) {
      throw new Error(
        `Duplicate Reservoir-eligible evidence ${evidenceId}.`,
      );
    }

    if (
      candidate
        .reservoirDecision
        .eligible !==
      true
    ) {
      throw new Error(
        `Evidence ${evidenceId} was supplied as eligible but its Reservoir decision is not eligible.`,
      );
    }

    if (
      candidate
        .hasAssemblyMembership !==
      false
    ) {
      throw new Error(
        `Evidence ${evidenceId} was supplied as Reservoir eligible while current assembly membership is present.`,
      );
    }

    indexed.set(
      evidenceId,
      candidate,
    );
  }

  return indexed;
}


function sameUnorderedPair(
  evaluation:
    HsppReservoirPairEvaluation,
  pair:
    HsppReservoirScheduledPair,
): boolean {
  return (
    (
      evaluation.firstEvidenceId ===
        pair.firstEvidenceId &&
      evaluation.secondEvidenceId ===
        pair.secondEvidenceId
    ) ||
    (
      evaluation.firstEvidenceId ===
        pair.secondEvidenceId &&
      evaluation.secondEvidenceId ===
        pair.firstEvidenceId
    )
  );
}


/**
 * Pure exact-pair Reservoir reevaluation primitive.
 *
 * Unlike B07A, this function NEVER derives a pair space from a flat
 * candidate collection.
 *
 * The global scheduler owns which pair identities receive the next
 * bounded comparison opportunities. This evaluator:
 *
 * - consumes those identities in their original scheduler order;
 * - performs no sorting of the pair list;
 * - performs no nested pair generation;
 * - skips a scheduled pair when either endpoint is no longer
 *   currently Reservoir eligible;
 * - invokes the established B07A/B11A2 path with exactly TWO
 *   candidates for each remaining scheduled pair;
 * - preserves the scheduler-selected pair identity in the result;
 * - returns the established B07A reevaluation result shape.
 *
 * Supplying exactly two candidates to B07A means B07A can generate
 * only one pair. This reuses its established candidate-to-B11A2
 * mapping without allowing it to regenerate a cross-product over
 * the scheduled endpoint set.
 *
 * This function performs no database access, scheduling cursor
 * mutation, persistence, trust transition or downstream authority
 * transition.
 */
export function evaluateHsppReservoirScheduledPairs({
  scheduledPairs,
  eligibleEvidence,
}: EvaluateHsppReservoirScheduledPairsInput): HsppReservoirReevaluationResult {
  const normalizedScheduledPairs =
    normalizeScheduledPairs(
      scheduledPairs,
    );

  const eligibleById =
    indexEligibleEvidence(
      eligibleEvidence,
    );

  const evaluations:
    HsppReservoirPairEvaluation[] =
      [];

  const evaluatedCandidateIds =
    new Set<string>();


  for (
    const pair of
    normalizedScheduledPairs
  ) {
    const firstCandidate =
      eligibleById.get(
        pair.firstEvidenceId,
      );

    const secondCandidate =
      eligibleById.get(
        pair.secondEvidenceId,
      );

    /*
     * Raw scheduling opportunity is still considered consumed by
     * the future runner even when this semantic boundary cannot
     * currently evaluate it. Cursor movement is deliberately NOT
     * owned by this pure function.
     */
    if (
      !firstCandidate ||
      !secondCandidate
    ) {
      continue;
    }


    /*
     * B07A receives exactly the scheduler-selected pair.
     * With two candidates its internal nested enumeration can
     * produce one and only one comparison.
     */
    const singlePairResult =
      evaluateHsppReservoirReevaluation([
        firstCandidate,
        secondCandidate,
      ]);


    if (
      singlePairResult
        .comparisonCount !==
        1 ||
      singlePairResult
        .evaluations
        .length !==
        1
    ) {
      throw new Error(
        `Scheduled Reservoir pair ${pair.firstEvidenceId}:${pair.secondEvidenceId} did not produce exactly one B07A comparison.`,
      );
    }


    const singleEvaluation =
      singlePairResult
        .evaluations[0];

    if (
      !singleEvaluation ||
      !sameUnorderedPair(
        singleEvaluation,
        pair,
      )
    ) {
      throw new Error(
        `Scheduled Reservoir pair ${pair.firstEvidenceId}:${pair.secondEvidenceId} does not match the persisted evidence identities evaluated by B07A.`,
      );
    }


    /*
     * Keep the scheduler identity/order rather than adopting any
     * internal ordering chosen by B07A.
     */
    evaluations.push({
      firstEvidenceId:
        pair.firstEvidenceId,

      secondEvidenceId:
        pair.secondEvidenceId,

      membershipDecision:
        singleEvaluation
          .membershipDecision,
    });


    evaluatedCandidateIds.add(
      pair.firstEvidenceId,
    );

    evaluatedCandidateIds.add(
      pair.secondEvidenceId,
    );
  }


  if (
    evaluations.length >
    HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS
  ) {
    throw new Error(
      "Scheduled Reservoir reevaluation exceeded the B07A comparison ceiling.",
    );
  }


  const assemblyCandidates =
    evaluations.filter(
      (evaluation) =>
        evaluation
          .membershipDecision
          .eligible,
    );


  return {
    policyVersion:
      HSPP_RESERVOIR_REEVALUATION_POLICY_VERSION,

    state:
      assemblyCandidates.length >
      0
        ? "ASSEMBLY_CANDIDATE"
        : evaluations.length >
            0
          ? "MEMBERSHIP_DENIED"
          : "NO_COUNTERPART",

    /*
     * Count only unique endpoints that actually reached B11A2.
     * Revalidated but unpaired evidence does not become a synthetic
     * candidate set for this exact-pair boundary.
     */
    candidateCount:
      evaluatedCandidateIds.size,

    comparisonCount:
      evaluations.length,

    comparisonLimit:
      HSPP_RESERVOIR_REEVALUATION_MAX_PAIR_COMPARISONS,

    evaluations,

    assemblyCandidates,
  };
}