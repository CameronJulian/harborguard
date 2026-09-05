import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  acquireHsppAssemblyAssessmentExecutionLease,
  releaseHsppAssemblyAssessmentExecutionLease,
} from "@/lib/hspp/hsppAssemblyAssessmentExecutionLease";

import {
  persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease,
  type PersistedHsppAssemblyMemberEffectiveCessation,
} from "@/lib/hspp/persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "@/lib/hspp/readHsppPostPositiveLifecycleWorkItems";

export const HSPP_POST_POSITIVE_MEMBER_EFFECTIVE_CESSATION_RUNNER_VERSION =
  "hspp-post-positive-member-effective-cessation-runner-v1" as const;

export type RunHsppPostPositiveMemberEffectiveCessationInput = {
  supabase:
    SupabaseClient;

  workItem:
    HsppPostPositiveLifecycleWorkItem;

  /**
   * Caller-owned fresh execution-ownership identity.
   *
   * This runner generates no UUID.
   */
  leaseToken:
    string;

  /**
   * Caller-owned execution-lease duration.
   */
  leaseSeconds:
    number;
};

export type HsppPostPositiveMemberEffectiveCessationLeaseReleaseSummary =
  | {
      state:
        "RELEASED" |
        "NOT_OWNER" |
        "CONTENDED";

      error:
        null;
    }
  | {
      state:
        "ERROR";

      error:
        string;
    };

export type RunHsppPostPositiveMemberEffectiveCessationResult = {
  runnerVersion:
    typeof HSPP_POST_POSITIVE_MEMBER_EFFECTIVE_CESSATION_RUNNER_VERSION;

  branch:
    | "LEASE_BUSY"
    | "CESSATION_PERSISTED";

  organizationId:
    string;

  assemblyId:
    string;

  membershipId:
    string;

  evidenceId:
    string;

  cessation:
    PersistedHsppAssemblyMemberEffectiveCessation | null;

  busyUntil:
    string | null;

  leaseRelease:
    HsppPostPositiveMemberEffectiveCessationLeaseReleaseSummary | null;
};

export type HsppPostPositiveMemberEffectiveCessationRunnerDependencies = {
  acquireLease:
    typeof acquireHsppAssemblyAssessmentExecutionLease;

  releaseLease:
    typeof releaseHsppAssemblyAssessmentExecutionLease;

  persistCessation:
    typeof persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease;
};

const DEFAULT_DEPENDENCIES:
  HsppPostPositiveMemberEffectiveCessationRunnerDependencies = {
    acquireLease:
      acquireHsppAssemblyAssessmentExecutionLease,

    releaseLease:
      releaseHsppAssemblyAssessmentExecutionLease,

    persistCessation:
      persistHsppAssemblyMemberEffectiveCessationUnderExecutionLease,
  };

function errorMessage(
  error: unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(
        error ||
          "HSPP post-positive cessation lease release failed.",
      );
}

function requireCessationWork(
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
    "CESSATION_REQUIRED"
  ) {
    throw new Error(
      "Post-positive member-effective-cessation runner requires CESSATION_REQUIRED work.",
    );
  }

  if (
    workItem.unsuitabilityCheckpointId ===
      null ||
    workItem.unsuitabilityObservedAt ===
      null ||
    workItem.unsuitabilityDecidedAt ===
      null
  ) {
    throw new Error(
      "CESSATION_REQUIRED work must expose complete persisted Q14v authority.",
    );
  }
}

