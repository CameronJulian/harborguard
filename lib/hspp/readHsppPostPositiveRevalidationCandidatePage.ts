import type {
  SupabaseClient,
} from "@supabase/supabase-js";


export const HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION =
  "hspp-post-positive-revalidation-candidate-page-reader-v1" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_RPC =
  "read_hspp_post_positive_revalidation_candidate_page" as const;


export const HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_MAX_LIMIT =
  25 as const;


export type HsppPostPositiveRevalidationCandidatePageCursor = {
  observedAt:
    string;

  evidenceId:
    string;
};


export type HsppPostPositiveRevalidationCandidatePageItem = {
  evidenceId:
    string;

  observedAt:
    string;

  position:
    number;
};


export type ReadHsppPostPositiveRevalidationCandidatePageInput = {
  supabase:
    SupabaseClient;

  positiveCheckpointId:
    string;

  organizationId:
    string;

  assemblyId:
    string;

  evidenceId:
    string;

  integrityFingerprint:
    string;

  positiveAssessedAt:
    string;

  limit?:
    number;
};


export type ReadHsppPostPositiveRevalidationCandidatePageResult = {
  readerVersion:
    typeof HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION;

  positiveCheckpointId:
    string;

  organizationId:
    string;

  assemblyId:
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
    HsppPostPositiveRevalidationCandidatePageItem[];
};


type CandidatePageRow = {
  [key: string]:
    unknown;
};


type ParsedTimestamp = {
  value:
    string;

  epochMs:
    number;
};


function requireObject(
  value: unknown,
  label: string,
): CandidatePageRow {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      label + " must be an object.",
    );
  }

  return value as CandidatePageRow;
}


function requireNonBlank(
  value: unknown,
  label: string,
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      label + " must be a non-empty string.",
    );
  }

  return value.trim();
}


function requireUuid(
  value: unknown,
  label: string,
): string {
  const text =
    requireNonBlank(
      value,
      label,
    );

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      text,
    )
  ) {
    throw new Error(
      label + " must be a UUID.",
    );
  }

  return text.toLowerCase();
}


function requireFingerprint(
  value: unknown,
  label: string,
): string {
  const text =
    requireNonBlank(
      value,
      label,
    );

  if (!/^[0-9a-f]{64}$/.test(text)) {
    throw new Error(
      label + " must be a lowercase SHA-256 fingerprint.",
    );
  }

  return text;
}


function requireTimestamp(
  value: unknown,
  label: string,
): ParsedTimestamp {
  const text =
    requireNonBlank(
      value,
      label,
    );

  const epochMs =
    Date.parse(text);

  if (!Number.isFinite(epochMs)) {
    throw new Error(
      label + " must be a valid ISO timestamp.",
    );
  }

  return {
    value:
      text,

    epochMs,
  };
}


function requireInteger(
  value: unknown,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value)
  ) {
    throw new Error(
      label + " must be an integer.",
    );
  }

  return value;
}


function normalizeLimit(
  value: number | undefined,
): number {
  const normalized =
    value === undefined
      ? HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_MAX_LIMIT
      : value;

  if (
    !Number.isInteger(normalized) ||
    normalized < 1 ||
    normalized >
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_MAX_LIMIT
  ) {
    throw new Error(
      "R1 candidate page limit must be an integer between 1 and 25.",
    );
  }

  return normalized;
}


