import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  claimHsppReconstructionExecutionIntent,
  type ClaimedHsppReconstructionExecutionIntent,
} from "@/lib/hspp/claimHsppReconstructionExecutionIntent";

import {
  resolveHsppReconstructionClaimMaterial,
} from "@/lib/hspp/resolveHsppReconstructionClaimMaterial";

import type {
  RunHsppReservoirReevaluationResult,
} from "@/lib/hspp/runHsppReservoirReevaluation";


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RUNNER_VERSION =
  "hspp-reconstruction-execution-intent-claim-runner-v1" as const;


export type RunHsppReconstructionExecutionIntentClaimInput = {
  /**
   * Trusted service-role Supabase client.
   *
   * The runner itself performs no direct database operation.
   * Q14ag31B remains the sole durable-claim RPC wrapper.
   */
  supabase: SupabaseClient;

  organizationId: string;

  /**
   * One already-computed B07B snapshot.
   *
   * This runner must never rerun mutable Reservoir discovery or reevaluation.
   */
  reevaluationResult:
    RunHsppReservoirReevaluationResult;

  /**
   * Caller-owned proposed child UUID.
   *
   * The database may recover a different canonical child UUID for an
   * already-claimed immutable decision. The returned durable claim is
   * therefore authoritative.
   */
  proposedChildAssemblyId: string;

  /**
   * Explicit trusted reconstruction orchestration inputs.
   */
  reconstructionPolicyVersion: string;

  reconstructionReason: string;
};


export type RunHsppReconstructionExecutionIntentClaimResult =
  | {
      runnerVersion:
        typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RUNNER_VERSION;

      state:
        "NO_RECONSTRUCTION_CLAIM";

      organizationId: string;

      claim: null;
    }
  | {
      runnerVersion:
        typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RUNNER_VERSION;

      state:
        "RECONSTRUCTION_INTENT_CLAIMED";

      organizationId: string;

      /**
       * Exact canonical durable claim returned by Q14ag31B.
       *
       * In particular, claim.childAssemblyId must never be replaced by the
       * caller's proposedChildAssemblyId on idempotent recovery.
       */
      claim:
        ClaimedHsppReconstructionExecutionIntent;
    };


/**
 * Q14ag31U isolated durable reconstruction-intent producer.
 *
 * Responsibility:
 *
 * - consume one already-computed B07B snapshot;
 * - delegate all pair/role/fingerprint resolution to Q14ag31S exactly once;
 * - return without an RPC when no reconstruction claim material exists;
 * - map the resolved immutable material exactly into Q14ag31B;
 * - invoke the durable claim wrapper at most once; and
 * - surface the exact canonical durable claim returned by Q14ag31B.
 *
 * It deliberately does NOT:
 *
 * - run B06B discovery;
 * - run B07A reevaluation;
 * - rerun B07B;
 * - inspect, sort or rerank assemblyCandidates;
 * - duplicate reconstruction pair-selection logic;
 * - generate a UUID;
 * - read durable reconstruction intents;
 * - execute Q14ag31M;
 * - invoke Q14h;
 * - create, recover, seal or assess H2;
 * - invoke the legacy Q14ag26 reconstruction bridge;
 * - mutate Reservoir or evidence trust state;
 * - create API, cron, queue, polling or scheduler behavior.
 */
export async function runHsppReconstructionExecutionIntentClaim({
  supabase,
  organizationId,
  reevaluationResult,
  proposedChildAssemblyId,
  reconstructionPolicyVersion,
  reconstructionReason,
}: RunHsppReconstructionExecutionIntentClaimInput): Promise<RunHsppReconstructionExecutionIntentClaimResult> {
  const claimMaterial =
    resolveHsppReconstructionClaimMaterial({
      organizationId,
      reevaluationResult,
    });


  if (!claimMaterial) {
    return {
      runnerVersion:
        HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RUNNER_VERSION,

      state:
        "NO_RECONSTRUCTION_CLAIM",

      organizationId:
        reevaluationResult.organizationId,

      claim:
        null,
    };
  }


  const claim =
    await claimHsppReconstructionExecutionIntent({
      supabase,

      organizationId:
        claimMaterial.organizationId,

      proposedChildAssemblyId,

      selectedFirstEvidenceId:
        claimMaterial.selectedFirstEvidenceId,

      selectedSecondEvidenceId:
        claimMaterial.selectedSecondEvidenceId,

      historicalEvidenceId:
        claimMaterial.historicalEvidenceId,

      historicalEvidenceIntegrityFingerprint:
        claimMaterial.historicalEvidenceIntegrityFingerprint,

      replacementEvidenceId:
        claimMaterial.replacementEvidenceId,

      replacementEvidenceIntegrityFingerprint:
        claimMaterial.replacementEvidenceIntegrityFingerprint,

      discoveryPolicyVersion:
        claimMaterial.discoveryPolicyVersion,

      reevaluationPolicyVersion:
        claimMaterial.reevaluationPolicyVersion,

      membershipPolicyVersion:
        claimMaterial.membershipPolicyVersion,

      reconstructionPolicyVersion,

      reconstructionReason,
    });


  return {
    runnerVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RUNNER_VERSION,

    state:
      "RECONSTRUCTION_INTENT_CLAIMED",

    organizationId:
      claim.organizationId,

    claim,
  };
}