function assertCessationIdentity(
  workItem:
    HsppPostPositiveLifecycleWorkItem,

  cessation:
    PersistedHsppAssemblyMemberEffectiveCessation,
): void {
  if (
    workItem.unsuitabilityCheckpointId ===
      null ||
    workItem.unsuitabilityDecidedAt ===
      null
  ) {
    throw new Error(
      "Complete Q14v authority disappeared during cessation validation.",
    );
  }

  if (
    cessation.organizationId !==
    workItem.organizationId
  ) {
    throw new Error(
      "Q14ac returned the wrong organization.",
    );
  }

  if (
    cessation.assemblyId !==
    workItem.assemblyId
  ) {
    throw new Error(
      "Q14ac returned the wrong assembly.",
    );
  }

  if (
    cessation.evidenceId !==
    workItem.evidenceId
  ) {
    throw new Error(
      "Q14ac returned the wrong evidence.",
    );
  }

  if (
    cessation.integrityFingerprint !==
    workItem.integrityFingerprint
  ) {
    throw new Error(
      "Q14ac returned the wrong historical integrity fingerprint.",
    );
  }

  if (
    cessation.historicalMembershipId !==
    workItem.membershipId
  ) {
    throw new Error(
      "Q14ac returned a different historical membership than discovery.",
    );
  }

  if (
    cessation.unsuitabilityCheckpointId !==
    workItem.unsuitabilityCheckpointId
  ) {
    throw new Error(
      "Q14ac returned a different Q14v checkpoint than discovery.",
    );
  }

  if (
    cessation.ceasedAt !==
    workItem.unsuitabilityDecidedAt
  ) {
    throw new Error(
      "Q14ac cessation time does not equal the persisted Q14v decision time.",
    );
  }
}

/**
 * Dormant Q14 CESSATION_REQUIRED single-work-item bridge.
 *
 * Authority order:
 *
 * 1. Accept only one already-discovered CESSATION_REQUIRED item.
 * 2. Require complete persisted Q14v identity from discovery.
 * 3. Acquire the caller-owned assembly execution lease.
 * 4. Persist/recover Q14ac using only scope, lease and Q14v identity.
 * 5. Verify Q14ac's database-derived historical identity.
 * 6. Release the execution lease.
 *
 * No post-positive timestamp is created here. Q14ab/Q14ac derive
 * ceasedAt from the exact persisted Q14v decidedAt.
 *
 * This runner does not:
 *
 * - discover work;
 * - evaluate unsuitability;
 * - invoke Q14x;
 * - generate time or UUIDs;
 * - return evidence to Reservoir;
 * - select replacement evidence;
 * - reconstruct H2;
 * - invoke cron.
 */
export async function runHsppPostPositiveMemberEffectiveCessation(
  {
    supabase,
    workItem,
    leaseToken,
    leaseSeconds,
  }: RunHsppPostPositiveMemberEffectiveCessationInput,

  dependencies:
    HsppPostPositiveMemberEffectiveCessationRunnerDependencies =
      DEFAULT_DEPENDENCIES,
): Promise<RunHsppPostPositiveMemberEffectiveCessationResult> {
  requireCessationWork(
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
        HSPP_POST_POSITIVE_MEMBER_EFFECTIVE_CESSATION_RUNNER_VERSION,

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

      cessation:
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
      "Acquired post-positive cessation lease did not preserve the caller-owned lease token.",
    );
  }

  let cessation:
    PersistedHsppAssemblyMemberEffectiveCessation | null =
      null;

  let leaseRelease:
    HsppPostPositiveMemberEffectiveCessationLeaseReleaseSummary | null =
      null;

  let primaryFailed =
    false;

  let primaryError:
    unknown =
      null;

  try {
    try {
      if (
        workItem.unsuitabilityCheckpointId ===
        null
      ) {
        throw new Error(
          "CESSATION_REQUIRED work lost its Q14v checkpoint identity.",
        );
      }

      cessation =
        await dependencies.persistCessation({
          supabase,

          organizationId:
            workItem.organizationId,

          assemblyId:
            workItem.assemblyId,

          leaseToken:
            leaseAcquisition.leaseToken,

          unsuitabilityCheckpointId:
            workItem.unsuitabilityCheckpointId,
        });

      assertCessationIdentity(
        workItem,
        cessation,
      );
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
       * Q14ac/Q14ab is durable if persistence already succeeded.
       *
       * Failure to release must not reinterpret an immutable cessation
       * as though its database transition failed. Lease expiry remains
       * the bounded recovery authority.
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
    cessation ===
      null ||
    leaseRelease ===
      null
  ) {
    throw new Error(
      "Post-positive cessation runner reached an incomplete terminal state.",
    );
  }

  return {
    runnerVersion:
      HSPP_POST_POSITIVE_MEMBER_EFFECTIVE_CESSATION_RUNNER_VERSION,

    branch:
      "CESSATION_PERSISTED",

    organizationId:
      workItem.organizationId,

    assemblyId:
      workItem.assemblyId,

    membershipId:
      workItem.membershipId,

    evidenceId:
      workItem.evidenceId,

    cessation,

    busyUntil:
      null,

    leaseRelease,
  };
}
