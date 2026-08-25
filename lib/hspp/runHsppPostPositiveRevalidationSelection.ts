import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  evaluateHsppPostPositiveRevalidationEvidence,
  type HsppPostPositiveRevalidationEvaluation,
} from "@/lib/hspp/evaluateHsppPostPositiveRevalidationEvidence";

import {
  readHsppPostPositiveRevalidationCandidates,
} from "@/lib/hspp/readHsppPostPositiveRevalidationCandidates";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "@/lib/hspp/readHsppPostPositiveLifecycleWorkItems";


export const HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_VERSION =
  "hspp-post-positive-revalidation-selection-runner-v1" as const;


export type HsppPostPositiveRevalidationSelectionStatus =
  | "NO_CANDIDATES"
  | "NO_QUALIFYING_REVALIDATION"
  | "QUALIFYING_REVALIDATION_FOUND";


export type HsppPostPositiveRevalidationSelectedBasis = {
  revalidationEvidenceId:
    string;

  revalidationIntegrityFingerprint:
    string;

  observedAt:
    string;

  policyVersion:
    "hspp-post-positive-member-unsuitability-v2";

  persistenceReason:
    "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION";
};


export type RunHsppPostPositiveRevalidationSelectionInput = {
  supabase:
    SupabaseClient;

  workItem:
    HsppPostPositiveLifecycleWorkItem;

  limit?:
    number;
};


export type RunHsppPostPositiveRevalidationSelectionResult = {
  runnerVersion:
    typeof HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_VERSION;

  organizationId:
    string;

  assemblyId:
    string;

  positiveCheckpointId:
    string;

  evidenceId:
    string;

  integrityFingerprint:
    string;

  candidateCount:
    number;

  evaluatedCount:
    number;

  status:
    HsppPostPositiveRevalidationSelectionStatus;

  selectedBasis:
    HsppPostPositiveRevalidationSelectedBasis | null;
};


export type HsppPostPositiveRevalidationSelectionDependencies = {
  readCandidates:
    typeof readHsppPostPositiveRevalidationCandidates;

  evaluateCandidate:
    typeof evaluateHsppPostPositiveRevalidationEvidence;
};


const DEFAULT_DEPENDENCIES:
  HsppPostPositiveRevalidationSelectionDependencies = {
    readCandidates:
      readHsppPostPositiveRevalidationCandidates,

    evaluateCandidate:
      evaluateHsppPostPositiveRevalidationEvidence,
  };


function requireQualifyingBasis(
  candidateEvidenceId: string,
  evaluation: HsppPostPositiveRevalidationEvaluation,
): HsppPostPositiveRevalidationSelectedBasis {
  if (
    !evaluation.qualifiesUnsuitability ||
    evaluation.state !==
      "QUALIFYING_UNSUITABILITY_BASIS" ||
    evaluation.reason !==
      "R1_UNSUITABILITY_BASIS_CONFIRMED"
  ) {
    throw new Error(
      "A non-qualifying R1 evaluation cannot become a selected unsuitability basis.",
    );
  }


  if (
    !evaluation.revalidationEvidenceId ||
    !evaluation.revalidationIntegrityFingerprint ||
    !evaluation.observedAt
  ) {
    throw new Error(
      "Qualifying R1 evaluation is missing exact durable basis identity.",
    );
  }


  if (
    evaluation.revalidationEvidenceId !==
    candidateEvidenceId
  ) {
    throw new Error(
      "Qualifying R1 evaluation conflicts with its selected candidate identity.",
    );
  }


  if (
    evaluation.policyVersion !==
      "hspp-post-positive-member-unsuitability-v2" ||
    evaluation.persistenceReason !==
      "POST_POSITIVE_MEMBER_UNSUITABLE_FOR_DESCENDANT_COMPOSITION"
  ) {
    throw new Error(
      "Qualifying R1 evaluation returned unexpected persistence authority.",
    );
  }


  return {
    revalidationEvidenceId:
      evaluation.revalidationEvidenceId,

    revalidationIntegrityFingerprint:
      evaluation.revalidationIntegrityFingerprint,

    observedAt:
      evaluation.observedAt,

    policyVersion:
      evaluation.policyVersion,

    persistenceReason:
      evaluation.persistenceReason,
  };
}


/**
 * Dormant R1 orchestration only.
 *
 * Discovery order is authoritative for deterministic selection:
 * observed_at ASC, evidence id ASC.
 *
 * The first semantically qualifying immutable R1 becomes the proposed
 * basis returned to the caller.
 *
 * This runner does not persist that proposal and does not own a lease.
 */
export async function runHsppPostPositiveRevalidationSelection(
  {
    supabase,
    workItem,
    limit,
  }: RunHsppPostPositiveRevalidationSelectionInput,

  dependencies:
    HsppPostPositiveRevalidationSelectionDependencies =
      DEFAULT_DEPENDENCIES,
): Promise<RunHsppPostPositiveRevalidationSelectionResult> {
  const discovery =
    await dependencies.readCandidates({
      supabase,

      workItem,

      limit,
    });


  if (
    discovery.organizationId !==
      workItem.organizationId ||
    discovery.assemblyId !==
      workItem.assemblyId ||
    discovery.positiveCheckpointId !==
      workItem.positiveCheckpointId ||
    discovery.evidenceId !==
      workItem.evidenceId ||
    discovery.integrityFingerprint !==
      workItem.integrityFingerprint
  ) {
    throw new Error(
      "R1 candidate discovery returned conflicting lifecycle authority.",
    );
  }


  if (
    discovery.candidates.length ===
    0
  ) {
    return {
      runnerVersion:
        HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_VERSION,

      organizationId:
        discovery.organizationId,

      assemblyId:
        discovery.assemblyId,

      positiveCheckpointId:
        discovery.positiveCheckpointId,

      evidenceId:
        discovery.evidenceId,

      integrityFingerprint:
        discovery.integrityFingerprint,

      candidateCount:
        0,

      evaluatedCount:
        0,

      status:
        "NO_CANDIDATES",

      selectedBasis:
        null,
    };
  }


  let evaluatedCount =
    0;


  for (
    const candidate
    of discovery.candidates
  ) {
    const evaluation =
      dependencies.evaluateCandidate({
        workItem,

        revalidationEvidence:
          candidate.readResult,
      });

    evaluatedCount +=
      1;


    if (
      !evaluation.qualifiesUnsuitability
    ) {
      continue;
    }


    const selectedBasis =
      requireQualifyingBasis(
        candidate.evidenceId,
        evaluation,
      );


    return {
      runnerVersion:
        HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_VERSION,

      organizationId:
        discovery.organizationId,

      assemblyId:
        discovery.assemblyId,

      positiveCheckpointId:
        discovery.positiveCheckpointId,

      evidenceId:
        discovery.evidenceId,

      integrityFingerprint:
        discovery.integrityFingerprint,

      candidateCount:
        discovery.candidates.length,

      evaluatedCount,

      status:
        "QUALIFYING_REVALIDATION_FOUND",

      selectedBasis,
    };
  }


  return {
    runnerVersion:
      HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_VERSION,

    organizationId:
      discovery.organizationId,

    assemblyId:
      discovery.assemblyId,

    positiveCheckpointId:
      discovery.positiveCheckpointId,

    evidenceId:
      discovery.evidenceId,

    integrityFingerprint:
      discovery.integrityFingerprint,

    candidateCount:
      discovery.candidates.length,

    evaluatedCount,

    status:
      "NO_QUALIFYING_REVALIDATION",

    selectedBasis:
      null,
  };
}
