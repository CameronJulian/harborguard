import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  readAndVerifyHsppEvidenceBatch,
  type ReadAndVerifyHsppEvidenceResult,
} from "@/lib/hspp/readAndVerifyHsppEvidence";

import {
  HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION,
  readHsppPostPositiveRevalidationCandidatePage,
  type HsppPostPositiveRevalidationCandidatePageCursor,
} from "@/lib/hspp/readHsppPostPositiveRevalidationCandidatePage";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "@/lib/hspp/readHsppPostPositiveLifecycleWorkItems";


export const HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_V2_VERSION =
  "hspp-post-positive-revalidation-candidate-reader-v2" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_V2_MAX_LIMIT =
  25 as const;


export type HsppPostPositiveRevalidationCandidateV2 = {
  evidenceId:
    string;

  observedAt:
    string;

  readResult:
    ReadAndVerifyHsppEvidenceResult;
};


export type ReadHsppPostPositiveRevalidationCandidatesV2Input = {
  supabase:
    SupabaseClient;

  workItem:
    HsppPostPositiveLifecycleWorkItem;

  limit?:
    number;
};


export type ReadHsppPostPositiveRevalidationCandidatesV2Result = {
  readerVersion:
    typeof HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_V2_VERSION;

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

  positiveAssessedAt:
    string;

  requestedLimit:
    number;

  expectedCursor:
    HsppPostPositiveRevalidationCandidatePageCursor | null;

  proposedCursor:
    HsppPostPositiveRevalidationCandidatePageCursor | null;

  candidates:
    HsppPostPositiveRevalidationCandidateV2[];
};


export type HsppPostPositiveRevalidationCandidateReaderV2Dependencies = {
  readCandidatePage:
    typeof readHsppPostPositiveRevalidationCandidatePage;

  readEvidenceBatch:
    typeof readAndVerifyHsppEvidenceBatch;
};


const DEFAULT_DEPENDENCIES:
  HsppPostPositiveRevalidationCandidateReaderV2Dependencies = {
    readCandidatePage:
      readHsppPostPositiveRevalidationCandidatePage,

    readEvidenceBatch:
      readAndVerifyHsppEvidenceBatch,
  };


type ParsedTimestamp = {
  value:
    string;

  epochMs:
    number;
};


function requireNonBlank(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      label + " must be a non-blank string.",
    );
  }

  return value.trim();
}


function requireFingerprint(
  value: unknown,
  label: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      label,
    );

  if (
    !/^[a-f0-9]{64}$/.test(
      normalized,
    )
  ) {
    throw new Error(
      label +
        " must be an exact lowercase SHA-256 hexadecimal fingerprint.",
    );
  }

  return normalized;
}


function requireIsoTimestamp(
  value: unknown,
  label: string,
): ParsedTimestamp {
  const normalized =
    requireNonBlank(
      value,
      label,
    );

  const epochMs =
    Date.parse(
      normalized,
    );

  if (!Number.isFinite(epochMs)) {
    throw new Error(
      label + " must be a valid ISO timestamp.",
    );
  }

  return {
    value:
      normalized,

    epochMs,
  };
}


function normalizeLimit(
  limit: number | undefined,
): number {
  const normalized =
    limit ??
    HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_V2_MAX_LIMIT;

  if (
    !Number.isInteger(
      normalized,
    ) ||
    normalized < 1 ||
    normalized >
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_V2_MAX_LIMIT
  ) {
    throw new Error(
      "limit must be an integer between 1 and 25.",
    );
  }

  return normalized;
}


function normalizeCursor(
  value: unknown,
  label: string,
): HsppPostPositiveRevalidationCandidatePageCursor | null {
  if (value === null) {
    return null;
  }

  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      label + " must be a cursor object or null.",
    );
  }

  const cursor =
    value as {
      observedAt?:
        unknown;

      evidenceId?:
        unknown;
    };

  return {
    observedAt:
      requireIsoTimestamp(
        cursor.observedAt,
        label + ".observedAt",
      ).value,

    evidenceId:
      requireNonBlank(
        cursor.evidenceId,
        label + ".evidenceId",
      ),
  };
}


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


