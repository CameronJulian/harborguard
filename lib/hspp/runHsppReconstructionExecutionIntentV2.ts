import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  HsppReconstructionExecutionIntentV2,
} from "./readHsppReconstructionExecutionIntentsV2";

import {
  readHsppReconstructionIntentReplacementCandidate,
} from "./readHsppReconstructionIntentReplacementCandidate";

import {
  readHsppScheduledPairReconstructionIntentReplacementCandidate,
} from "./readHsppScheduledPairReconstructionIntentReplacementCandidate";

import {
  recoverDurableIntentCore,
  runHsppReconstructionPostHydrationExecutionCore,
  type HsppReconstructionExecutionIntentCore,
  type HsppReconstructionExecutionPostHydrationCoreResult,
} from "./runHsppReconstructionExecutionIntent";


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_V2_RUNNER_VERSION =
  "hspp-reconstruction-execution-intent-v2-runner-v1" as const;


export type RunHsppReconstructionExecutionIntentV2Input = {
  /**
   * Trusted service-role Supabase client.
   *
   * Q14ag33E3D does not create a client and does not elevate authority.
   */
  supabase:
    SupabaseClient;

  /**
   * Exactly one already-read immutable successor execution intent.
   *
   * Selection provenance was persisted before this execution boundary.
   * This runner never discovers, schedules or claims replacement pairs.
   */
  intent:
    HsppReconstructionExecutionIntentV2;
};


type RunHsppReconstructionExecutionIntentV2Common = {
  runnerVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_V2_RUNNER_VERSION;

  intentId:
    string;

  organizationId:
    string;

  childAssemblyId:
    string;

  selectedFirstEvidenceId:
    string;

  selectedSecondEvidenceId:
    string;

  historicalEvidenceId:
    string;

  replacementEvidenceId:
    string;

  selectionSource:
    HsppReconstructionExecutionIntentV2["selectionSource"];

  discoveryPolicyVersion:
    HsppReconstructionExecutionIntentV2["discoveryPolicyVersion"];

  pairSchedulingVersion:
    HsppReconstructionExecutionIntentV2["pairSchedulingVersion"];

  reservoirEligibilityPolicyVersion:
    HsppReconstructionExecutionIntentV2["reservoirEligibilityPolicyVersion"];

  reevaluationPolicyVersion:
    string;

  membershipPolicyVersion:
    string;

  reconstructionPolicyVersion:
    string;

  reconstructionReason:
    string;

  initialPersistenceState:
    HsppReconstructionExecutionIntentV2["persistenceState"];
};


export type RunHsppReconstructionExecutionIntentV2Result =
  RunHsppReconstructionExecutionIntentV2Common &
  HsppReconstructionExecutionPostHydrationCoreResult;


/**
 * Q14ag33E3D2 behavioral-test dependency seam.
 *
 * Production execution always uses DEFAULT_SUCCESSOR_EXECUTION_DEPENDENCIES.
 * The optional second parameter of the public runner exists only so the
 * isolated execution lifecycle can be tested without database or scheduler
 * activation.
 */
export type HsppReconstructionExecutionIntentV2Dependencies = {
  recoverDurableIntentCore:
    typeof recoverDurableIntentCore;

  readB07BReplacementCandidate:
    typeof readHsppReconstructionIntentReplacementCandidate;

  readScheduledPairReplacementCandidate:
    typeof readHsppScheduledPairReconstructionIntentReplacementCandidate;

  runPostHydrationExecutionCore:
    typeof runHsppReconstructionPostHydrationExecutionCore;
};


const DEFAULT_SUCCESSOR_EXECUTION_DEPENDENCIES:
  HsppReconstructionExecutionIntentV2Dependencies = {
    recoverDurableIntentCore,

    readB07BReplacementCandidate:
      readHsppReconstructionIntentReplacementCandidate,

    readScheduledPairReplacementCandidate:
      readHsppScheduledPairReconstructionIntentReplacementCandidate,

    runPostHydrationExecutionCore:
      runHsppReconstructionPostHydrationExecutionCore,
  };

