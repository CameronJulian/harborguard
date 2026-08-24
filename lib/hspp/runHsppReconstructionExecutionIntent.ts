import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,
} from "./claimHsppReconstructionExecutionIntent";

import type {
  HsppReconstructionExecutionIntent,
} from "./readHsppReconstructionExecutionIntents";

import {
  readHsppReconstructionIntentReplacementCandidate,
} from "./readHsppReconstructionIntentReplacementCandidate";

import {
  readHsppEvidenceAssemblyReconstructionRecovery,
} from "./readHsppEvidenceAssemblyReconstructionRecovery";

import type {
  HsppEvidenceAssemblyReconstructionRecoverySnapshot,
} from "./readHsppEvidenceAssemblyReconstructionRecovery";

import {
  readHsppHistoricalReconstructionContexts,
} from "./readHsppHistoricalReconstructionContexts";

import {
  readHsppSealedEvidenceAssembly,
} from "./readHsppSealedEvidenceAssembly";

import {
  planHsppEvidenceAssemblyReconstructionMembers,
} from "./planHsppEvidenceAssemblyReconstructionMembers";

import {
  persistHsppEvidenceAssemblyReconstruction,
} from "./persistHsppEvidenceAssemblyReconstruction";

import {
  HSPP_EVIDENCE_ASSEMBLY_VERSION,
} from "./persistHsppEvidenceAssembly";

import {
  verifyHsppEvidenceAssemblyReconstructionRecoveryImmutableEquivalence,
} from "./verifyHsppEvidenceAssemblyReconstructionRecoveryEquivalence";


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_RUNNER_VERSION =
  "hspp-reconstruction-execution-intent-runner-v1" as const;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


export type RunHsppReconstructionExecutionIntentInput = {
  /**
   * Trusted service-role Supabase client.
   *
   * Q14ag31M does not create a client and does not elevate authority.
   */
  supabase: SupabaseClient;

  /**
   * Exactly one already-read immutable Q14ag31F execution intent.
   *
   * This runner never discovers or claims intents itself.
   */
  intent: HsppReconstructionExecutionIntent;
};


type RunHsppReconstructionExecutionIntentCommon = {
  runnerVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_RUNNER_VERSION;

  intentId: string;

  organizationId: string;

  childAssemblyId: string;

  historicalEvidenceId: string;

  replacementEvidenceId: string;

  discoveryPolicyVersion: string;

  reevaluationPolicyVersion: string;

  membershipPolicyVersion: string;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;

  initialPersistenceState:
    HsppReconstructionExecutionIntent["persistenceState"];
};


export type RunHsppReconstructionExecutionIntentResult =
  | (
      RunHsppReconstructionExecutionIntentCommon & {
        state:
          "RECONSTRUCTION_RECOVERED";

        parentAssemblyId: string;

        reconstructionId: string;

        assemblyState:
          | "OPEN"
          | "SEALED";

        idempotentRecovery:
          null;

        memberCount: number;
      }
    )
  | (
      RunHsppReconstructionExecutionIntentCommon & {
        state:
          "RECONSTRUCTION_PERSISTED";

        parentAssemblyId: string;

        reconstructionId: string;

        assemblyState:
          "OPEN";

        idempotentRecovery:
          boolean;

        memberCount: number;
      }
    );


function requireNonBlank(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !==
      "string" ||
    value.trim().length ===
      0
  ) {
    throw new Error(
      `${fieldName} must be a non-blank string.`,
    );
  }

  return value.trim();
}


function requireSha256(
  value: unknown,
  fieldName: string,
): string {
  const fingerprint =
    requireNonBlank(
      value,
      fieldName,
    );

  if (
    !SHA256_PATTERN.test(
      fingerprint,
    )
  ) {
    throw new Error(
      `${fieldName} must be a lowercase SHA-256 fingerprint.`,
    );
  }

  return fingerprint;
}


/**
 * Revalidate the already-read durable intent as an execution input.
 *
 * Q14ag31F remains the durable read authority. This function does not
 * re-read or reinterpret mutable Reservoir state.
 */
