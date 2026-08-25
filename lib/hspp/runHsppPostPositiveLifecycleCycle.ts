import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "@/lib/hspp/readHsppPostPositiveLifecycleWorkItems";

import {
  readHsppPostPositiveLifecycleFairWorkItemsV2,
  type HsppPostPositiveLifecycleFairCursorAdvance,
  type ReadHsppPostPositiveLifecycleFairWorkItemsResult,
} from "@/lib/hspp/readHsppPostPositiveLifecycleFairWorkItemsV2";

import {
  compareAndSwapHsppPostPositiveLifecycleScanState,
  type CompareAndSwapHsppPostPositiveLifecycleScanStateResult,
} from "@/lib/hspp/compareAndSwapHsppPostPositiveLifecycleScanState";

import {
  runHsppPostPositiveMemberUnsuitabilityAssessment,
  type RunHsppPostPositiveMemberUnsuitabilityAssessmentResult,
} from "@/lib/hspp/runHsppPostPositiveMemberUnsuitabilityAssessment";

import {
  runHsppPostPositiveMemberEffectiveCessation,
  type RunHsppPostPositiveMemberEffectiveCessationResult,
} from "@/lib/hspp/runHsppPostPositiveMemberEffectiveCessation";

export const HSPP_POST_POSITIVE_LIFECYCLE_CYCLE_RUNNER_VERSION =
  "hspp-post-positive-lifecycle-cycle-runner-v2" as const;

export type HsppPostPositiveLifecycleAttemptValueFactory =
  (
    workItem:
      HsppPostPositiveLifecycleWorkItem,
  ) => string;

export type RunHsppPostPositiveLifecycleCycleInput = {
  supabase:
    SupabaseClient;

  organizationId:
    string;

  /**
   * Delegated to the canonical bounded fair lifecycle reader.
   */
  limit?:
    number;

  /**
   * Caller-owned execution-lease duration.
   *
   * The single-item runners and lease primitive retain validation authority.
   */
  leaseSeconds:
    number;

  /**
   * Caller-owned post-positive observation identity.
   *
   * Called only for REEVALUATION_REQUIRED work.
   */
  createObservedAt:
    HsppPostPositiveLifecycleAttemptValueFactory;

  /**
   * Caller-owned post-positive decision identity.
   *
   * Called only for REEVALUATION_REQUIRED work.
   */
  createDecidedAt:
    HsppPostPositiveLifecycleAttemptValueFactory;

  /**
   * Caller-owned fresh execution-ownership identity.
   *
   * Called exactly once for each attempted work item.
   */
  createLeaseToken:
    HsppPostPositiveLifecycleAttemptValueFactory;
};

export type HsppPostPositiveLifecycleCycleReevaluationResult =
  | {
      branch:
        "REEVALUATION_RESULT";

      workItem:
        HsppPostPositiveLifecycleWorkItem;

      assessment:
        RunHsppPostPositiveMemberUnsuitabilityAssessmentResult;

      cessation:
        null;

      error:
        null;
    }
  | {
      branch:
        "REEVALUATION_ERROR";

      workItem:
        HsppPostPositiveLifecycleWorkItem;

      assessment:
        null;

      cessation:
        null;

      error:
        string;
    };

export type HsppPostPositiveLifecycleCycleCessationResult =
  | {
      branch:
        "CESSATION_RESULT";

      workItem:
        HsppPostPositiveLifecycleWorkItem;

      assessment:
        null;

      cessation:
        RunHsppPostPositiveMemberEffectiveCessationResult;

      error:
        null;
    }
  | {
      branch:
        "CESSATION_ERROR";

      workItem:
        HsppPostPositiveLifecycleWorkItem;

      assessment:
        null;

      cessation:
        null;

      error:
        string;
    };

export type HsppPostPositiveLifecycleCycleWorkResult =
  | HsppPostPositiveLifecycleCycleReevaluationResult
  | HsppPostPositiveLifecycleCycleCessationResult;

export type HsppPostPositiveLifecycleCycleCursorAdvanceResult =
  | {
      branch:
        "CURSOR_ADVANCE_NOT_REQUIRED";

      request:
        null;

      result:
        null;

      error:
        null;
    }
  | {
      branch:
        "CURSOR_ADVANCE_RESULT";

      request:
        HsppPostPositiveLifecycleFairCursorAdvance;

      result:
        CompareAndSwapHsppPostPositiveLifecycleScanStateResult;

      error:
        null;
    }
  | {
      branch:
        "CURSOR_ADVANCE_ERROR";

      request:
        HsppPostPositiveLifecycleFairCursorAdvance;

      result:
        null;

      error:
        string;
    };


