import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_PERSISTENCE_REASON,
  evaluateHsppPostPositiveMemberUnsuitability,
  type HsppPostPositiveMemberUnsuitabilityDecision,
} from "@/lib/hspp/evaluateHsppPostPositiveMemberUnsuitability";

import {
  acquireHsppAssemblyAssessmentExecutionLease,
  releaseHsppAssemblyAssessmentExecutionLease,
} from "@/lib/hspp/hsppAssemblyAssessmentExecutionLease";

import {
  persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease,
  type PersistedHsppMemberUnsuitabilityCheckpoint,
} from "@/lib/hspp/persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease";

import {
  readAndVerifyHsppEvidence,
} from "@/lib/hspp/readAndVerifyHsppEvidence";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "@/lib/hspp/readHsppPostPositiveLifecycleWorkItems";

export const HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_ASSESSMENT_RUNNER_VERSION =
  "hspp-post-positive-member-unsuitability-assessment-runner-v1" as const;

export type RunHsppPostPositiveMemberUnsuitabilityAssessmentInput = {
  supabase:
    SupabaseClient;

  workItem:
    HsppPostPositiveLifecycleWorkItem;

  /**
   * Caller-owned fresh execution-ownership identity.
   *
   * The runner does not generate UUIDs.
   */
  leaseToken:
    string;

  /**
   * Caller-owned execution-lease duration.
   */
  leaseSeconds:
    number;

  /**
   * Caller-owned stable post-positive observation time.
   *
   * The runner does not read wall-clock time.
   */
  observedAt:
    string;

  /**
   * Caller-owned stable decision time.
   *
   * This value is forwarded unchanged through the pure evaluator
   * and then, only for UNSUITABLE, through Q14x.
   */
  decidedAt:
    string;
};

export type HsppPostPositiveMemberUnsuitabilityLeaseReleaseSummary =
  | {
      state:
        "RELEASED" |
        "NOT_OWNER";

      error:
        null;
    }
  | {
      state:
        "ERROR";

      error:
        string;
    };

export type RunHsppPostPositiveMemberUnsuitabilityAssessmentResult = {
  runnerVersion:
    typeof HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_ASSESSMENT_RUNNER_VERSION;

  branch:
    | "LEASE_BUSY"
    | "SUITABLE"
    | "INDETERMINATE"
    | "UNSUITABILITY_CHECKPOINT_PERSISTED";

  organizationId:
    string;

  assemblyId:
    string;

  membershipId:
    string;

  evidenceId:
    string;

  decision:
    HsppPostPositiveMemberUnsuitabilityDecision | null;

  checkpoint:
    PersistedHsppMemberUnsuitabilityCheckpoint | null;

  busyUntil:
    string | null;

  leaseRelease:
    HsppPostPositiveMemberUnsuitabilityLeaseReleaseSummary | null;
};

export type HsppPostPositiveMemberUnsuitabilityAssessmentRunnerDependencies = {
  acquireLease:
    typeof acquireHsppAssemblyAssessmentExecutionLease;

  releaseLease:
    typeof releaseHsppAssemblyAssessmentExecutionLease;

  readEvidence:
    typeof readAndVerifyHsppEvidence;

  evaluate:
    typeof evaluateHsppPostPositiveMemberUnsuitability;

  persistUnsuitability:
    typeof persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease;
};

const DEFAULT_DEPENDENCIES:
  HsppPostPositiveMemberUnsuitabilityAssessmentRunnerDependencies = {
    acquireLease:
      acquireHsppAssemblyAssessmentExecutionLease,

    releaseLease:
      releaseHsppAssemblyAssessmentExecutionLease,

    readEvidence:
      readAndVerifyHsppEvidence,

    evaluate:
      evaluateHsppPostPositiveMemberUnsuitability,

    persistUnsuitability:
      persistHsppMemberUnsuitabilityCheckpointUnderExecutionLease,
  };

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(
        error ||
          "HSPP post-positive lease release failed.",
      );
}

function requireReevaluationWork(
  workItem:
    HsppPostPositiveLifecycleWorkItem,
): void {
  if (
    !workItem ||
    typeof workItem !== "object"
  ) {
    throw new Error(
      "Post-positive lifecycle work item is required.",
    );
  }

  if (
    workItem.workState !==
    "REEVALUATION_REQUIRED"
  ) {
    throw new Error(
      "Post-positive member-unsuitability runner requires REEVALUATION_REQUIRED work.",
    );
  }

  if (
    workItem.unsuitabilityCheckpointId !== null ||
    workItem.unsuitabilityObservedAt !== null ||
    workItem.unsuitabilityDecidedAt !== null
  ) {
    throw new Error(
      "REEVALUATION_REQUIRED work must not already contain persisted Q14v authority.",
    );
  }
}

