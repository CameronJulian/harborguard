import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  readHsppReconstructionExecutionIntentsV2,
  type ReadHsppReconstructionExecutionIntentsV2Result,
} from "./readHsppReconstructionExecutionIntentsV2";

import {
  runHsppReconstructionExecutionIntentV2,
  type RunHsppReconstructionExecutionIntentV2Result,
} from "./runHsppReconstructionExecutionIntentV2";


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_V2_RUNNER_VERSION =
  "hspp-reconstruction-execution-intent-cycle-v2-runner-v1" as const;


export type RunHsppReconstructionExecutionIntentCycleV2Input = {
  /**
   * Trusted service-role Supabase client.
   *
   * The cycle owns no direct RPC/table authority.
   */
  supabase:
    SupabaseClient;

  organizationId:
    string;

  /**
   * Optional bounded page size.
   *
   * The V2 reader remains the limit-validation authority.
   */
  limit?:
    number;
};


export type HsppReconstructionExecutionIntentCycleV2Outcome =
  | {
      intentId:
        string;

      childAssemblyId:
        string;

      selectionSource:
        "B07B_DISCOVERY" | "SCHEDULED_PAIR";

      success:
        true;

      result:
        RunHsppReconstructionExecutionIntentV2Result;

      errorMessage:
        null;
    }
  | {
      intentId:
        string;

      childAssemblyId:
        string;

      selectionSource:
        "B07B_DISCOVERY" | "SCHEDULED_PAIR";

      success:
        false;

      result:
        null;

      errorMessage:
        string;
    };


type RunHsppReconstructionExecutionIntentCycleV2Common = {
  runnerVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_V2_RUNNER_VERSION;

  organizationId:
    string;

  limit:
    number;

  selectedCount:
    number;

  succeededCount:
    number;

  failedCount:
    number;

  /**
   * True only when the read-only V2 reader reports another page.
   *
   * This cycle never follows the cursor itself. One invocation owns
   * exactly one bounded page.
   */
  hasMore:
    boolean;

  outcomes:
    HsppReconstructionExecutionIntentCycleV2Outcome[];
};


export type RunHsppReconstructionExecutionIntentCycleV2Result =
  RunHsppReconstructionExecutionIntentCycleV2Common &
  (
    | {
        state:
          "NO_PENDING_SUCCESSOR_INTENTS";
      }
    | {
        state:
          "SUCCESSOR_CYCLE_COMPLETED";
      }
  );


export type HsppReconstructionExecutionIntentCycleV2Dependencies = {
  readIntents:
    typeof readHsppReconstructionExecutionIntentsV2;

  runIntent:
    typeof runHsppReconstructionExecutionIntentV2;
};


const DEFAULT_HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_V2_DEPENDENCIES:
  HsppReconstructionExecutionIntentCycleV2Dependencies = {
    readIntents:
      readHsppReconstructionExecutionIntentsV2,

    runIntent:
      runHsppReconstructionExecutionIntentV2,
  };


function normalizeErrorMessage(
  error:
    unknown,
): string {
  if (
    error instanceof Error &&
    typeof error.message === "string" &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  if (
    typeof error === "string" &&
    error.trim().length > 0
  ) {
    return error;
  }

  return "Unknown successor reconstruction execution error.";
}


/**
 * Q14ag33E3E2 isolated successor execution cycle.
 *
 * Lifecycle:
 *
 * 1. read exactly one bounded page of already-durable successor intents;
 * 2. restrict periodic work to CLAIMED_NOT_PERSISTED;
 * 3. execute intents sequentially through the certified E3D2 executor;
 * 4. isolate an individual intent failure from later intents in the page;
 * 5. report whether the reader exposed another page, without following it.
 *
 * This cycle deliberately does NOT:
 *
 * - claim durable intents;
 * - call either legacy or successor claim RPC;
 * - perform B07B discovery;
 * - schedule Reservoir pairs;
 * - select or mutate producer provenance;
 * - generate child/replacement identity;
 * - process RECONSTRUCTION_PERSISTED as periodic work;
 * - duplicate E3D2/E3C2 execution logic;
 * - directly access Supabase RPC/table APIs;
 * - paginate across additional pages;
 * - create API, cron, queue or scheduler wiring.
 */
export async function runHsppReconstructionExecutionIntentCycleV2(
  {
    supabase,
    organizationId,
    limit,
  }: RunHsppReconstructionExecutionIntentCycleV2Input,
  dependencies:
    HsppReconstructionExecutionIntentCycleV2Dependencies =
      DEFAULT_HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_V2_DEPENDENCIES,
): Promise<RunHsppReconstructionExecutionIntentCycleV2Result> {
  const page:
    ReadHsppReconstructionExecutionIntentsV2Result =
      await dependencies.readIntents({
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
        HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_V2_RUNNER_VERSION,

      state:
        "NO_PENDING_SUCCESSOR_INTENTS",

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
    HsppReconstructionExecutionIntentCycleV2Outcome[] =
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
        await dependencies.runIntent({
          supabase,
          intent,
        });


      outcomes.push({
        intentId:
          intent.intentId,

        childAssemblyId:
          intent.childAssemblyId,

        selectionSource:
          intent.selectionSource,

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

        selectionSource:
          intent.selectionSource,

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
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CYCLE_V2_RUNNER_VERSION,

    state:
      "SUCCESSOR_CYCLE_COMPLETED",

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