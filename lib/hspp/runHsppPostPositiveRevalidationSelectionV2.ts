import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  evaluateHsppPostPositiveRevalidationEvidence,
  type HsppPostPositiveRevalidationEvaluation,
} from "@/lib/hspp/evaluateHsppPostPositiveRevalidationEvidence";

import type {
  HsppPostPositiveRevalidationCandidatePageCursor,
} from "@/lib/hspp/readHsppPostPositiveRevalidationCandidatePage";

import {
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_V2_VERSION,
  readHsppPostPositiveRevalidationCandidatesV2,
} from "@/lib/hspp/readHsppPostPositiveRevalidationCandidatesV2";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "@/lib/hspp/readHsppPostPositiveLifecycleWorkItems";


export const HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_V2_VERSION =
  "hspp-post-positive-revalidation-selection-runner-v2" as const;


export type HsppPostPositiveRevalidationSelectionV2Status =
  | "NO_CANDIDATES"
  | "NO_QUALIFYING_REVALIDATION"
  | "QUALIFYING_REVALIDATION_FOUND";


export type HsppPostPositiveRevalidationSelectedBasisV2 = {
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


export type RunHsppPostPositiveRevalidationSelectionV2Input = {
  supabase:
    SupabaseClient;

  workItem:
    HsppPostPositiveLifecycleWorkItem;

  limit?:
    number;
};


export type RunHsppPostPositiveRevalidationSelectionV2Result = {
  runnerVersion:
    typeof HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_V2_VERSION;

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
    HsppPostPositiveRevalidationSelectionV2Status;

  selectedBasis:
    HsppPostPositiveRevalidationSelectedBasisV2 | null;

  expectedCursor:
    HsppPostPositiveRevalidationCandidatePageCursor | null;

  proposedCursor:
    HsppPostPositiveRevalidationCandidatePageCursor | null;
};


export type HsppPostPositiveRevalidationSelectionV2Dependencies = {
  readCandidates:
    typeof readHsppPostPositiveRevalidationCandidatesV2;

  evaluateCandidate:
    typeof evaluateHsppPostPositiveRevalidationEvidence;
};


const DEFAULT_DEPENDENCIES:
  HsppPostPositiveRevalidationSelectionV2Dependencies = {
    readCandidates:
      readHsppPostPositiveRevalidationCandidatesV2,

    evaluateCandidate:
      evaluateHsppPostPositiveRevalidationEvidence,
  };


function sameCursor(
  left:
    HsppPostPositiveRevalidationCandidatePageCursor | null,

  right:
    HsppPostPositiveRevalidationCandidatePageCursor | null,
): boolean {
  if (
    left === null ||
    right === null
  ) {
    return (
      left === null &&
      right === null
    );
  }

  return (
    left.observedAt ===
      right.observedAt &&
    left.evidenceId ===
      right.evidenceId
  );
}


function requireQualifyingBasis(
  candidateEvidenceId:
    string,

  evaluation:
    HsppPostPositiveRevalidationEvaluation,
): HsppPostPositiveRevalidationSelectedBasisV2 {
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
 * Dormant R1 Selection V2.
 *
 * The verified circular reader owns structural page scheduling.
 * Selection owns only deterministic semantic first-qualifying choice.
 *
 * Cursor identity is scheduling metadata only:
 *
 * - it is propagated unchanged from the complete structural page;
 * - it is not changed to the first qualifying candidate;
 * - this function never calls CAS;
 * - this function never persists Q14v;
 * - this function never acquires or releases a lease.
 *
 * A future authoritative runner may advance the propagated page
 * cursor after processing succeeds. For a qualifying basis, durable
 * Q14x-v2 persistence must occur before any cursor CAS attempt.
 */
export async function runHsppPostPositiveRevalidationSelectionV2(
  {
    supabase,
    workItem,
    limit,
  }: RunHsppPostPositiveRevalidationSelectionV2Input,

  dependencies:
    HsppPostPositiveRevalidationSelectionV2Dependencies =
      DEFAULT_DEPENDENCIES,
): Promise<RunHsppPostPositiveRevalidationSelectionV2Result> {
  const discovery =
    await dependencies.readCandidates({
      supabase,

      workItem,

      limit,
    });


  if (
    discovery.readerVersion !==
    HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_V2_VERSION
  ) {
    throw new Error(
      "R1 Selection V2 received an unsupported candidate reader version.",
    );
  }


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
      workItem.integrityFingerprint ||
    discovery.positiveAssessedAt !==
      workItem.positiveAssessedAt
  ) {
    throw new Error(
      "R1 candidate V2 discovery returned conflicting lifecycle authority.",
    );
  }


  const expectedCursor =
    discovery.expectedCursor;

  const proposedCursor =
    discovery.proposedCursor;


  if (
    discovery.candidates.length ===
    0
  ) {
    if (proposedCursor !== null) {
      throw new Error(
        "NO_CANDIDATES cannot propose R1 cursor advancement.",
      );
    }


    return {
      runnerVersion:
        HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_V2_VERSION,

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

      expectedCursor,

      proposedCursor:
        null,
    };
  }


  const finalCandidate =
    discovery.candidates[
      discovery.candidates.length - 1
    ];


  if (
    proposedCursor === null ||
    !sameCursor(
      proposedCursor,
      {
        observedAt:
          finalCandidate.observedAt,

        evidenceId:
          finalCandidate.evidenceId,
      },
    )
  ) {
    throw new Error(
      "R1 Selection V2 page proposal must equal the final structural candidate.",
    );
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
        HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_V2_VERSION,

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

      expectedCursor,

      proposedCursor,
    };
  }


  return {
    runnerVersion:
      HSPP_POST_POSITIVE_REVALIDATION_SELECTION_RUNNER_V2_VERSION,

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

    expectedCursor,

    proposedCursor,
  };
}
