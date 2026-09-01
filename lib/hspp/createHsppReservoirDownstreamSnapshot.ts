import type {
  RunHsppReservoirReevaluationResult,
} from "@/lib/hspp/runHsppReservoirReevaluation";

import type {
  RunHsppReservoirScheduledPairReevaluationResult,
} from "@/lib/hspp/runHsppReservoirScheduledPairReevaluation";


export type HsppReservoirDownstreamCandidate =
  RunHsppReservoirReevaluationResult[
    "discovery"
  ][
    "candidates"
  ][number];


export type HsppReservoirDownstreamReevaluation =
  RunHsppReservoirReevaluationResult[
    "reevaluation"
  ];


/**
 * Neutral semantic Reservoir handoff.
 *
 * This type intentionally contains only the material currently
 * required by downstream lifecycle and persistence decisions:
 *
 * - organization identity;
 * - currently eligible Reservoir candidates;
 * - the semantic reevaluation result.
 *
 * It carries no scan/cursor state and confers no authority by itself.
 */
export type HsppReservoirDownstreamSnapshot =
  Readonly<{
    organizationId:
      string;

    candidates:
      readonly HsppReservoirDownstreamCandidate[];

    reevaluation:
      HsppReservoirDownstreamReevaluation;
  }>;


function createSnapshot({
  organizationId,
  candidates,
  reevaluation,
}: HsppReservoirDownstreamSnapshot): HsppReservoirDownstreamSnapshot {
  return {
    organizationId,
    candidates,
    reevaluation,
  };
}


/**
 * Adapts the established B07B discovery-based result to the neutral
 * semantic downstream handoff.
 *
 * No discovery scheduler state is copied into the snapshot.
 */
export function createHsppReservoirDownstreamSnapshotFromB07B(
  result:
    RunHsppReservoirReevaluationResult,
): HsppReservoirDownstreamSnapshot {
  return createSnapshot({
    organizationId:
      result.discovery
        .organizationId,

    candidates:
      result.discovery
        .candidates,

    reevaluation:
      result.reevaluation,
  });
}


/**
 * Adapts the global pair-runner result to the identical neutral
 * semantic downstream handoff.
 *
 * The pair page remains owned by scheduling/orchestration and is not
 * copied into this snapshot.
 */
export function createHsppReservoirDownstreamSnapshotFromScheduledPairs(
  result:
    RunHsppReservoirScheduledPairReevaluationResult,
): HsppReservoirDownstreamSnapshot {
  return createSnapshot({
    organizationId:
      result.pairPage
        .organizationId,

    candidates:
      result.eligibleEvidence,

    reevaluation:
      result.reevaluation,
  });
}


/*
 * This module is deliberately pure:
 *
 * - no database reads or writes;
 * - no scan-state mutation;
 * - no assembly persistence;
 * - no lifecycle execution;
 * - no trust, corroboration or downstream authority transition.
 *
 * It only removes producer-specific orchestration material from an
 * already-produced Reservoir semantic result.
 */