export type RunHsppPostPositiveLifecycleCycleResult = {
  runnerVersion:
    typeof HSPP_POST_POSITIVE_LIFECYCLE_CYCLE_RUNNER_VERSION;

  organizationId:
    string;

  discovery:
    ReadHsppPostPositiveLifecycleFairWorkItemsResult;

  workResults:
    HsppPostPositiveLifecycleCycleWorkResult[];

  cursorAdvanceResult:
    HsppPostPositiveLifecycleCycleCursorAdvanceResult;
};

export type HsppPostPositiveLifecycleCycleDependencies = {
  readWorkItems:
    typeof readHsppPostPositiveLifecycleFairWorkItemsV2;

  advanceCursor:
    typeof compareAndSwapHsppPostPositiveLifecycleScanState;

  runReevaluation:
    typeof runHsppPostPositiveMemberUnsuitabilityAssessment;

  runCessation:
    typeof runHsppPostPositiveMemberEffectiveCessation;
};

const DEFAULT_DEPENDENCIES:
  HsppPostPositiveLifecycleCycleDependencies = {
    readWorkItems:
      readHsppPostPositiveLifecycleFairWorkItemsV2,

    advanceCursor:
      compareAndSwapHsppPostPositiveLifecycleScanState,

    runReevaluation:
      runHsppPostPositiveMemberUnsuitabilityAssessment,

    runCessation:
      runHsppPostPositiveMemberEffectiveCessation,
  };

