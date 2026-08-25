import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_TYPE,
  HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_VERSION,
  HSPP_POST_POSITIVE_REVALIDATION_PAYLOAD_SCHEMA_VERSION,
  HSPP_POST_POSITIVE_REVALIDATION_SOURCE_CLASS,
  HSPP_POST_POSITIVE_REVALIDATION_SOURCE_PROVIDER,
  HSPP_POST_POSITIVE_REVALIDATION_SOURCE_STREAM,
} from "@/lib/hspp/evaluateHsppPostPositiveRevalidationEvidence";

import {
  readAndVerifyHsppEvidenceBatch,
  type ReadAndVerifyHsppEvidenceResult,
} from "@/lib/hspp/readAndVerifyHsppEvidence";

import type {
  HsppPostPositiveLifecycleWorkItem,
} from "@/lib/hspp/readHsppPostPositiveLifecycleWorkItems";


export const HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_VERSION =
  "hspp-post-positive-revalidation-candidate-reader-v1" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_MAX_LIMIT =
  25 as const;


export type HsppPostPositiveRevalidationCandidate = {
  evidenceId:
    string;

  observedAt:
    string;

  readResult:
    ReadAndVerifyHsppEvidenceResult;
};


export type ReadHsppPostPositiveRevalidationCandidatesInput = {
  supabase:
    SupabaseClient;

  workItem:
    HsppPostPositiveLifecycleWorkItem;

  limit?:
    number;
};


export type ReadHsppPostPositiveRevalidationCandidatesResult = {
  readerVersion:
    typeof HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_VERSION;

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

  candidates:
    HsppPostPositiveRevalidationCandidate[];
};


export type HsppPostPositiveRevalidationCandidateReaderDependencies = {
  readEvidenceBatch:
    typeof readAndVerifyHsppEvidenceBatch;
};


const DEFAULT_DEPENDENCIES:
  HsppPostPositiveRevalidationCandidateReaderDependencies = {
    readEvidenceBatch:
      readAndVerifyHsppEvidenceBatch,
  };


type RevalidationCandidateRow = {
  id?:
    unknown;

  observed_at?:
    unknown;
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
      `${label} must be a non-blank string.`,
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
      `${label} must be an exact lowercase SHA-256 hexadecimal fingerprint.`,
    );
  }

  return normalized;
}


function requireIsoTimestamp(
  value: unknown,
  label: string,
): {
  value: string;
  epochMs: number;
} {
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
      `${label} must be a valid ISO timestamp.`,
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
    HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_MAX_LIMIT;

  if (
    !Number.isInteger(
      normalized,
    ) ||
    normalized < 1 ||
    normalized >
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_MAX_LIMIT
  ) {
    throw new Error(
      `limit must be an integer between 1 and ${HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_MAX_LIMIT}.`,
    );
  }

  return normalized;
}


/**
 * Bounded read-only R1 structural discovery.
 *
 * This reader deliberately performs only two operations:
 *
 * 1. Select immutable hspp_evidence identities already matching the
 *    exact post-positive R1 structural domain for historical C.
 *
 * 2. Re-read those selected identities through the canonical
 *    readAndVerifyHsppEvidenceBatch integrity-verification path.
 *
 * It does NOT decide that R1 semantically authorizes unsuitability.
 * That remains the responsibility of
 * evaluateHsppPostPositiveRevalidationEvidence().
 *
 * It performs no persistence and owns no lifecycle authority.
 */
export async function readHsppPostPositiveRevalidationCandidates(
  {
    supabase,
    workItem,
    limit,
  }: ReadHsppPostPositiveRevalidationCandidatesInput,

  dependencies:
    HsppPostPositiveRevalidationCandidateReaderDependencies =
      DEFAULT_DEPENDENCIES,
): Promise<ReadHsppPostPositiveRevalidationCandidatesResult> {
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
      "R1 candidate discovery requires REEVALUATION_REQUIRED work.",
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
      "R1 candidate discovery refuses work that already contains Q14v authority.",
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


  const {
    data,
    error,
  } =
    await supabase
      .from(
        "hspp_evidence",
      )
      .select(
        "id,observed_at",
      )
      .eq(
        "organization_id",
        organizationId,
      )
      .eq(
        "source_class",
        HSPP_POST_POSITIVE_REVALIDATION_SOURCE_CLASS,
      )
      .eq(
        "source_provider",
        HSPP_POST_POSITIVE_REVALIDATION_SOURCE_PROVIDER,
      )
      .eq(
        "source_stream",
        HSPP_POST_POSITIVE_REVALIDATION_SOURCE_STREAM,
      )
      .eq(
        "payload_schema_version",
        HSPP_POST_POSITIVE_REVALIDATION_PAYLOAD_SCHEMA_VERSION,
      )
      .eq(
        "parent_evidence_id",
        evidenceId,
      )
      .eq(
        "parent_integrity_fingerprint",
        integrityFingerprint,
      )
      .eq(
        "derivation_type",
        HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_TYPE,
      )
      .eq(
        "derivation_version",
        HSPP_POST_POSITIVE_REVALIDATION_DERIVATION_VERSION,
      )
      .gte(
        "observed_at",
        positiveAssessedAt.value,
      )
      .order(
        "observed_at",
        {
          ascending:
            true,
        },
      )
      .order(
        "id",
        {
          ascending:
            true,
        },
      )
      .limit(
        requestedLimit,
      );


  if (error) {
    throw new Error(
      `Unable to read HSPP post-positive revalidation candidates: ${error.message}`,
    );
  }


  if (!Array.isArray(data)) {
    throw new Error(
      "HSPP post-positive revalidation candidate query returned an invalid result.",
    );
  }


  if (
    data.length >
    requestedLimit
  ) {
    throw new Error(
      "HSPP post-positive revalidation candidate query exceeded its requested bound.",
    );
  }


  const seenEvidenceIds =
    new Set<string>();

  const selected =
    (
      data as RevalidationCandidateRow[]
    ).map(
      (
        row,
        index,
      ) => {
        const candidateEvidenceId =
          requireNonBlank(
            row.id,
            `candidate[${index}].id`,
          );

        const candidateObservedAt =
          requireIsoTimestamp(
            row.observed_at,
            `candidate[${index}].observed_at`,
          );

        if (
          candidateObservedAt.epochMs <
          positiveAssessedAt.epochMs
        ) {
          throw new Error(
            "R1 candidate query returned evidence preceding the prior positive assessment.",
          );
        }


        if (
          seenEvidenceIds.has(
            candidateEvidenceId,
          )
        ) {
          throw new Error(
            `R1 candidate query returned duplicate evidence ${candidateEvidenceId}.`,
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
    return {
      readerVersion:
        HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_VERSION,

      organizationId,

      assemblyId,

      positiveCheckpointId,

      evidenceId,

      integrityFingerprint,

      positiveAssessedAt:
        positiveAssessedAt.value,

      requestedLimit,

      candidates:
        [],
    };
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
            `Canonical HSPP evidence batch reader omitted selected R1 candidate ${candidate.evidenceId}.`,
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
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_READER_VERSION,

    organizationId,

    assemblyId,

    positiveCheckpointId,

    evidenceId,

    integrityFingerprint,

    positiveAssessedAt:
      positiveAssessedAt.value,

    requestedLimit,

    candidates,
  };
}
