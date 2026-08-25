import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  acquireHsppAssemblyAssessmentExecutionLease,
  releaseHsppAssemblyAssessmentExecutionLease,
} from "@/lib/hspp/hsppAssemblyAssessmentExecutionLease";

import {
  runHsppPostPositiveRevalidationSelection,
  type RunHsppPostPositiveRevalidationSelectionInput,
  type RunHsppPostPositiveRevalidationSelectionResult,
} from "@/lib/hspp/runHsppPostPositiveRevalidationSelection";

import {
  HSPP_MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_VERSION,
  HSPP_MEMBER_UNSUITABILITY_REVALIDATION_POLICY_VERSION,
  HSPP_MEMBER_UNSUITABILITY_REVALIDATION_REASON,
  persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease,
  type PersistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLeaseInput,
  type PersistedHsppMemberUnsuitabilityCheckpointWithRevalidation,
} from "@/lib/hspp/persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "@/lib/hspp/readHsppPostPositiveLifecycleWorkItems";


export const HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_ASSESSMENT_RUNNER_VERSION =
  "hspp-post-positive-revalidation-unsuitability-assessment-runner-v1" as const;


export type HsppPostPositiveRevalidationAuthoritativeLeaseAcquisition =
  | {
      state:
        "ACQUIRED";

      organizationId:
        string;

      assemblyId:
        string;

      leaseToken:
        string;

      expiresAt:
        string;
    }
  | {
      state:
        "BUSY";

      organizationId:
        string;

      assemblyId:
        string;

      leaseToken:
        null;

      expiresAt:
        string;
    };


export type HsppPostPositiveRevalidationAuthoritativeLeaseReleaseResult = {
  state:
    "RELEASED" |
    "NOT_OWNER";

  organizationId:
    string;

  assemblyId:
    string;

  leaseToken:
    string;
};


export type HsppPostPositiveRevalidationAuthoritativeLeaseReleaseSummary =
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


export type RunHsppPostPositiveRevalidationUnsuitabilityAssessmentInput = {
  supabase:
    SupabaseClient;

  workItem:
    HsppPostPositiveLifecycleWorkItem;

  leaseToken:
    string;

  leaseSeconds:
    number;

  decidedAt:
    string;

  limit?:
    number;
};


export type RunHsppPostPositiveRevalidationUnsuitabilityAssessmentBranch =
  | "LEASE_BUSY"
  | "NO_CANDIDATES"
  | "NO_QUALIFYING_REVALIDATION"
  | "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED";


export type RunHsppPostPositiveRevalidationUnsuitabilityAssessmentResult = {
  runnerVersion:
    typeof HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_ASSESSMENT_RUNNER_VERSION;

  branch:
    RunHsppPostPositiveRevalidationUnsuitabilityAssessmentBranch;

  organizationId:
    string;

  assemblyId:
    string;

  membershipId:
    string;

  evidenceId:
    string;

  integrityFingerprint:
    string;

  positiveCheckpointId:
    string;

  selection:
    RunHsppPostPositiveRevalidationSelectionResult | null;

  checkpoint:
    PersistedHsppMemberUnsuitabilityCheckpointWithRevalidation | null;

  busyUntil:
    string | null;

  leaseRelease:
    HsppPostPositiveRevalidationAuthoritativeLeaseReleaseSummary | null;
};


type AcquireLeaseDependency = (
  input: {
    supabase:
      SupabaseClient;

    organizationId:
      string;

    assemblyId:
      string;

    leaseToken:
      string;

    leaseSeconds:
      number;
  },
) =>
  Promise<HsppPostPositiveRevalidationAuthoritativeLeaseAcquisition>;


type ReleaseLeaseDependency = (
  input: {
    supabase:
      SupabaseClient;

    organizationId:
      string;

    assemblyId:
      string;

    leaseToken:
      string;
  },
) =>
  Promise<HsppPostPositiveRevalidationAuthoritativeLeaseReleaseResult>;


