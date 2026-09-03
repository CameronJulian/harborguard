import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  compareAndSwapHsppReservoirPairScanState,
  type CompareAndSwapHsppReservoirPairScanStateResult,
} from "@/lib/hspp/compareAndSwapHsppReservoirPairScanState";

import {
  runHsppReservoirScheduledPairReevaluation,
  type RunHsppReservoirScheduledPairReevaluationResult,
} from "@/lib/hspp/runHsppReservoirScheduledPairReevaluation";

import {
  runHsppScheduledPairReconstructionExecutionIntentClaimV2,
  type RunHsppScheduledPairReconstructionExecutionIntentClaimV2Result,
} from "@/lib/hspp/runHsppScheduledPairReconstructionExecutionIntentClaimV2";


export const HSPP_SCHEDULED_PAIR_RECONSTRUCTION_CYCLE_RUNNER_VERSION =
  "hspp-scheduled-pair-reconstruction-cycle-runner-v1" as const;


export type RunHsppScheduledPairReconstructionCycleDependencies = {
  runScheduledPairReevaluation:
    typeof runHsppReservoirScheduledPairReevaluation;

  runScheduledPairProducer:
    typeof runHsppScheduledPairReconstructionExecutionIntentClaimV2;

  compareAndSwapPairCursor:
    typeof compareAndSwapHsppReservoirPairScanState;
};


export const HSPP_SCHEDULED_PAIR_RECONSTRUCTION_CYCLE_DEFAULT_DEPENDENCIES:
  RunHsppScheduledPairReconstructionCycleDependencies = {
    runScheduledPairReevaluation:
      runHsppReservoirScheduledPairReevaluation,

    runScheduledPairProducer:
      runHsppScheduledPairReconstructionExecutionIntentClaimV2,

    compareAndSwapPairCursor:
      compareAndSwapHsppReservoirPairScanState,
  };


export type RunHsppScheduledPairReconstructionCycleInput = {
  supabase:
    SupabaseClient;

  organizationId:
    string;

  limit?:
    number;

  /**
   * Caller-owned child identity.
   *
   * This orchestrator deliberately does not generate UUIDs.
   */
  proposedChildAssemblyId:
    string;

  /**
   * Caller-owned reconstruction policy.
   *
   * This orchestrator does not resolve policy authority.
   */
  reconstructionPolicyVersion:
    string;

  reconstructionReason:
    string;

  /**
   * Testability seam only.
   *
   * Production callers normally omit this and use the canonical default
   * dependencies above.
   */
  dependencies?:
    Partial<RunHsppScheduledPairReconstructionCycleDependencies>;
};


export type HsppScheduledPairCursorOutcome =
  | {
      state:
        "SKIPPED_NO_PROPOSED_CURSOR";

      cas:
        null;
    }
  | {
      state:
        "PAIR_CURSOR_CAS_COMPLETED";

      cas:
        CompareAndSwapHsppReservoirPairScanStateResult;
    };


export type RunHsppScheduledPairReconstructionCycleResult = {
  runnerVersion:
    typeof HSPP_SCHEDULED_PAIR_RECONSTRUCTION_CYCLE_RUNNER_VERSION;

  organizationId:
    string;

  scheduled:
    RunHsppReservoirScheduledPairReevaluationResult;

  producer:
    RunHsppScheduledPairReconstructionExecutionIntentClaimV2Result;

  cursor:
    HsppScheduledPairCursorOutcome;
};


/**
 * Dedicated dormant SCHEDULED_PAIR orchestration boundary.
 *
 * Exact authority order:
 *
 *   scheduled pair reevaluation
 *       ->
 *   scheduled durable-intent producer
 *       ->
 *   pair scheduling cursor CAS
 *
 * Cursor movement represents scheduling progress only.
 *
 * A successful scheduled page may therefore advance even when the durable
 * producer returns NO_RECONSTRUCTION_CLAIM. That outcome means the scheduled
 * semantic work completed successfully but did not yield claim material.
 *
 * Failure ordering is intentionally fail-closed:
 *
 * - reevaluation throw -> producer is not called, CAS is not called;
 * - producer throw -> CAS is not called;
 * - null proposed cursor -> producer may complete normally, CAS is skipped;
 * - non-null proposed cursor -> CAS occurs only after producer completion.
 *
 * STALE remains ordinary scheduling contention returned by the CAS wrapper.
 *
 * This orchestrator deliberately does NOT:
 *
 * - generate a UUID;
 * - resolve reconstruction policy;
 * - drain successor reconstruction intents;
 * - invoke reconstruction execution;
 * - modify the main reconstruction activation cycle;
 * - modify or invoke a cron/API route;
 * - retry a STALE CAS;
 * - grant semantic authority from cursor movement.
 */
export async function runHsppScheduledPairReconstructionCycle({
  supabase,
  organizationId,
  limit,
  proposedChildAssemblyId,
  reconstructionPolicyVersion,
  reconstructionReason,
  dependencies:
    dependencyOverrides,
}: RunHsppScheduledPairReconstructionCycleInput): Promise<RunHsppScheduledPairReconstructionCycleResult> {
  const dependencies:
    RunHsppScheduledPairReconstructionCycleDependencies = {
      ...HSPP_SCHEDULED_PAIR_RECONSTRUCTION_CYCLE_DEFAULT_DEPENDENCIES,
      ...dependencyOverrides,
    };


  const scheduled =
    await dependencies.runScheduledPairReevaluation({
      supabase,
      organizationId,
      limit,
    });


  const producer =
    await dependencies.runScheduledPairProducer({
      supabase,

      scheduledReevaluationResult:
        scheduled,

      proposedChildAssemblyId,

      reconstructionPolicyVersion,

      reconstructionReason,
    });


  const proposedCursor =
    scheduled
      .pairPage
      .proposedCursor;


  if (proposedCursor === null) {
    return {
      runnerVersion:
        HSPP_SCHEDULED_PAIR_RECONSTRUCTION_CYCLE_RUNNER_VERSION,

      organizationId:
        scheduled.pairPage.organizationId,

      scheduled,

      producer,

      cursor: {
        state:
          "SKIPPED_NO_PROPOSED_CURSOR",

        cas:
          null,
      },
    };
  }


  const cas =
    await dependencies.compareAndSwapPairCursor({
      supabase,

      organizationId:
        scheduled.pairPage.organizationId,

      expectedCursor:
        scheduled
          .pairPage
          .expectedCursor,

      proposedCursor,
    });


  return {
    runnerVersion:
      HSPP_SCHEDULED_PAIR_RECONSTRUCTION_CYCLE_RUNNER_VERSION,

    organizationId:
      scheduled.pairPage.organizationId,

    scheduled,

    producer,

    cursor: {
      state:
        "PAIR_CURSOR_CAS_COMPLETED",

      cas,
    },
  };
}