/**
 * Dormant V2 verified circular R1 discovery.
 *
 * Structural scheduling comes from the bounded circular candidate-page
 * reader. Candidate evidence is then independently re-read through the
 * existing canonical HSPP batch integrity-verification path.
 *
 * This reader owns no semantic unsuitability decision, no scan-state
 * mutation, no CAS, no Q14v persistence, and no lifecycle authority.
 */
export async function readHsppPostPositiveRevalidationCandidatesV2(
  {
    supabase,
    workItem,
    limit,
  }: ReadHsppPostPositiveRevalidationCandidatesV2Input,

  dependencies:
    HsppPostPositiveRevalidationCandidateReaderV2Dependencies =
      DEFAULT_DEPENDENCIES,
): Promise<ReadHsppPostPositiveRevalidationCandidatesV2Result> {
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
      "R1 candidate V2 discovery requires REEVALUATION_REQUIRED work.",
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
      "R1 candidate V2 discovery refuses work that already contains Q14v authority.",
    );
  }


  const organizationId =
    requireNonBlank(
      workItem.organizationId,
      "workItem.organizationId",
    );

  const assemblyId =
    requireNonBlank(
      workItem.assemblyId,
      "workItem.assemblyId",
    );

  const positiveCheckpointId =
    requireNonBlank(
      workItem.positiveCheckpointId,
      "workItem.positiveCheckpointId",
    );

  const evidenceId =
    requireNonBlank(
      workItem.evidenceId,
      "workItem.evidenceId",
    );

  const integrityFingerprint =
    requireFingerprint(
      workItem.integrityFingerprint,
      "workItem.integrityFingerprint",
    );

  const positiveAssessedAt =
    requireIsoTimestamp(
      workItem.positiveAssessedAt,
      "workItem.positiveAssessedAt",
    );

  const requestedLimit =
    normalizeLimit(
      limit,
    );


  const page =
    await dependencies.readCandidatePage({
      supabase,

      positiveCheckpointId,

      organizationId,

      assemblyId,

      evidenceId,

      integrityFingerprint,

      positiveAssessedAt:
        positiveAssessedAt.value,

      limit:
        requestedLimit,
    });


  if (
    page.readerVersion !==
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION
  ) {
    throw new Error(
      "R1 candidate V2 page returned an unsupported reader version.",
    );
  }


  const returnedPositiveAssessedAt =
    requireIsoTimestamp(
      page.positiveAssessedAt,
      "candidatePage.positiveAssessedAt",
    );


  if (
    page.organizationId !==
      organizationId ||
    page.assemblyId !==
      assemblyId ||
    page.positiveCheckpointId !==
      positiveCheckpointId ||
    page.evidenceId !==
      evidenceId ||
    page.integrityFingerprint !==
      integrityFingerprint ||
    returnedPositiveAssessedAt.epochMs !==
      positiveAssessedAt.epochMs
  ) {
    throw new Error(
      "R1 candidate V2 page returned conflicting immutable lifecycle authority.",
    );
  }


  if (
    page.requestedLimit !==
      requestedLimit
  ) {
    throw new Error(
      "R1 candidate V2 page returned a conflicting requested limit.",
    );
  }


  if (!Array.isArray(page.candidates)) {
    throw new Error(
      "R1 candidate V2 page returned an invalid candidate collection.",
    );
  }


  if (
    page.candidates.length >
      requestedLimit
  ) {
    throw new Error(
      "R1 candidate V2 page exceeded its requested bound.",
    );
  }


  const expectedCursor =
    normalizeCursor(
      page.expectedCursor,
      "candidatePage.expectedCursor",
    );

  const proposedCursor =
    normalizeCursor(
      page.proposedCursor,
      "candidatePage.proposedCursor",
    );


  const seenEvidenceIds =
    new Set<string>();

  const selected =
    page.candidates.map(
      (
        candidate,
        index,
      ) => {
        if (
          !candidate ||
          typeof candidate !== "object"
        ) {
          throw new Error(
            "R1 candidate V2 page returned an invalid candidate.",
          );
        }


        const candidateEvidenceId =
          requireNonBlank(
            candidate.evidenceId,
            "candidate[" +
              index +
              "].evidenceId",
          );

        const candidateObservedAt =
          requireIsoTimestamp(
            candidate.observedAt,
            "candidate[" +
              index +
              "].observedAt",
          );


        if (
          candidateObservedAt.epochMs <
            positiveAssessedAt.epochMs
        ) {
          throw new Error(
            "R1 candidate V2 page returned evidence preceding the prior positive assessment.",
          );
        }


        if (
          !Number.isInteger(
            candidate.position,
          ) ||
          candidate.position !==
            index + 1
        ) {
          throw new Error(
            "R1 candidate V2 page positions must be contiguous and deterministic.",
          );
        }


        if (
          seenEvidenceIds.has(
            candidateEvidenceId,
          )
        ) {
          throw new Error(
            "R1 candidate V2 page returned duplicate evidence " +
              candidateEvidenceId +
              ".",
          );
        }

        seenEvidenceIds.add(
          candidateEvidenceId,
        );


        return {
          evidenceId:
            candidateEvidenceId,

          observedAt:
            candidateObservedAt.value,
        };
      },
    );


  if (selected.length === 0) {
    if (proposedCursor !== null) {
      throw new Error(
        "Empty R1 candidate V2 page cannot propose cursor advancement.",
      );
    }


    return {
      readerVersion:
        HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_V2_VERSION,

      organizationId,

      assemblyId,

      positiveCheckpointId,

      evidenceId,

      integrityFingerprint,

      positiveAssessedAt:
        positiveAssessedAt.value,

      requestedLimit,

      expectedCursor,

      proposedCursor,

      candidates:
        [],
    };
  }


  const finalSelected =
    selected[
      selected.length - 1
    ];

  if (
    proposedCursor === null ||
    !sameCursor(
      proposedCursor,
      {
        observedAt:
          finalSelected.observedAt,

        evidenceId:
          finalSelected.evidenceId,
      },
    )
  ) {
    throw new Error(
      "R1 candidate V2 proposed cursor must equal the final selected candidate.",
    );
  }


  const evidenceIds =
    selected.map(
      candidate =>
        candidate.evidenceId,
    );


  const verifiedByEvidenceId =
    await dependencies.readEvidenceBatch({
      supabase,

      organizationId,

      evidenceIds,
    });


  const candidates =
    selected.map(
      candidate => {
        const readResult =
          verifiedByEvidenceId.get(
            candidate.evidenceId,
          );


        if (!readResult) {
          throw new Error(
            "Canonical HSPP evidence batch reader omitted selected R1 candidate " +
              candidate.evidenceId +
              ".",
          );
        }


        if (
          readResult.found &&
          (
            readResult.evidence.id !==
              candidate.evidenceId ||
            readResult.evidence.organizationId !==
              organizationId
          )
        ) {
          throw new Error(
            "Canonical HSPP evidence reader returned a conflicting R1 candidate identity.",
          );
        }


        return {
          evidenceId:
            candidate.evidenceId,

          observedAt:
            candidate.observedAt,

          readResult,
        };
      },
    );


  return {
    readerVersion:
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_V2_VERSION,

    organizationId,

    assemblyId,

    positiveCheckpointId,

    evidenceId,

    integrityFingerprint,

    positiveAssessedAt:
      positiveAssessedAt.value,

    requestedLimit,

    expectedCursor,

    proposedCursor,

    candidates,
  };
}