function requireNonBlank(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} must be a non-empty string.`,
    );
  }

  return value.trim();
}

function requireFactory(
  value: unknown,
  fieldName: string,
): void {
  if (
    typeof value !==
    "function"
  ) {
    throw new Error(
      `${fieldName} must be a function.`,
    );
  }
}

function cycleErrorMessage(
  error: unknown,
  fallbackMessage =
    "HSPP post-positive lifecycle work item failed.",
): string {
  if (
    error instanceof Error &&
    error.message.trim()
  ) {
    return error.message.trim();
  }

  if (
    typeof error === "string" &&
    error.trim()
  ) {
    return error.trim();
  }

  return fallbackMessage;
}

/**
 * Dormant bounded post-positive lifecycle orchestration.
 *
 * The cycle captures exactly one bounded lifecycle snapshot before the
 * first work-item mutation. It processes that snapshot sequentially and
 * never rediscoveries lifecycle state in the same execution.
 *
 * REEVALUATION_REQUIRED:
 *
 *   caller-owned observedAt
 *   -> caller-owned decidedAt
 *   -> caller-owned leaseToken
 *   -> existing post-positive unsuitability assessment runner
 *
 * CESSATION_REQUIRED:
 *
 *   caller-owned leaseToken
 *   -> existing effective-cessation runner
 *
 * Discovery failure is cycle-fatal because no trustworthy snapshot exists.
 * After discovery, each item is failure-isolated. There is no internal
 * retry: an ambiguous Q14x/Q14ac outcome must be resolved by a later outer
 * execution performing fresh lifecycle discovery.
 *
 * This cycle deliberately does NOT:
 *
 * - query organizations;
 * - create a Supabase client;
 * - generate wall-clock timestamps;
 * - generate UUID lease tokens;
 * - directly acquire or release leases;
 * - directly persist Q14v or Q14ac;
 * - perform direct RPC/table access;
 * - retry work internally;
 * - rediscover after processing begins;
 * - return evidence to Reservoir;
 * - select replacement evidence;
 * - reconstruct H2;
 * - create API, cron, queue, scheduler or Vercel wiring.
 */
export async function runHsppPostPositiveLifecycleCycle(
  {
    supabase,
    organizationId,
    limit,
    leaseSeconds,
    createObservedAt,
    createDecidedAt,
    createLeaseToken,
  }: RunHsppPostPositiveLifecycleCycleInput,

  dependencies:
    HsppPostPositiveLifecycleCycleDependencies =
      DEFAULT_DEPENDENCIES,
): Promise<RunHsppPostPositiveLifecycleCycleResult> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  requireFactory(
    createObservedAt,
    "createObservedAt",
  );

  requireFactory(
    createDecidedAt,
    "createDecidedAt",
  );

  requireFactory(
    createLeaseToken,
    "createLeaseToken",
  );

  /*
   * Exactly one persisted lifecycle snapshot is captured before the first
   * work-item mutation. A transition created by this cycle is intentionally
   * invisible until a later outer execution rediscovers it.
   */
  const discovery =
    await dependencies.readWorkItems({
      supabase,

      organizationId:
        normalizedOrganizationId,

      limit,
    });

  const workResults:
    HsppPostPositiveLifecycleCycleWorkResult[] =
      [];

  for (
    const workItem
    of discovery.workItems
  ) {
    if (
      workItem.workState ===
      "REEVALUATION_REQUIRED"
    ) {
      try {
        const observedAt =
          requireNonBlank(
            createObservedAt(
              workItem,
            ),
            "createObservedAt result",
          );

        const decidedAt =
          requireNonBlank(
            createDecidedAt(
              workItem,
            ),
            "createDecidedAt result",
          );

        const leaseToken =
          requireNonBlank(
            createLeaseToken(
              workItem,
            ),
            "createLeaseToken result",
          );

        const assessment =
          await dependencies.runReevaluation({
            supabase,

            workItem,

            leaseToken,

            leaseSeconds,

            observedAt,

            decidedAt,
          });

        workResults.push({
          branch:
            "REEVALUATION_RESULT",

          workItem,

          assessment,

          cessation:
            null,

          error:
            null,
        });
      }
      catch (error: unknown) {
        workResults.push({
          branch:
            "REEVALUATION_ERROR",

          workItem,

          assessment:
            null,

          cessation:
            null,

          error:
            cycleErrorMessage(
              error,
            ),
        });
      }

      continue;
    }

    if (
      workItem.workState ===
      "CESSATION_REQUIRED"
    ) {
      try {
        const leaseToken =
          requireNonBlank(
            createLeaseToken(
              workItem,
            ),
            "createLeaseToken result",
          );

        const cessation =
          await dependencies.runCessation({
            supabase,

            workItem,

            leaseToken,

            leaseSeconds,
          });

        workResults.push({
          branch:
            "CESSATION_RESULT",

          workItem,

          assessment:
            null,

          cessation,

          error:
            null,
        });
      }
      catch (error: unknown) {
        workResults.push({
          branch:
            "CESSATION_ERROR",

          workItem,

          assessment:
            null,

          cessation:
            null,

          error:
            cycleErrorMessage(
              error,
            ),
        });
      }

      continue;
    }

    /*
     * The canonical reader validates this union before returning.
     * Reaching this branch means the injected discovery authority violated
     * its contract, so continuing mutation would not be trustworthy.
     */
    throw new Error(
      "Post-positive lifecycle discovery returned an unsupported work state.",
    );
  }


  /*
   * Fair scheduling state advances only after every item in the captured
   * discovery snapshot has been attempted.
   *
   * Lifecycle writes remain owned by the existing item runners. The cursor
   * is scheduling metadata only. Item error, INDETERMINATE, SUITABLE and
   * LEASE_BUSY results therefore do not pin the captured fair page.
   *
   * No retry or rediscovery occurs here. STALE is returned as ordinary CAS
   * scheduling contention and is not reinterpreted by this cycle.
   */
  const cursorAdvanceRequest =
    discovery.cursorAdvance ??
    null;


  let cursorAdvanceResult:
    HsppPostPositiveLifecycleCycleCursorAdvanceResult;


  if (cursorAdvanceRequest === null) {
    cursorAdvanceResult = {
      branch:
        "CURSOR_ADVANCE_NOT_REQUIRED",

      request:
        null,

      result:
        null,

      error:
        null,
    };
  } else {
    try {
      const result =
        await dependencies.advanceCursor({
          supabase,

          organizationId:
            normalizedOrganizationId,

          expectedCursor:
            cursorAdvanceRequest.expectedCursor,

          proposedCursor:
            cursorAdvanceRequest.proposedCursor,
        });


      cursorAdvanceResult = {
        branch:
          "CURSOR_ADVANCE_RESULT",

        request:
          cursorAdvanceRequest,

        result,

        error:
          null,
      };
    }
    catch (error: unknown) {
      cursorAdvanceResult = {
        branch:
          "CURSOR_ADVANCE_ERROR",

        request:
          cursorAdvanceRequest,

        result:
          null,

        error:
          cycleErrorMessage(
            error,
            "HSPP post-positive lifecycle cursor advancement failed.",
          ),
      };
    }
  }

  return {
    runnerVersion:
      HSPP_POST_POSITIVE_LIFECYCLE_CYCLE_RUNNER_VERSION,

    organizationId:
      normalizedOrganizationId,

    discovery,

    workResults,

    cursorAdvanceResult,
  };
}