function readCursor(
  observedAt: unknown,
  evidenceId: unknown,
  label: string,
): HsppPostPositiveRevalidationCandidatePageCursor | null {
  if (
    observedAt === null &&
    evidenceId === null
  ) {
    return null;
  }

  if (
    observedAt === null ||
    observedAt === undefined ||
    evidenceId === null ||
    evidenceId === undefined
  ) {
    throw new Error(
      label + " requires both observedAt and evidenceId or neither.",
    );
  }

  return {
    observedAt:
      requireTimestamp(
        observedAt,
        label + ".observedAt",
      ).value,

    evidenceId:
      requireUuid(
        evidenceId,
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


export async function readHsppPostPositiveRevalidationCandidatePage({
  supabase,
  positiveCheckpointId: rawPositiveCheckpointId,
  organizationId: rawOrganizationId,
  assemblyId: rawAssemblyId,
  evidenceId: rawEvidenceId,
  integrityFingerprint: rawIntegrityFingerprint,
  positiveAssessedAt: rawPositiveAssessedAt,
  limit,
}: ReadHsppPostPositiveRevalidationCandidatePageInput):
Promise<ReadHsppPostPositiveRevalidationCandidatePageResult> {
  const positiveCheckpointId =
    requireUuid(
      rawPositiveCheckpointId,
      "positiveCheckpointId",
    );

  const organizationId =
    requireUuid(
      rawOrganizationId,
      "organizationId",
    );

  const assemblyId =
    requireUuid(
      rawAssemblyId,
      "assemblyId",
    );

  const evidenceId =
    requireUuid(
      rawEvidenceId,
      "evidenceId",
    );

  const integrityFingerprint =
    requireFingerprint(
      rawIntegrityFingerprint,
      "integrityFingerprint",
    );

  const positiveAssessedAt =
    requireTimestamp(
      rawPositiveAssessedAt,
      "positiveAssessedAt",
    );

  const requestedLimit =
    normalizeLimit(
      limit,
    );


  const {
    data,
    error,
  } =
    await supabase.rpc(
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_RPC,
      {
        p_positive_checkpoint_id:
          positiveCheckpointId,

        p_limit:
          requestedLimit,
      },
    );


  if (error) {
    throw new Error(
      "Unable to read HSPP post-positive R1 candidate page: " +
        error.message,
    );
  }


  if (
    !Array.isArray(data) ||
    data.length === 0
  ) {
    throw new Error(
      "R1 candidate page RPC did not return its required page metadata row.",
    );
  }


  if (data.length > requestedLimit) {
    throw new Error(
      "R1 candidate page RPC exceeded its requested bound.",
    );
  }


  let expectedCursor:
    HsppPostPositiveRevalidationCandidatePageCursor |
    null |
    undefined;

  let proposedCursor:
    HsppPostPositiveRevalidationCandidatePageCursor |
    null |
    undefined;

  let sentinelSeen =
    false;

  const seenEvidenceIds =
    new Set<string>();

  const candidates:
    HsppPostPositiveRevalidationCandidatePageItem[] =
      [];


  for (
    let index = 0;
    index < data.length;
    index += 1
  ) {
    const row =
      requireObject(
        data[index],
        "candidatePage[" + index + "]",
      );


    const readerVersion =
      requireNonBlank(
        row.reader_version,
        "candidatePage.readerVersion",
      );

    if (
      readerVersion !==
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION
    ) {
      throw new Error(
        "R1 candidate page returned an unsupported reader version.",
      );
    }


    if (
      requireUuid(
        row.positive_checkpoint_id,
        "candidatePage.positiveCheckpointId",
      ) !==
        positiveCheckpointId ||
      requireUuid(
        row.organization_id,
        "candidatePage.organizationId",
      ) !==
        organizationId ||
      requireUuid(
        row.assembly_id,
        "candidatePage.assemblyId",
      ) !==
        assemblyId ||
      requireUuid(
        row.subject_evidence_id,
        "candidatePage.subjectEvidenceId",
      ) !==
        evidenceId ||
      requireFingerprint(
        row.subject_integrity_fingerprint,
        "candidatePage.subjectIntegrityFingerprint",
      ) !==
        integrityFingerprint
    ) {
      throw new Error(
        "R1 candidate page returned conflicting immutable lifecycle authority.",
      );
    }


    const returnedPositiveAssessedAt =
      requireTimestamp(
        row.positive_assessed_at,
        "candidatePage.positiveAssessedAt",
      );

    if (
      returnedPositiveAssessedAt.epochMs !==
      positiveAssessedAt.epochMs
    ) {
      throw new Error(
        "R1 candidate page returned a conflicting positive assessment time.",
      );
    }


    const rowExpectedCursor =
      readCursor(
        row.cursor_expected_observed_at,
        row.cursor_expected_evidence_id,
        "candidatePage.expectedCursor",
      );

    const rowProposedCursor =
      readCursor(
        row.cursor_proposed_observed_at,
        row.cursor_proposed_evidence_id,
        "candidatePage.proposedCursor",
      );


    if (index === 0) {
      expectedCursor =
        rowExpectedCursor;

      proposedCursor =
        rowProposedCursor;
    }
    else {
      if (
        !sameCursor(
          expectedCursor === undefined
            ? null
            : expectedCursor,
          rowExpectedCursor,
        )
      ) {
        throw new Error(
          "R1 candidate page rows disagree about the expected cursor.",
        );
      }

      if (
        !sameCursor(
          proposedCursor === undefined
            ? null
            : proposedCursor,
          rowProposedCursor,
        )
      ) {
        throw new Error(
          "R1 candidate page rows disagree about the proposed cursor.",
        );
      }
    }


    const rawCandidateEvidenceId =
      row.candidate_evidence_id;

    const rawCandidateObservedAt =
      row.candidate_observed_at;

    const rawCandidatePosition =
      row.candidate_position;


    if (
      rawCandidateEvidenceId === null &&
      rawCandidateObservedAt === null &&
      rawCandidatePosition === null
    ) {
      if (data.length !== 1) {
        throw new Error(
          "R1 candidate page sentinel must be the only returned row.",
        );
      }

      sentinelSeen =
        true;

      continue;
    }


    if (
      rawCandidateEvidenceId === null ||
      rawCandidateEvidenceId === undefined ||
      rawCandidateObservedAt === null ||
      rawCandidateObservedAt === undefined ||
      rawCandidatePosition === null ||
      rawCandidatePosition === undefined
    ) {
      throw new Error(
        "R1 candidate page returned a partial candidate identity.",
      );
    }


    const candidateEvidenceId =
      requireUuid(
        rawCandidateEvidenceId,
        "candidatePage.candidateEvidenceId",
      );

    const candidateObservedAt =
      requireTimestamp(
        rawCandidateObservedAt,
        "candidatePage.candidateObservedAt",
      );

    const candidatePosition =
      requireInteger(
        rawCandidatePosition,
        "candidatePage.candidatePosition",
      );


    if (
      candidateObservedAt.epochMs <
      positiveAssessedAt.epochMs
    ) {
      throw new Error(
        "R1 candidate page returned evidence preceding the positive assessment.",
      );
    }


    if (
      candidatePosition !==
      candidates.length + 1
    ) {
      throw new Error(
        "R1 candidate page positions must be contiguous and deterministic.",
      );
    }


    if (
      seenEvidenceIds.has(
        candidateEvidenceId,
      )
    ) {
      throw new Error(
        "R1 candidate page returned a duplicate evidence id.",
      );
    }

    seenEvidenceIds.add(
      candidateEvidenceId,
    );


    candidates.push({
      evidenceId:
        candidateEvidenceId,

      observedAt:
        candidateObservedAt.value,

      position:
        candidatePosition,
    });
  }


  if (
    expectedCursor === undefined ||
    proposedCursor === undefined
  ) {
    throw new Error(
      "R1 candidate page did not expose complete cursor metadata.",
    );
  }


  if (candidates.length === 0) {
    if (!sentinelSeen) {
      throw new Error(
        "R1 candidate page returned no candidate and no sentinel.",
      );
    }

    if (proposedCursor !== null) {
      throw new Error(
        "An empty R1 candidate page cannot propose cursor advancement.",
      );
    }
  }
  else {
    if (sentinelSeen) {
      throw new Error(
        "R1 candidate page cannot mix candidates with a sentinel.",
      );
    }

    const finalCandidate =
      candidates[
        candidates.length - 1
      ];

    if (
      proposedCursor === null ||
      proposedCursor.evidenceId !==
        finalCandidate.evidenceId ||
      proposedCursor.observedAt !==
        finalCandidate.observedAt
    ) {
      throw new Error(
        "R1 candidate page proposed cursor must equal its final selected candidate.",
      );
    }
  }


  return {
    readerVersion:
      HSPP_POST_POSITIVE_REVALIDATION_CANDIDATE_PAGE_READER_VERSION,

    positiveCheckpointId,

    organizationId,

    assemblyId,

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