type SelectionDependency = (
  input:
    RunHsppPostPositiveRevalidationSelectionInput,
) =>
  Promise<RunHsppPostPositiveRevalidationSelectionResult>;


type PersistDependency = (
  input:
    PersistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLeaseInput,
) =>
  Promise<PersistedHsppMemberUnsuitabilityCheckpointWithRevalidation>;


export type HsppPostPositiveRevalidationUnsuitabilityAssessmentRunnerDependencies = {
  acquireLease:
    AcquireLeaseDependency;

  releaseLease:
    ReleaseLeaseDependency;

  selectRevalidation:
    SelectionDependency;

  persistUnsuitability:
    PersistDependency;
};


const DEFAULT_DEPENDENCIES:
  HsppPostPositiveRevalidationUnsuitabilityAssessmentRunnerDependencies = {
    acquireLease:
      acquireHsppAssemblyAssessmentExecutionLease,

    releaseLease:
      releaseHsppAssemblyAssessmentExecutionLease,

    selectRevalidation:
      runHsppPostPositiveRevalidationSelection,

    persistUnsuitability:
      persistHsppMemberUnsuitabilityCheckpointWithRevalidationUnderExecutionLease,
  };


function requireReevaluationWork(
  workItem:
    HsppPostPositiveLifecycleWorkItem,
): void {
  if (
    !workItem ||
    typeof workItem !==
      "object"
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
      "R1 authoritative assessment requires REEVALUATION_REQUIRED work.",
    );
  }

  if (
    workItem.unsuitabilityCheckpointId !==
      null ||
    workItem.unsuitabilityObservedAt !==
      null ||
    workItem.unsuitabilityDecidedAt !==
      null
  ) {
    throw new Error(
      "R1 authoritative assessment refuses work that already contains Q14v authority.",
    );
  }
}


function errorMessage(
  error:
    unknown,
): string {
  return error instanceof Error
    ? error.message
    : String(
        error ||
          "HSPP R1 authoritative lease release failed.",
      );
}


function verifySelectionAuthority(
  workItem:
    HsppPostPositiveLifecycleWorkItem,

  selection:
    RunHsppPostPositiveRevalidationSelectionResult,
): void {
  if (
    selection.organizationId !==
      workItem.organizationId ||
    selection.assemblyId !==
      workItem.assemblyId ||
    selection.positiveCheckpointId !==
      workItem.positiveCheckpointId ||
    selection.evidenceId !==
      workItem.evidenceId ||
    selection.integrityFingerprint !==
      workItem.integrityFingerprint
  ) {
    throw new Error(
      "R1 authoritative runner received conflicting selection authority.",
    );
  }
}


function verifyPersistedAuthority(
  workItem:
    HsppPostPositiveLifecycleWorkItem,

  selection:
    RunHsppPostPositiveRevalidationSelectionResult,

  checkpoint:
    PersistedHsppMemberUnsuitabilityCheckpointWithRevalidation,

  decidedAt:
    string,
): void {
  const selectedBasis =
    selection.selectedBasis;

  if (
    selection.status !==
      "QUALIFYING_REVALIDATION_FOUND" ||
    !selectedBasis
  ) {
    throw new Error(
      "R1 persistence verification requires a qualifying selected basis.",
    );
  }


  if (
    selectedBasis.policyVersion !==
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_POLICY_VERSION ||
    selectedBasis.persistenceReason !==
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_REASON
  ) {
    throw new Error(
      "Selected R1 basis returned conflicting policy authority.",
    );
  }


  if (
    checkpoint.state !==
      "MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED" ||
    checkpoint.organizationId !==
      workItem.organizationId ||
    checkpoint.assemblyId !==
      workItem.assemblyId ||
    checkpoint.evidenceId !==
      workItem.evidenceId ||
    checkpoint.integrityFingerprint !==
      workItem.integrityFingerprint ||
    checkpoint.revalidationEvidenceId !==
      selectedBasis.revalidationEvidenceId ||
    checkpoint.revalidationIntegrityFingerprint !==
      selectedBasis.revalidationIntegrityFingerprint ||
    checkpoint.priorPositiveCheckpointId !==
      workItem.positiveCheckpointId ||
    checkpoint.checkpointVersion !==
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_CHECKPOINT_VERSION ||
    checkpoint.unsuitabilityPolicyVersion !==
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_POLICY_VERSION ||
    checkpoint.unsuitabilityReason !==
      HSPP_MEMBER_UNSUITABILITY_REVALIDATION_REASON ||
    checkpoint.observedAt !==
      selectedBasis.observedAt ||
    checkpoint.decidedAt !==
      decidedAt
  ) {
    throw new Error(
      "Persisted R1 Q14v authority conflicts with the selected lifecycle basis.",
    );
  }
}


