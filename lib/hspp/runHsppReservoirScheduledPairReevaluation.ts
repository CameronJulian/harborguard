import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_RESERVOIR_PAIR_MAX_LIMIT,
  readHsppReservoirPairPage,
  type HsppReservoirScheduledPair,
} from "@/lib/hspp/readHsppReservoirPairPage";

import {
  HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS,
  readHsppReservoirEligibleEvidenceByIds,
} from "@/lib/hspp/readHsppReservoirEligibleEvidenceByIds";

import {
  evaluateHsppReservoirScheduledPairs,
} from "@/lib/hspp/evaluateHsppReservoirScheduledPairs";


export const HSPP_RESERVOIR_SCHEDULED_PAIR_REEVALUATION_RUNNER_VERSION =
  "hspp-reservoir-scheduled-pair-reevaluation-runner-v1" as const;


type PairPageResult =
  Awaited<
    ReturnType<
      typeof readHsppReservoirPairPage
    >
  >;


type EligibleEvidenceResult =
  Awaited<
    ReturnType<
      typeof readHsppReservoirEligibleEvidenceByIds
    >
  >;


type ScheduledPairReevaluationResult =
  ReturnType<
    typeof evaluateHsppReservoirScheduledPairs
  >;


export type RunHsppReservoirScheduledPairReevaluationInput = {
  supabase:
    SupabaseClient;

  organizationId:
    string;

  /**
   * Number of raw global pair opportunities to schedule.
   *
   * This is a scheduling bound only. It does not imply that every
   * scheduled pair remains semantically eligible by evaluation time.
   */
  limit?:
    number;
};


export type RunHsppReservoirScheduledPairReevaluationResult = {
  runnerVersion:
    typeof HSPP_RESERVOIR_SCHEDULED_PAIR_REEVALUATION_RUNNER_VERSION;

  /**
   * The original validated scheduler page is retained unchanged so a
   * later orchestration boundary can use its exact scheduling metadata,
   * including its expected/proposed cursor state.
   *
   * This runner does not advance that state.
   */
  pairPage:
    PairPageResult;

  /**
   * Unique endpoint IDs in first-seen raw pair order.
   *
   * This is not a new pair space.
   */
  endpointEvidenceIds:
    string[];

  /**
   * Current Reservoir-eligible evidence for the scheduled endpoints.
   *
   * Missing entries mean that an endpoint revalidated out before
   * semantic pair evaluation.
   */
  eligibleEvidence:
    EligibleEvidenceResult;

  /**
   * Semantic evaluation of only the original scheduler-selected pairs.
   */
  reevaluation:
    ScheduledPairReevaluationResult;
};


function normalizeLimit(
  limit:
    number | undefined,
): number {
  const normalized =
    limit ??
    HSPP_RESERVOIR_PAIR_MAX_LIMIT;

  if (
    !Number.isInteger(
      normalized,
    ) ||
    normalized < 1 ||
    normalized >
      HSPP_RESERVOIR_PAIR_MAX_LIMIT
  ) {
    throw new Error(
      `Reservoir scheduled-pair runner limit must be an integer between 1 and ${HSPP_RESERVOIR_PAIR_MAX_LIMIT}.`,
    );
  }

  return normalized;
}


/**
 * Converts the exact raw scheduled pair page into a bounded endpoint
 * read set without sorting and without generating any additional pair.
 *
 * First-seen pair order is protocol-significant:
 *
 *   pair 1 first
 *   pair 1 second
 *   pair 2 first
 *   pair 2 second
 *   ...
 *
 * Repeated endpoint IDs are removed after their first appearance.
 */
export function collectHsppReservoirScheduledPairEndpointIds(
  scheduledPairs:
    HsppReservoirScheduledPair[],
): string[] {
  if (!Array.isArray(scheduledPairs)) {
    throw new Error(
      "scheduledPairs must be an array.",
    );
  }

  const seen =
    new Set<string>();

  const evidenceIds:
    string[] =
      [];


  for (
    const pair of
    scheduledPairs
  ) {
    for (
      const evidenceId of
      [
        pair.firstEvidenceId,
        pair.secondEvidenceId,
      ]
    ) {
      if (
        seen.has(
          evidenceId,
        )
      ) {
        continue;
      }

      seen.add(
        evidenceId,
      );

      evidenceIds.push(
        evidenceId,
      );
    }
  }


  if (
    evidenceIds.length >
    HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS
  ) {
    throw new Error(
      `Reservoir scheduled-pair runner produced more than ${HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS} unique endpoint IDs.`,
    );
  }


  return evidenceIds;
}


/**
 * Read/evaluate-only global Reservoir pair runner.
 *
 * Responsibility:
 *
 *   raw pair page
 *       ->
 *   first-seen endpoint ID set
 *       ->
 *   shared current Reservoir revalidation
 *       ->
 *   exact scheduler-selected pair evaluation
 *
 * Cursor advancement deliberately remains outside this boundary.
 *
 * Therefore:
 * - a raw scheduled opportunity may produce no semantic comparison
 *   when an endpoint revalidates out;
 * - successful completion still returns the original scheduler page
 *   to a later orchestration layer;
 * - any page-read, revalidation or evaluation exception escapes;
 * - no scheduling state is mutated here;
 * - no assembly is persisted here;
 * - no trust, corroboration or downstream authority is granted here.
 */
export async function runHsppReservoirScheduledPairReevaluation({
  supabase,
  organizationId,
  limit,
}: RunHsppReservoirScheduledPairReevaluationInput): Promise<RunHsppReservoirScheduledPairReevaluationResult> {
  const normalizedLimit =
    normalizeLimit(
      limit,
    );


  const pairPage =
    await readHsppReservoirPairPage({
      supabase,
      organizationId,
      limit:
        normalizedLimit,
    });


  const endpointEvidenceIds =
    collectHsppReservoirScheduledPairEndpointIds(
      pairPage.pairs,
    );


  const eligibleEvidence =
    await readHsppReservoirEligibleEvidenceByIds({
      supabase,
      organizationId,
      evidenceIds:
        endpointEvidenceIds,
    });


  const reevaluation =
    evaluateHsppReservoirScheduledPairs({
      scheduledPairs:
        pairPage.pairs,

      eligibleEvidence,
    });


  return {
    runnerVersion:
      HSPP_RESERVOIR_SCHEDULED_PAIR_REEVALUATION_RUNNER_VERSION,

    pairPage,

    endpointEvidenceIds,

    eligibleEvidence,

    reevaluation,
  };
}