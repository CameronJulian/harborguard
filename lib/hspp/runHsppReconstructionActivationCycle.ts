import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  resolveHsppReconstructionActivationPolicy,
  type HsppReconstructionActivationPolicy,
} from "@/lib/hspp/resolveHsppReconstructionActivationPolicy";

import {
  runHsppReconstructionExecutionIntentClaim,
  type RunHsppReconstructionExecutionIntentClaimResult,
} from "@/lib/hspp/runHsppReconstructionExecutionIntentClaim";

import {
  runHsppReconstructionExecutionIntentCycle,
  type RunHsppReconstructionExecutionIntentCycleResult,
} from "@/lib/hspp/runHsppReconstructionExecutionIntentCycle";

import type {
  RunHsppReservoirReevaluationResult,
} from "@/lib/hspp/runHsppReservoirReevaluation";


export const HSPP_RECONSTRUCTION_ACTIVATION_CYCLE_RUNNER_VERSION =
  "hspp-reconstruction-activation-cycle-runner-v1" as const;


export type RunHsppReconstructionActivationCycleInput = {
  /**
   * Trusted service-role Supabase client.
   *
   * The outer cycle itself performs no direct RPC/table access.
   */
  supabase: SupabaseClient;

  organizationId: string;

  /**
   * The already-computed B07B snapshot from the caller.
   *
   * This cycle must never rerun mutable Reservoir discovery/reevaluation.
   */
  reevaluationResult:
    RunHsppReservoirReevaluationResult;

  /**
   * Caller-owned proposed child UUID.
   *
   * The durable claim authority may recover a different canonical child for
   * an already-claimed decision. Q14ag31U preserves that canonical result.
   */
  proposedChildAssemblyId: string;
};


export type HsppReconstructionActivationProducerOutcome =
  | {
      success: true;

      result:
        RunHsppReconstructionExecutionIntentClaimResult;

      errorMessage:
        null;
    }
  | {
      success: false;

      result:
        null;

      errorMessage: string;
    };


export type RunHsppReconstructionActivationCycleResult = {
  runnerVersion:
    typeof HSPP_RECONSTRUCTION_ACTIVATION_CYCLE_RUNNER_VERSION;

  state:
    "ACTIVATION_CYCLE_COMPLETED";

  organizationId: string;

  proposedChildAssemblyId: string;

  activationPolicy:
    HsppReconstructionActivationPolicy;

  producer:
    HsppReconstructionActivationProducerOutcome;

  consumer:
    RunHsppReconstructionExecutionIntentCycleResult;
};


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
    "Unknown reconstruction activation producer error.";
}


/**
 * Q14ag32B dormant outer reconstruction activation cycle.
 *
 * Responsibility:
 *
 * - consume one already-computed B07B snapshot;
 * - resolve Q14ag31Z policy/reason exactly once;
 * - attempt Q14ag31U producer exactly once;
 * - preserve the producer result when successful;
 * - isolate a producer exception so existing durable work can still drain;
 * - always invoke Q14ag31W consumer exactly once after the producer attempt;
 * - propagate fatal consumer/read failures; and
 * - return both producer and consumer outcomes.
 *
 * It deliberately does NOT:
 *
 * - run B06B, B07A or B07B;
 * - inspect or rerank assembly candidates;
 * - duplicate Q14ag31S reconstruction-pair selection;
 * - generate a UUID;
 * - call the durable claim wrapper directly;
 * - call the durable-intent reader directly;
 * - invoke Q14ag31M directly;
 * - invoke Q14h directly;
 * - mutate durable intent rows;
 * - create API, cron, queue or scheduler wiring.
 */
export async function runHsppReconstructionActivationCycle({
  supabase,
  organizationId,
  reevaluationResult,
  proposedChildAssemblyId,
}: RunHsppReconstructionActivationCycleInput): Promise<RunHsppReconstructionActivationCycleResult> {
  const activationPolicy =
    resolveHsppReconstructionActivationPolicy();


  let producer:
    HsppReconstructionActivationProducerOutcome;


  try {
    const result =
      await runHsppReconstructionExecutionIntentClaim({
        supabase,

        organizationId,

        reevaluationResult,

        proposedChildAssemblyId,

        reconstructionPolicyVersion:
          activationPolicy.reconstructionPolicyVersion,

        reconstructionReason:
          activationPolicy.reconstructionReason,
      });


    producer = {
      success:
        true,

      result,

      errorMessage:
        null,
    };
  }
  catch (error) {
    producer = {
      success:
        false,

      result:
        null,

      errorMessage:
        normalizeErrorMessage(
          error,
        ),
    };
  }


  const consumer =
    await runHsppReconstructionExecutionIntentCycle({
      supabase,

      organizationId,
    });


  return {
    runnerVersion:
      HSPP_RECONSTRUCTION_ACTIVATION_CYCLE_RUNNER_VERSION,

    state:
      "ACTIVATION_CYCLE_COMPLETED",

    organizationId,

    proposedChildAssemblyId,

    activationPolicy,

    producer,

    consumer,
  };
}