function assertDecisionIdentity(
  workItem:
    HsppPostPositiveLifecycleWorkItem,

  decision:
    HsppPostPositiveMemberUnsuitabilityDecision,
): void {
  if (
    decision.organizationId !==
    workItem.organizationId
  ) {
    throw new Error(
      "Post-positive evaluator returned the wrong organization.",
    );
  }

  if (
    decision.assemblyId !==
    workItem.assemblyId
  ) {
    throw new Error(
      "Post-positive evaluator returned the wrong assembly.",
    );
  }

  if (
    decision.membershipId !==
    workItem.membershipId
  ) {
    throw new Error(
      "Post-positive evaluator returned the wrong membership.",
    );
  }

  if (
    decision.evidenceId !==
    workItem.evidenceId
  ) {
    throw new Error(
      "Post-positive evaluator returned the wrong evidence.",
    );
  }

  if (
    decision.integrityFingerprint !==
    workItem.integrityFingerprint
  ) {
    throw new Error(
      "Post-positive evaluator returned the wrong historical integrity fingerprint.",
    );
  }
}

/**
 * Dormant Q14 single-work-item runtime bridge.
 *
 * Authority order:
 *
 * 1. Accept only one already-discovered REEVALUATION_REQUIRED item.
 * 2. Acquire the caller-owned assembly execution lease.
 * 3. Read and independently verify the current evidence.
 * 4. Evaluate the pure descendant-composition policy.
 * 5. SUITABLE and INDETERMINATE perform no Q14x write.
 * 6. Only UNSUITABLE may persist Q14x under the same live lease.
 * 7. Verify that PostgreSQL resolved the same prior Q14p checkpoint
 *    discovered by the work reader.
 * 8. Release the execution lease.
 *
 * This runner does not:
 *
 * - discover work;
 * - generate time;
 * - generate UUIDs;
 * - persist Q14ac cessation;
 * - alter Reservoir state;
 * - select replacement evidence;
 * - reconstruct H2;
 * - invoke cron.
 */
