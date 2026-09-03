import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  claimHsppReconstructionExecutionIntentV2,
  type ClaimedHsppReconstructionExecutionIntentV2,
} from "@/lib/hspp/claimHsppReconstructionExecutionIntentV2";

import {
  resolveHsppReconstructionClaimMaterial,
} from "@/lib/hspp/resolveHsppReconstructionClaimMaterial";

import type {
  RunHsppReservoirReevaluationResult,
} from "@/lib/hspp/runHsppReservoirReevaluation";


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RUNNER_VERSION =
  "hspp-reconstruction-execution-intent-claim-v2-runner-v1" as const;


export type RunHsppReconstructionExecutionIntentClaimV2Input = {
  /**
   * Trusted service-role Supabase client.
   *
   * This runner performs no direct database access.
   */
  supabase:
    SupabaseClient;

  organizationId:
    string;

  /**
   * One already-computed B07B snapshot.
   *
   * No mutable Reservoir discovery or reevaluation is rerun here.
   */
  reevaluationResult:
    RunHsppReservoirReevaluationResult;

  /**
   * Caller-owned child UUID.
   */
  proposedChildAssemblyId:
    string;

  reconstructionPolicyVersion:
    string;

  reconstructionReason:
    string;
};


export type RunHsppReconstructionExecutionIntentClaimV2Result =
  | {
      runnerVersion:
        typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RUNNER_VERSION;

      state:
        "NO_RECONSTRUCTION_CLAIM";

      organizationId:
        string;

      claim:
        null;
    }
  | {
      runnerVersion:
        typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RUNNER_VERSION;

      state:
        "RECONSTRUCTION_INTENT_V2_CLAIMED";

      organizationId:
        string;

      claim:
        ClaimedHsppReconstructionExecutionIntentV2;
    };


/**
 * Initial Q14ag34 successor durable-intent producer.
 *
 * This producer intentionally supports only the existing B07B discovery path.
 *
 * It:
 *
 * - consumes one already-computed B07B snapshot;
 * - reuses the canonical claim-material resolver exactly once;
 * - preserves the exact B07B pair orientation;
 * - carries producer-neutral B06A provenance from claim material;
 * - identifies selectionSource as B07B_DISCOVERY;
 * - sets pairSchedulingVersion to null;
 * - invokes the successor durable claim wrapper at most once.
 *
 * It deliberately does NOT:
 *
 * - run discovery;
 * - run reevaluation;
 * - schedule Reservoir pairs;
 * - advance pair cursors;
 * - generate a UUID;
 * - consume SCHEDULED_PAIR work;
 * - execute reconstruction;
 * - activate API, cron, queue or worker behavior;
 * - modify the legacy producer.
 */
export async function runHsppReconstructionExecutionIntentClaimV2({
  supabase,
  organizationId,
  reevaluationResult,
  proposedChildAssemblyId,
  reconstructionPolicyVersion,
  reconstructionReason,
}: RunHsppReconstructionExecutionIntentClaimV2Input): Promise<RunHsppReconstructionExecutionIntentClaimV2Result> {
  const claimMaterial =
    resolveHsppReconstructionClaimMaterial({
      organizationId,
      reevaluationResult,
    });

  if (!claimMaterial) {
    return {
      runnerVersion:
        HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RUNNER_VERSION,

      state:
        "NO_RECONSTRUCTION_CLAIM",

      organizationId:
        reevaluationResult.organizationId,

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
          "B07B_DISCOVERY",

        discoveryPolicyVersion:
          claimMaterial.discoveryPolicyVersion,

        pairSchedulingVersion:
          null,
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
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RUNNER_VERSION,

    state:
      "RECONSTRUCTION_INTENT_V2_CLAIMED",

    organizationId:
      claim.organizationId,

    claim,
  };
}