function validateExecutionIntent(
  rawIntent:
    HsppReconstructionExecutionIntent,
): HsppReconstructionExecutionIntent {
  if (
    !rawIntent ||
    typeof rawIntent !==
      "object"
  ) {
    throw new Error(
      "A durable reconstruction execution intent is required.",
    );
  }

  const intent =
    rawIntent as
      HsppReconstructionExecutionIntent;

  requireNonBlank(
    intent.intentId,
    "intent.intentId",
  );

  requireNonBlank(
    intent.organizationId,
    "intent.organizationId",
  );

  requireNonBlank(
    intent.childAssemblyId,
    "intent.childAssemblyId",
  );

  const selectedFirstEvidenceId =
    requireNonBlank(
      intent.selectedFirstEvidenceId,
      "intent.selectedFirstEvidenceId",
    );

  const selectedSecondEvidenceId =
    requireNonBlank(
      intent.selectedSecondEvidenceId,
      "intent.selectedSecondEvidenceId",
    );

  const historicalEvidenceId =
    requireNonBlank(
      intent.historicalEvidenceId,
      "intent.historicalEvidenceId",
    );

  const replacementEvidenceId =
    requireNonBlank(
      intent.replacementEvidenceId,
      "intent.replacementEvidenceId",
    );

  requireSha256(
    intent.historicalEvidenceIntegrityFingerprint,
    "intent.historicalEvidenceIntegrityFingerprint",
  );

  requireSha256(
    intent.replacementEvidenceIntegrityFingerprint,
    "intent.replacementEvidenceIntegrityFingerprint",
  );

  requireNonBlank(
    intent.discoveryPolicyVersion,
    "intent.discoveryPolicyVersion",
  );

  requireNonBlank(
    intent.reevaluationPolicyVersion,
    "intent.reevaluationPolicyVersion",
  );

  requireNonBlank(
    intent.membershipPolicyVersion,
    "intent.membershipPolicyVersion",
  );

  requireNonBlank(
    intent.reconstructionPolicyVersion,
    "intent.reconstructionPolicyVersion",
  );

  requireNonBlank(
    intent.reconstructionReason,
    "intent.reconstructionReason",
  );

  requireNonBlank(
    intent.createdAt,
    "intent.createdAt",
  );

  if (
    intent.intentVersion !==
    HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION
  ) {
    throw new Error(
      "Durable reconstruction execution intent version does not match the closed execution-intent authority.",
    );
  }

  if (
    historicalEvidenceId ===
    replacementEvidenceId
  ) {
    throw new Error(
      "Durable reconstruction historical and replacement evidence identities must be distinct.",
    );
  }

  const selectedEvidenceIds =
    new Set([
      selectedFirstEvidenceId,
      selectedSecondEvidenceId,
    ]);

  if (
    selectedEvidenceIds.size !==
      2 ||
    !selectedEvidenceIds.has(
      historicalEvidenceId,
    ) ||
    !selectedEvidenceIds.has(
      replacementEvidenceId,
    )
  ) {
    throw new Error(
      "Durable reconstruction selected evidence pair does not exactly contain the historical and replacement evidence identities.",
    );
  }

  if (
    intent.persistenceState ===
    "CLAIMED_NOT_PERSISTED"
  ) {
    if (
      intent.reconstructionId !==
        null ||
      intent.parentAssemblyId !==
        null ||
      intent.assemblyState !==
        null ||
      intent.sealedAt !==
        null
    ) {
      throw new Error(
        "CLAIMED_NOT_PERSISTED durable intent contains contradictory persisted reconstruction state.",
      );
    }

    return intent;
  }

  if (
    intent.persistenceState !==
    "RECONSTRUCTION_PERSISTED"
  ) {
    throw new Error(
      "Durable reconstruction execution intent has an unsupported persistence state.",
    );
  }

  requireNonBlank(
    intent.reconstructionId,
    "intent.reconstructionId",
  );

  requireNonBlank(
    intent.parentAssemblyId,
    "intent.parentAssemblyId",
  );

  if (
    intent.assemblyState !==
      "OPEN" &&
    intent.assemblyState !==
      "SEALED"
  ) {
    throw new Error(
      "RECONSTRUCTION_PERSISTED intent must record OPEN or SEALED assembly state.",
    );
  }

  if (
    intent.assemblyState ===
    "OPEN"
  ) {
    if (
      intent.sealedAt !==
      null
    ) {
      throw new Error(
        "OPEN durable reconstruction intent must not record sealedAt.",
      );
    }
  }
  else {
    requireNonBlank(
      intent.sealedAt,
      "intent.sealedAt",
    );
  }

  return intent;
}


