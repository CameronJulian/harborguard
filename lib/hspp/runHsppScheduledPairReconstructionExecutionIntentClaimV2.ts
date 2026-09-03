import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  claimHsppReconstructionExecutionIntentV2,
  type ClaimedHsppReconstructionExecutionIntentV2,
} from "@/lib/hspp/claimHsppReconstructionExecutionIntentV2";

import {
  createHsppReservoirDownstreamSnapshotFromScheduledPairs,
} from "@/lib/hspp/createHsppReservoirDownstreamSnapshot";

import {
  resolveHsppReconstructionSelectionMaterialFromSnapshot,
} from "@/lib/hspp/resolveHsppReconstructionClaimMaterial";

import type {
  RunHsppReservoirScheduledPairReevaluationResult,
} from "@/lib/hspp/runHsppReservoirScheduledPairReevaluation";


export const HSPP_SCHEDULED_PAIR_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RUNNER_VERSION =
  "hspp-scheduled-pair-reconstruction-execution-intent-claim-v2-runner-v1" as const;


export type RunHsppScheduledPairReconstructionExecutionIntentClaimV2Input = {
  /**
   * Trusted service-role client.
   *
   * This producer performs no direct database call other than through
   * the already-certified successor claim wrapper.
   */
  supabase:
    SupabaseClient;

  /**
   * One already-computed scheduled-pair reevaluation result.
   *
   * This producer does not schedule pairs and does not rerun
   * current-evidence revalidation or semantic reevaluation.
   */
  scheduledReevaluationResult:
    RunHsppReservoirScheduledPairReevaluationResult;

  /**
   * Caller-owned proposed child UUID.
   *
   * Canonical child recovery remains database-authoritative.
   */
  proposedChildAssemblyId:
    string;

  /**
   * Caller-owned reconstruction policy.
   */
  reconstructionPolicyVersion:
    string;

  reconstructionReason:
    string;
};


export type RunHsppScheduledPairReconstructionExecutionIntentClaimV2Result =
  | {
      runnerVersion:
        typeof HSPP_SCHEDULED_PAIR_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RUNNER_VERSION;

      state:
        "NO_RECONSTRUCTION_CLAIM";

      organizationId:
        string;

      claim:
        null;
    }
  | {
      runnerVersion:
        typeof HSPP_SCHEDULED_PAIR_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RUNNER_VERSION;

      state:
        "RECONSTRUCTION_INTENT_V2_CLAIMED";

      organizationId:
        string;

      claim:
        ClaimedHsppReconstructionExecutionIntentV2;
    };


/**
 * Dedicated SCHEDULED_PAIR successor durable-intent producer.
 *
 * Authority boundaries:
 *
 * - consumes one already-computed scheduled-pair reevaluation result;
 * - converts it through the existing neutral downstream snapshot;
 * - resolves semantic reconstruction material through the existing
 *   producer-neutral selection resolver;
 * - preserves the scheduler's exact pair scheduling version;
 * - identifies the producer source as SCHEDULED_PAIR;
 * - forces discovery provenance to null;
 * - invokes the existing successor durable claim wrapper at most once.
 *
 * This runner deliberately does NOT:
 *
 * - read or generate a pair page;
 * - schedule pairs;
 * - rerun endpoint revalidation;
 * - rerun semantic reevaluation;
 * - mutate or advance the pair cursor;
 * - perform pair cursor CAS;
 * - generate a UUID;
 * - resolve reconstruction policy;
 * - activate API, cron, queue or worker behavior;
 * - execute reconstruction;
 * - modify the B07B producer.
 */
export async function runHsppScheduledPairReconstructionExecutionIntentClaimV2({
  supabase,
  scheduledReevaluationResult,
  proposedChildAssemblyId,
  reconstructionPolicyVersion,
  reconstructionReason,
}: RunHsppScheduledPairReconstructionExecutionIntentClaimV2Input): Promise<RunHsppScheduledPairReconstructionExecutionIntentClaimV2Result> {
  const snapshot =
    createHsppReservoirDownstreamSnapshotFromScheduledPairs(
      scheduledReevaluationResult,
    );


  const claimMaterial =
    resolveHsppReconstructionSelectionMaterialFromSnapshot({
      snapshot,
    });


  if (!claimMaterial) {
    return {
      runnerVersion:
        HSPP_SCHEDULED_PAIR_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RUNNER_VERSION,

      state:
        "NO_RECONSTRUCTION_CLAIM",

      organizationId:
        snapshot.organizationId,

      claim:
        null,
    };
  }


  const claim =
    await claimHsppReconstructionExecutionIntentV2({
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

      selection: {
        selectionSource:
          "SCHEDULED_PAIR",

        discoveryPolicyVersion:
          null,

        pairSchedulingVersion:
          scheduledReevaluationResult
            .pairPage
            .schedulingVersion,
      },

      reservoirEligibilityPolicyVersion:
        claimMaterial.reservoirEligibilityPolicyVersion,

      reevaluationPolicyVersion:
        claimMaterial.reevaluationPolicyVersion,

      membershipPolicyVersion:
        claimMaterial.membershipPolicyVersion,

      reconstructionPolicyVersion,

      reconstructionReason,
    });


  return {
    runnerVersion:
      HSPP_SCHEDULED_PAIR_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RUNNER_VERSION,

    state:
      "RECONSTRUCTION_INTENT_V2_CLAIMED",

    organizationId:
      claim.organizationId,

    claim,
  };
}