/**
 * Lease-fenced R1 post-positive authoritative assessment.
 *
 * The existing assembly execution lease remains the fencing primitive.
 *
 * BUSY:
 * - no selection;
 * - no Q14x-v2 persistence;
 * - no release attempt because this caller never became owner.
 *
 * ACQUIRED:
 * - exact caller-owned lease token is confirmed;
 * - deterministic R1 selection runs while lease ownership exists;
 * - only QUALIFYING_REVALIDATION_FOUND can call Q14x-v2;
 * - R1 observedAt is inherited from the immutable selected evidence;
 * - decidedAt remains caller-owned;
 * - release always runs in finally.
 *
 * A release failure never reinterprets an already durable Q14v-v2 write
 * as failed persistence. If the primary operation also failed, that
 * primary failure remains the thrown error.
 */
export async function runHsppPostPositiveRevalidationUnsuitabilityAssessment(
  {
    supabase,
    workItem,
    leaseToken,
    leaseSeconds,
    decidedAt,
    limit,
  }: RunHsppPostPositiveRevalidationUnsuitabilityAssessmentInput,

  dependencies:
    HsppPostPositiveRevalidationUnsuitabilityAssessmentRunnerDependencies =
      DEFAULT_DEPENDENCIES,
): Promise<RunHsppPostPositiveRevalidationUnsuitabilityAssessmentResult> {
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
    leaseAcquisition.state ===
    "BUSY"
  ) {
    return {
      runnerVersion:
        HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_ASSESSMENT_RUNNER_VERSION,

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

      integrityFingerprint:
        workItem.integrityFingerprint,

      positiveCheckpointId:
        workItem.positiveCheckpointId,

      selection:
        null,

      checkpoint:
        null,

      busyUntil:
        leaseAcquisition.expiresAt,

      leaseRelease:
        null,
    };
  }


  if (
    leaseAcquisition.organizationId !==
      workItem.organizationId ||
    leaseAcquisition.assemblyId !==
      workItem.assemblyId ||
    leaseAcquisition.leaseToken !==
      leaseToken
  ) {
    throw new Error(
      "Acquired R1 execution lease did not preserve exact caller-owned authority.",
    );
  }


  let branch:
    | "NO_CANDIDATES"
    | "NO_QUALIFYING_REVALIDATION"
    | "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED"
    | null =
      null;

  let selection:
    RunHsppPostPositiveRevalidationSelectionResult | null =
      null;

  let checkpoint:
    PersistedHsppMemberUnsuitabilityCheckpointWithRevalidation | null =
      null;

  let leaseRelease:
    HsppPostPositiveRevalidationAuthoritativeLeaseReleaseSummary | null =
      null;

  let primaryFailed =
    false;

  let primaryError:
    unknown =
      null;


  try {
    try {
      selection =
        await dependencies.selectRevalidation({
          supabase,

          workItem,

          limit,
        });


      verifySelectionAuthority(
        workItem,
        selection,
      );


      if (
        selection.status ===
        "NO_CANDIDATES"
      ) {
        if (
          selection.selectedBasis !==
          null
        ) {
          throw new Error(
            "NO_CANDIDATES unexpectedly returned an R1 selected basis.",
          );
        }

        branch =
          "NO_CANDIDATES";
      }
      else if (
        selection.status ===
        "NO_QUALIFYING_REVALIDATION"
      ) {
        if (
          selection.selectedBasis !==
          null
        ) {
          throw new Error(
            "NO_QUALIFYING_REVALIDATION unexpectedly returned an R1 selected basis.",
          );
        }

        branch =
          "NO_QUALIFYING_REVALIDATION";
      }
      else if (
        selection.status ===
        "QUALIFYING_REVALIDATION_FOUND"
      ) {
        const selectedBasis =
          selection.selectedBasis;

        if (!selectedBasis) {
          throw new Error(
            "QUALIFYING_REVALIDATION_FOUND did not provide its exact R1 basis.",
          );
        }


        if (
          selectedBasis.policyVersion !==
            HSPP_MEMBER_UNSUITABILITY_REVALIDATION_POLICY_VERSION ||
          selectedBasis.persistenceReason !==
            HSPP_MEMBER_UNSUITABILITY_REVALIDATION_REASON
        ) {
          throw new Error(
            "Qualifying R1 selection returned unsupported persistence authority.",
          );
        }


        checkpoint =
          await dependencies.persistUnsuitability({
            supabase,

            organizationId:
              workItem.organizationId,

            assemblyId:
              workItem.assemblyId,

            leaseToken:
              leaseAcquisition.leaseToken,

            evidenceId:
              workItem.evidenceId,

            integrityFingerprint:
              workItem.integrityFingerprint,

            revalidationEvidenceId:
              selectedBasis.revalidationEvidenceId,

            revalidationIntegrityFingerprint:
              selectedBasis.revalidationIntegrityFingerprint,

            observedAt:
              selectedBasis.observedAt,

            decidedAt,
          });


        verifyPersistedAuthority(
          workItem,
          selection,
          checkpoint,
          decidedAt,
        );


        branch =
          "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED";
      }
      else {
        throw new Error(
          "R1 authoritative runner received an unsupported selection status.",
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


      if (
        release.organizationId !==
          workItem.organizationId ||
        release.assemblyId !==
          workItem.assemblyId ||
        release.leaseToken !==
          leaseAcquisition.leaseToken
      ) {
        throw new Error(
          "R1 lease release returned conflicting ownership identity.",
        );
      }


      leaseRelease = {
        state:
          release.state,

        error:
          null,
      };
    }
    catch (error: unknown) {
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
    branch ===
      null ||
    selection ===
      null ||
    leaseRelease ===
      null
  ) {
    throw new Error(
      "R1 authoritative runner reached an incomplete terminal state.",
    );
  }


  if (
    branch ===
      "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED" &&
    checkpoint ===
      null
  ) {
    throw new Error(
      "Persisted R1 branch did not produce its Q14v-v2 checkpoint.",
    );
  }


  if (
    branch !==
      "UNSUITABILITY_REVALIDATION_CHECKPOINT_PERSISTED" &&
    checkpoint !==
      null
  ) {
    throw new Error(
      "Non-persisting R1 branch unexpectedly produced a Q14v-v2 checkpoint.",
    );
  }


  return {
    runnerVersion:
      HSPP_POST_POSITIVE_REVALIDATION_UNSUITABILITY_ASSESSMENT_RUNNER_VERSION,

    branch,

    organizationId:
      workItem.organizationId,

    assemblyId:
      workItem.assemblyId,

    membershipId:
      workItem.membershipId,

    evidenceId:
      workItem.evidenceId,

    integrityFingerprint:
      workItem.integrityFingerprint,

    positiveCheckpointId:
      workItem.positiveCheckpointId,

    selection,

    checkpoint,

    busyUntil:
      null,

    leaseRelease,
  };
}