export async function runHsppPostPositiveMemberUnsuitabilityAssessment(
  {
    supabase,
    workItem,
    leaseToken,
    leaseSeconds,
    observedAt,
    decidedAt,
  }: RunHsppPostPositiveMemberUnsuitabilityAssessmentInput,

  dependencies:
    HsppPostPositiveMemberUnsuitabilityAssessmentRunnerDependencies =
      DEFAULT_DEPENDENCIES,
): Promise<RunHsppPostPositiveMemberUnsuitabilityAssessmentResult> {
  requireReevaluationWork(
    workItem,
  );

  const leaseAcquisition =
    await dependencies.acquireLease({
      supabase,
      organizationId:
        workItem.organizationId,
      assemblyId:
        workItem.assemblyId,
      leaseToken,
      leaseSeconds,
    });

  if (
    leaseAcquisition.state === "BUSY" ||
    leaseAcquisition.state === "CONTENDED"
  ) {
    return {
      runnerVersion:
        HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_ASSESSMENT_RUNNER_VERSION,

      branch:
        "LEASE_BUSY",

      organizationId:
        workItem.organizationId,

      assemblyId:
        workItem.assemblyId,

      membershipId:
        workItem.membershipId,

      evidenceId:
        workItem.evidenceId,

      decision:
        null,

      checkpoint:
        null,

      busyUntil:
        leaseAcquisition.state === "BUSY"
          ? leaseAcquisition.expiresAt
          : null,

      leaseRelease:
        null,
    };
  }

  if (
    leaseAcquisition.leaseToken !==
    leaseToken
  ) {
    throw new Error(
      "Acquired post-positive execution lease did not preserve the caller-owned lease token.",
    );
  }

  let branch:
    | "SUITABLE"
    | "INDETERMINATE"
    | "UNSUITABILITY_CHECKPOINT_PERSISTED"
    | null =
      null;

  let decision:
    HsppPostPositiveMemberUnsuitabilityDecision | null =
      null;

  let checkpoint:
    PersistedHsppMemberUnsuitabilityCheckpoint | null =
      null;

  let leaseRelease:
    HsppPostPositiveMemberUnsuitabilityLeaseReleaseSummary | null =
      null;

  let primaryFailed =
    false;

  let primaryError:
    unknown =
      null;

  try {
    try {
      const currentEvidence =
        await dependencies.readEvidence({
          supabase,
          organizationId:
            workItem.organizationId,
          evidenceId:
            workItem.evidenceId,
        });

      decision =
        dependencies.evaluate({
          workItem,
          currentEvidence,
          observedAt,
          decidedAt,
        });

      assertDecisionIdentity(
        workItem,
        decision,
      );

      if (
        decision.state ===
        "SUITABLE"
      ) {
        if (
          decision.persistenceReason !==
          null
        ) {
          throw new Error(
            "SUITABLE post-positive decision must not expose Q14v persistence authority.",
          );
        }

        branch =
          "SUITABLE";
      }
      else if (
        decision.state ===
        "INDETERMINATE"
      ) {
        if (
          decision.persistenceReason !==
          null
        ) {
          throw new Error(
            "INDETERMINATE post-positive decision must not expose Q14v persistence authority.",
          );
        }

        branch =
          "INDETERMINATE";
      }
      else if (
        decision.state ===
        "UNSUITABLE"
      ) {
        if (
          decision.persistenceReason !==
          HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_PERSISTENCE_REASON
        ) {
          throw new Error(
            "UNSUITABLE post-positive decision does not expose the exact Q14v persistence reason.",
          );
        }

        checkpoint =
          await dependencies.persistUnsuitability({
            supabase,

            organizationId:
              decision.organizationId,

            assemblyId:
              decision.assemblyId,

            leaseToken:
              leaseAcquisition.leaseToken,

            evidenceId:
              decision.evidenceId,

            integrityFingerprint:
              decision.integrityFingerprint,

            observedAt:
              decision.observedAt,

            decidedAt:
              decision.decidedAt,
          });

        if (
          checkpoint.priorPositiveCheckpointId !==
          workItem.positiveCheckpointId
        ) {
          throw new Error(
            "Persisted Q14v checkpoint resolved a different prior positive checkpoint than discovery.",
          );
        }

        branch =
          "UNSUITABILITY_CHECKPOINT_PERSISTED";
      }
      else {
        throw new Error(
          "Post-positive evaluator returned an unsupported decision state.",
        );
      }
    }
    catch (error: unknown) {
      primaryFailed =
        true;

      primaryError =
        error;
    }
  }
  finally {
    try {
      const release =
        await dependencies.releaseLease({
          supabase,

          organizationId:
            workItem.organizationId,

          assemblyId:
            workItem.assemblyId,

          leaseToken:
            leaseAcquisition.leaseToken,
        });

      leaseRelease = {
        state:
          release.state,

        error:
          null,
      };
    }
    catch (error: unknown) {
      /*
       * Q14x is durable if it already succeeded.
       *
       * A release failure must not reinterpret a successfully persisted
       * unsuitability checkpoint as a failed persistence attempt. The
       * bounded execution lease still expires according to its persisted
       * lease authority.
       */
      leaseRelease = {
        state:
          "ERROR",

        error:
          errorMessage(
            error,
          ),
      };
    }
  }

  if (primaryFailed) {
    throw primaryError;
  }

  if (
    branch === null ||
    decision === null ||
    leaseRelease === null
  ) {
    throw new Error(
      "Post-positive member-unsuitability runner reached an incomplete terminal state.",
    );
  }

  if (
    branch !==
      "UNSUITABILITY_CHECKPOINT_PERSISTED" &&
    checkpoint !==
      null
  ) {
    throw new Error(
      "Non-UNSUITABLE post-positive branch unexpectedly produced a Q14v checkpoint.",
    );
  }

  if (
    branch ===
      "UNSUITABILITY_CHECKPOINT_PERSISTED" &&
    checkpoint ===
      null
  ) {
    throw new Error(
      "UNSUITABLE post-positive branch did not produce its Q14v checkpoint.",
    );
  }

  return {
    runnerVersion:
      HSPP_POST_POSITIVE_MEMBER_UNSUITABILITY_ASSESSMENT_RUNNER_VERSION,

    branch,

    organizationId:
      workItem.organizationId,

    assemblyId:
      workItem.assemblyId,

    membershipId:
      workItem.membershipId,

    evidenceId:
      workItem.evidenceId,

    decision,

    checkpoint,

    busyUntil:
      null,

    leaseRelease,
  };
}