function makeCommonResult(
  intent:
    HsppReconstructionExecutionIntent,
): RunHsppReconstructionExecutionIntentCommon {
  return {
    runnerVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_RUNNER_VERSION,

    intentId:
      intent.intentId,

    organizationId:
      intent.organizationId,

    childAssemblyId:
      intent.childAssemblyId,

    historicalEvidenceId:
      intent.historicalEvidenceId,

    replacementEvidenceId:
      intent.replacementEvidenceId,

    discoveryPolicyVersion:
      intent.discoveryPolicyVersion,

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


function assertPersistedIntentRecoveryCompatibility(
  intent:
    HsppReconstructionExecutionIntent,
  recovery:
    HsppEvidenceAssemblyReconstructionRecoverySnapshot,
): void {
  if (
    intent.persistenceState !==
    "RECONSTRUCTION_PERSISTED"
  ) {
    return;
  }

  if (
    recovery.reconstructionId !==
    intent.reconstructionId
  ) {
    throw new Error(
      "Recovered reconstruction identity does not match the durable persisted intent.",
    );
  }

  if (
    recovery.parentAssemblyId !==
    intent.parentAssemblyId
  ) {
    throw new Error(
      "Recovered parent assembly does not match the durable persisted intent.",
    );
  }

  /*
   * OPEN -> SEALED progression is allowed between the Q14ag31E snapshot
   * and this execution attempt. SEALED -> OPEN regression is not.
   */
  if (
    intent.assemblyState ===
      "SEALED" &&
    recovery.assemblyState !==
      "SEALED"
  ) {
    throw new Error(
      "Recovered reconstruction regressed from durable SEALED state.",
    );
  }

  if (
    intent.assemblyState ===
      "SEALED" &&
    recovery.sealedAt !==
      intent.sealedAt
  ) {
    throw new Error(
      "Recovered SEALED timestamp does not match the durable persisted intent.",
    );
  }
}


/**
 * One exact canonical-child recovery attempt.
 *
 * NOT_FOUND returns null.
 *
 * FOUND never rehydrates mutable Reservoir candidate state. It verifies
 * only the immutable durable identities/provenance captured by Q14ag31A
 * against Q14ag22B recovery and the immutable SEALED H1.
 */
async function recoverDurableIntent({
  supabase,
  intent,
}: {
  supabase: SupabaseClient;

  intent:
    HsppReconstructionExecutionIntent;
}): Promise<RunHsppReconstructionExecutionIntentResult | null> {
  const recoveryRead =
    await readHsppEvidenceAssemblyReconstructionRecovery({
      supabase,

      organizationId:
        intent.organizationId,

      childAssemblyId:
        intent.childAssemblyId,
    });

  if (
    recoveryRead.state ===
    "NOT_FOUND"
  ) {
    return null;
  }

  const recovery =
    recoveryRead.reconstruction;

  if (
    recovery.assemblyVersion !==
    HSPP_EVIDENCE_ASSEMBLY_VERSION
  ) {
    throw new Error(
      "Recovered reconstruction assembly version does not match the canonical HSPP evidence-assembly version.",
    );
  }

  assertPersistedIntentRecoveryCompatibility(
    intent,
    recovery,
  );

  const parentAssembly =
    await readHsppSealedEvidenceAssembly({
      supabase,

      organizationId:
        intent.organizationId,

      assemblyId:
        recovery.parentAssemblyId,
    });

  const verification =
    verifyHsppEvidenceAssemblyReconstructionRecoveryImmutableEquivalence({
      organizationId:
        intent.organizationId,

      childAssemblyId:
        intent.childAssemblyId,

      historicalEvidenceId:
        intent.historicalEvidenceId,

      historicalEvidenceIntegrityFingerprint:
        intent.historicalEvidenceIntegrityFingerprint,

      replacementEvidenceId:
        intent.replacementEvidenceId,

      replacementEvidenceIntegrityFingerprint:
        intent.replacementEvidenceIntegrityFingerprint,

      membershipPolicyVersion:
        intent.membershipPolicyVersion,

      reconstructionPolicyVersion:
        intent.reconstructionPolicyVersion,

      reconstructionReason:
        intent.reconstructionReason,

      parentAssembly,

      recovery,
    });

  return {
    ...makeCommonResult(
      intent,
    ),

    state:
      "RECONSTRUCTION_RECOVERED",

    parentAssemblyId:
      verification.parentAssemblyId,

    reconstructionId:
      recovery.reconstructionId,

    assemblyState:
      verification.assemblyState,

    idempotentRecovery:
      null,

    memberCount:
      verification.memberCount,
  };
}


/**
 * Q14ag31M isolated durable reconstruction-intent execution runner.
 *
 * This runner closes the fresh-process/crash-recovery gap without
 * re-running mutable Reservoir discovery or B07A/B07B selection.
 *
 * Required order:
 *
 * 1. validate one already-read durable intent;
 * 2. ALWAYS Q14ag22B-preflight the canonical child UUID;
 * 3. FOUND -> SEALED H1 + Q14ag31K immutable recovery proof;
 * 4. NOT_FOUND + persisted intent -> fail closed;
 * 5. NOT_FOUND + claimed intent -> exact Q14ag31H replacement hydration;
 * 6. exact one-ID Q14ag16C historical context;
 * 7. bounded recovery recheck if context disappeared;
 * 8. SEALED H1 + Q14ag18B planner + Q14ag16A/Q14h persistence;
 * 9. bounded same-child recovery fallback if persistence is ambiguous.
 *
 * This runner deliberately does NOT:
 *
 * - discover or claim intents;
 * - scan or rank the Reservoir;
 * - rerun B06B, B07A or B07B;
 * - generate child UUIDs;
 * - directly invoke Supabase table APIs or RPCs;
 * - seal or assess H2;
 * - mutate trust or Reservoir state;
 * - grant downstream authority;
 * - create API, cron, queue or scheduler wiring.
 */
export async function runHsppReconstructionExecutionIntent({
  supabase,
  intent: rawIntent,
}: RunHsppReconstructionExecutionIntentInput): Promise<RunHsppReconstructionExecutionIntentResult> {
  const intent =
    validateExecutionIntent(
      rawIntent,
    );

  /*
   * Recovery is the first external lifecycle authority for every
   * durable intent, regardless of the reader's derived persistence state.
   */
  const initialRecovery =
    await recoverDurableIntent({
      supabase,
      intent,
    });

  if (initialRecovery) {
    return initialRecovery;
  }

  if (
    intent.persistenceState ===
    "RECONSTRUCTION_PERSISTED"
  ) {
    throw new Error(
      "Durable intent claims a persisted reconstruction but canonical child recovery returned NOT_FOUND.",
    );
  }

  /*
   * Only CLAIMED_NOT_PERSISTED reaches mutable replacement hydration.
   * The exact durable replacement identity is never rediscovered/ranked.
   */
  const replacementRead =
    await readHsppReconstructionIntentReplacementCandidate({
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
      "Exact durable replacement hydration returned a different organization.",
    );
  }

  if (
    replacementRead.replacementEvidenceId !==
    intent.replacementEvidenceId
  ) {
    throw new Error(
      "Exact durable replacement hydration returned a different evidence identity.",
    );
  }

  const contextRead =
    await readHsppHistoricalReconstructionContexts({
      supabase,

      organizationId:
        intent.organizationId,

      evidenceIds: [
        intent.historicalEvidenceId,
      ],
    });

  if (
    contextRead.organizationId !==
    intent.organizationId
  ) {
    throw new Error(
      "Historical reconstruction context organization does not match the durable intent.",
    );
  }

  if (
    contextRead.requestedEvidenceIds.length !==
      1 ||
    contextRead.requestedEvidenceIds[0] !==
      intent.historicalEvidenceId
  ) {
    throw new Error(
      "Historical reconstruction context read did not preserve the exact durable historical evidence identity.",
    );
  }

  if (
    contextRead.contexts.length ===
    0
  ) {
    /*
     * The child may have been persisted after our initial NOT_FOUND,
     * causing Q14ag14 to stop exposing the old H1 as actionable.
     */
    const recoveredAfterContextLoss =
      await recoverDurableIntent({
        supabase,
        intent,
      });

    if (
      recoveredAfterContextLoss
    ) {
      return recoveredAfterContextLoss;
    }

    throw new Error(
      "Durable reconstruction intent lost actionable historical context without a recoverable canonical child.",
    );
  }

  if (
    contextRead.contexts.length !==
    1
  ) {
    throw new Error(
      "Exactly one actionable historical reconstruction context is required for a durable reconstruction intent.",
    );
  }

  if (
    contextRead.noContextEvidenceIds.length !==
    0
  ) {
    throw new Error(
      "Historical reconstruction context read returned contradictory context and no-context state.",
    );
  }

  const historicalContext =
    contextRead.contexts[0];

  if (
    historicalContext.evidenceId !==
    intent.historicalEvidenceId
  ) {
    throw new Error(
      "Historical reconstruction context evidence identity does not match the durable intent.",
    );
  }

  if (
    historicalContext.evidenceIntegrityFingerprint !==
    intent.historicalEvidenceIntegrityFingerprint
  ) {
    throw new Error(
      "Historical reconstruction context fingerprint does not match the durable intent.",
    );
  }

  const parentAssembly =
    await readHsppSealedEvidenceAssembly({
      supabase,

      organizationId:
        intent.organizationId,

      assemblyId:
        historicalContext.parentAssemblyId,
    });

  const plan =
    planHsppEvidenceAssemblyReconstructionMembers({
      historicalContext,

      parentAssembly,

      replacementCandidate:
        replacementRead.candidate,
    });

  if (
    plan.parentAssemblyId !==
    historicalContext.parentAssemblyId
  ) {
    throw new Error(
      "Reconstruction plan parent does not match the exact historical context.",
    );
  }

  if (
    plan.historicalEvidenceId !==
    intent.historicalEvidenceId
  ) {
    throw new Error(
      "Reconstruction plan historical evidence does not match the durable intent.",
    );
  }

  if (
    plan.replacementEvidenceId !==
    intent.replacementEvidenceId
  ) {
    throw new Error(
      "Reconstruction plan replacement evidence does not match the durable intent.",
    );
  }

  try {
    const persistence =
      await persistHsppEvidenceAssemblyReconstruction({
        supabase,

        organizationId:
          intent.organizationId,

        parentAssemblyId:
          plan.parentAssemblyId,

        childAssemblyId:
          intent.childAssemblyId,

        membershipPolicyVersion:
          intent.membershipPolicyVersion,

        reconstructionPolicyVersion:
          intent.reconstructionPolicyVersion,

        reconstructionReason:
          intent.reconstructionReason,

        members:
          plan.members,
      });

    return {
      ...makeCommonResult(
        intent,
      ),

      state:
        "RECONSTRUCTION_PERSISTED",

      parentAssemblyId:
        persistence.parentAssemblyId,

      reconstructionId:
        persistence.reconstructionId,

      assemblyState:
        persistence.assemblyState,

      idempotentRecovery:
        persistence.idempotentRecovery,

      memberCount:
        persistence.persistedMemberCount,
    };
  }
  catch (persistenceError) {
    /*
     * Q14h may have committed successfully before a transport error, or
     * a same-child caller may have won the exact retry race. Recover only
     * this immutable canonical child and prove it through Q14ag31K.
     */
    const recoveredAfterPersistenceError =
      await recoverDurableIntent({
        supabase,
        intent,
      });

    if (
      recoveredAfterPersistenceError
    ) {
      return recoveredAfterPersistenceError;
    }

    throw persistenceError;
  }
}