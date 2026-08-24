import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  readHsppReconstructionExecutionIntents,
} from "@/lib/hspp/readHsppReconstructionExecutionIntents";

import {
  runHsppReconstructionExecutionIntent,
  type RunHsppReconstructionExecutionIntentResult,
} from "@/lib/hspp/runHsppReconstructionExecutionIntent";


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_RUNNER_VERSION =
  "hspp-reconstruction-execution-intent-cycle-runner-v1" as const;


export type RunHsppReconstructionExecutionIntentCycleInput = {
  /**
   * Trusted service-role Supabase client.
   *
   * The cycle itself owns no direct RPC or table access. It composes only
   * the already-closed Q14ag31F reader and Q14ag31M one-intent runner.
   */
  supabase: SupabaseClient;

  organizationId: string;

  /**
   * Optional bounded page size.
   *
   * Q14ag31F remains the limit validation authority and caps the page at 100.
   */
  limit?: number;
};


export type HsppReconstructionExecutionIntentCycleOutcome =
  | {
      intentId: string;

      childAssemblyId: string;

      success: true;

      result:
        RunHsppReconstructionExecutionIntentResult;

      errorMessage:
        null;
    }
  | {
      intentId: string;

      childAssemblyId: string;

      success: false;

      result:
        null;

      errorMessage: string;
    };


type RunHsppReconstructionExecutionIntentCycleCommon = {
  runnerVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_RUNNER_VERSION;

  organizationId: string;

  limit: number;

  selectedCount: number;

  succeededCount: number;

  failedCount: number;

  /**
   * True only when Q14ag31F reports another page exists.
   *
   * Q14ag31W never follows that cursor itself. A future invocation may
   * process more work, preserving a strictly bounded single-cycle budget.
   */
  hasMore: boolean;

  outcomes:
    HsppReconstructionExecutionIntentCycleOutcome[];
};


export type RunHsppReconstructionExecutionIntentCycleResult =
  | (
      RunHsppReconstructionExecutionIntentCycleCommon & {
        state:
          "NO_PENDING_INTENTS";

        selectedCount:
          0;

        succeededCount:
          0;

        failedCount:
          0;

        hasMore:
          false;

        outcomes:
          [];
      }
    )
  | (
      RunHsppReconstructionExecutionIntentCycleCommon & {
        state:
          "CYCLE_COMPLETED";
      }
    );


function normalizeErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error &&
    typeof error.message ===
      "string" &&
    error.message.trim()
  ) {
    return error.message.trim();
  }


  const fallback =
    String(
      error ??
      "",
    ).trim();


  return fallback ||
    "Unknown durable reconstruction execution error.";
}


/**
 * Q14ag31W isolated durable reconstruction consumer cycle.
 *
 * Exactly one bounded Q14ag31F page is read using the starvation-safe
 * CLAIMED_NOT_PERSISTED server-side filter.
 *
 * Returned intents are processed sequentially. Each intent delegates to
 * Q14ag31M exactly once. One failed intent is recorded and does not prevent
 * later intents from being attempted in the same already-read page.
 *
 * RECONSTRUCTION_PERSISTED is intentionally not periodic work here.
 * Q14ag31M retains its own canonical-child recovery preflight, so an intent
 * that persisted between the read and its execution can still be recovered
 * safely without scanning immutable persisted intent history.
 *
 * This runner deliberately does NOT:
 *
 * - claim durable intents;
 * - invoke the Q14ag31U producer;
 * - rerun B06B/B07A/B07B;
 * - generate child UUIDs;
 * - read RECONSTRUCTION_PERSISTED as periodic work;
 * - paginate or loop across additional reader pages;
 * - duplicate Q14ag31M reconstruction logic;
 * - directly invoke Q14h;
 * - directly access Supabase RPC/table APIs;
 * - mutate durable intent rows;
 * - create API, cron, queue or scheduler wiring.
 */
export async function runHsppReconstructionExecutionIntentCycle({
  supabase,
  organizationId,
  limit,
}: RunHsppReconstructionExecutionIntentCycleInput): Promise<RunHsppReconstructionExecutionIntentCycleResult> {
  const page =
    await readHsppReconstructionExecutionIntents({
      supabase,

      organizationId,

      limit,

      persistenceStateFilter:
        "CLAIMED_NOT_PERSISTED",
    });


  if (
    page.intents.length ===
    0
  ) {
    return {
      runnerVersion:
        HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_RUNNER_VERSION,

      state:
        "NO_PENDING_INTENTS",

      organizationId:
        page.organizationId,

      limit:
        page.limit,

      selectedCount:
        0,

      succeededCount:
        0,

      failedCount:
        0,

      hasMore:
        false,

      outcomes:
        [],
    };
  }


  const outcomes:
    HsppReconstructionExecutionIntentCycleOutcome[] =
      [];


  let succeededCount =
    0;

  let failedCount =
    0;


  for (
    const intent of
      page.intents
  ) {
    try {
      const result =
        await runHsppReconstructionExecutionIntent({
          supabase,
          intent,
        });


      outcomes.push({
        intentId:
          intent.intentId,

        childAssemblyId:
          intent.childAssemblyId,

        success:
          true,

        result,

        errorMessage:
          null,
      });


      succeededCount +=
        1;
    }
    catch (error) {
      outcomes.push({
        intentId:
          intent.intentId,

        childAssemblyId:
          intent.childAssemblyId,

        success:
          false,

        result:
          null,

        errorMessage:
          normalizeErrorMessage(
            error,
          ),
      });


      failedCount +=
        1;
    }
  }


  return {
    runnerVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_RUNNER_VERSION,

    state:
      "CYCLE_COMPLETED",

    organizationId:
      page.organizationId,

    limit:
      page.limit,

    selectedCount:
      page.intents.length,

    succeededCount,

    failedCount,

    hasMore:
      page.nextCursor !==
      null,

    outcomes,
  };
}