function toSuccessorExecutionIntentCore(
  intent:
    HsppReconstructionExecutionIntentV2,
): HsppReconstructionExecutionIntentCore {
  return {
    intentId:
      intent.intentId,

    organizationId:
      intent.organizationId,

    childAssemblyId:
      intent.childAssemblyId,

    selectedFirstEvidenceId:
      intent.selectedFirstEvidenceId,

    selectedSecondEvidenceId:
      intent.selectedSecondEvidenceId,

    historicalEvidenceId:
      intent.historicalEvidenceId,

    historicalEvidenceIntegrityFingerprint:
      intent.historicalEvidenceIntegrityFingerprint,

    replacementEvidenceId:
      intent.replacementEvidenceId,

    replacementEvidenceIntegrityFingerprint:
      intent.replacementEvidenceIntegrityFingerprint,

    reevaluationPolicyVersion:
      intent.reevaluationPolicyVersion,

    membershipPolicyVersion:
      intent.membershipPolicyVersion,

    reconstructionPolicyVersion:
      intent.reconstructionPolicyVersion,

    reconstructionReason:
      intent.reconstructionReason,

    persistenceState:
      intent.persistenceState,

    reconstructionId:
      intent.reconstructionId,

    parentAssemblyId:
      intent.parentAssemblyId,

    assemblyState:
      intent.assemblyState,

    sealedAt:
      intent.sealedAt,

    createdAt:
      intent.createdAt,
  };
}


function makeSuccessorCommonResult(
  intent:
    HsppReconstructionExecutionIntentV2,
): RunHsppReconstructionExecutionIntentV2Common {
  return {
    runnerVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_V2_RUNNER_VERSION,

    intentId:
      intent.intentId,

    organizationId:
      intent.organizationId,

    childAssemblyId:
      intent.childAssemblyId,

    selectedFirstEvidenceId:
      intent.selectedFirstEvidenceId,

    selectedSecondEvidenceId:
      intent.selectedSecondEvidenceId,

    historicalEvidenceId:
      intent.historicalEvidenceId,

    replacementEvidenceId:
      intent.replacementEvidenceId,

    selectionSource:
      intent.selectionSource,

    discoveryPolicyVersion:
      intent.discoveryPolicyVersion,

    pairSchedulingVersion:
      intent.pairSchedulingVersion,

    reservoirEligibilityPolicyVersion:
      intent.reservoirEligibilityPolicyVersion,

    reevaluationPolicyVersion:
      intent.reevaluationPolicyVersion,

    membershipPolicyVersion:
      intent.membershipPolicyVersion,

    reconstructionPolicyVersion:
      intent.reconstructionPolicyVersion,

    reconstructionReason:
      intent.reconstructionReason,

    initialPersistenceState:
      intent.persistenceState,
  };
}


async function readSuccessorReplacementCandidate({
  supabase,
  intent,
  dependencies,
}: {
  supabase:
    SupabaseClient;

  intent:
    HsppReconstructionExecutionIntentV2;

  dependencies:
    HsppReconstructionExecutionIntentV2Dependencies;
}): Promise<
  Parameters<
    typeof runHsppReconstructionPostHydrationExecutionCore
  >[0]["replacementCandidate"]
> {
  if (
    intent.selectionSource ===
    "B07B_DISCOVERY"
  ) {
    const replacementRead =
      await dependencies.readB07BReplacementCandidate({
        supabase,

        organizationId:
          intent.organizationId,

        replacementEvidenceId:
          intent.replacementEvidenceId,

        replacementEvidenceIntegrityFingerprint:
          intent.replacementEvidenceIntegrityFingerprint,

        discoveryPolicyVersion:
          intent.discoveryPolicyVersion,
      });

    if (
      replacementRead.organizationId !==
      intent.organizationId
    ) {
      throw new Error(
        "B07B successor replacement hydration returned a different organization.",
      );
    }

    if (
      replacementRead.replacementEvidenceId !==
      intent.replacementEvidenceId
    ) {
      throw new Error(
        "B07B successor replacement hydration returned a different evidence identity.",
      );
    }

    return replacementRead.candidate;
  }

  if (
    intent.selectionSource ===
    "SCHEDULED_PAIR"
  ) {
    const replacementRead =
      await dependencies.readScheduledPairReplacementCandidate({
        supabase,

        organizationId:
          intent.organizationId,

        replacementEvidenceId:
          intent.replacementEvidenceId,

        replacementEvidenceIntegrityFingerprint:
          intent.replacementEvidenceIntegrityFingerprint,

        discoveryPolicyVersion:
          intent.discoveryPolicyVersion,

        pairSchedulingVersion:
          intent.pairSchedulingVersion,

        reservoirEligibilityPolicyVersion:
          intent.reservoirEligibilityPolicyVersion,
      });

    if (
      replacementRead.organizationId !==
      intent.organizationId
    ) {
      throw new Error(
        "Scheduled-PAIR successor replacement hydration returned a different organization.",
      );
    }

    if (
      replacementRead.replacementEvidenceId !==
      intent.replacementEvidenceId
    ) {
      throw new Error(
        "Scheduled-PAIR successor replacement hydration returned a different evidence identity.",
      );
    }

    return replacementRead.candidate;
  }

  const unreachable:
    never =
      intent;

  throw new Error(
    `Unsupported reconstruction selection source: ${String(unreachable)}`,
  );
}


/**
 * Q14ag33E3D isolated successor durable reconstruction-intent executor.
 *
 * Lifecycle:
 *
 * 1. recover the immutable durable child before producer-specific hydration;
 * 2. route only by persisted selectionSource;
 * 3. hydrate the exact already-selected replacement identity;
 * 4. converge both producer paths into the certified E3C2 core.
 *
 * This wrapper deliberately does NOT:
 *
 * - read pages of execution intents;
 * - claim durable intents;
 * - perform B07B discovery;
 * - schedule Reservoir pairs;
 * - reevaluate pair ordering;
 * - generate replacement identities;
 * - mutate durable intent provenance;
 * - create cycle, cron, queue or scheduler wiring.
 */
export async function runHsppReconstructionExecutionIntentV2({
  supabase,
  intent,
}: RunHsppReconstructionExecutionIntentV2Input,
dependencies:
  HsppReconstructionExecutionIntentV2Dependencies =
    DEFAULT_SUCCESSOR_EXECUTION_DEPENDENCIES,
): Promise<RunHsppReconstructionExecutionIntentV2Result> {
  const coreIntent =
    toSuccessorExecutionIntentCore(
      intent,
    );

  const initialRecovery =
    await dependencies.recoverDurableIntentCore({
      supabase,
      intent:
        coreIntent,
    });

  if (initialRecovery) {
    return {
      ...makeSuccessorCommonResult(
        intent,
      ),

      state:
        "RECONSTRUCTION_RECOVERED",

      parentAssemblyId:
        initialRecovery.parentAssemblyId,

      reconstructionId:
        initialRecovery.reconstructionId,

      assemblyState:
        initialRecovery.assemblyState,

      idempotentRecovery:
        null,

      memberCount:
        initialRecovery.memberCount,
    };
  }

  const replacementCandidate =
    await readSuccessorReplacementCandidate({
      supabase,
      intent,
      dependencies,
    });

  const execution =
    await dependencies.runPostHydrationExecutionCore({
      supabase,

      intent:
        coreIntent,

      replacementCandidate,
    });

  return {
    ...makeSuccessorCommonResult(
      intent,
    ),

    ...execution,
  };
}