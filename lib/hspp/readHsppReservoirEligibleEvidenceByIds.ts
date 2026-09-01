import type { SupabaseClient } from "@supabase/supabase-js";

import {
  readHsppEvidenceBatchForOperationalUse,
  type ReadHsppEvidenceForOperationalUseResult,
} from "@/lib/hspp/readHsppEvidenceForOperationalUse";

import {
  evaluateHsppReservoirEligibility,
  type HsppReservoirEligibilityDecision,
} from "@/lib/hspp/evaluateHsppReservoirEligibility";


/**
 * Q14ag8 accepts at most 100 evidence identities per bounded
 * membership-classification read.
 */
export const HSPP_RESERVOIR_REVALIDATION_CLASSIFICATION_CHUNK_MAX =
  100;


/**
 * One scheduled Reservoir pair page is bounded to 100 explicit pairs.
 *
 * In the worst case those pairs contain 200 distinct evidence endpoints.
 * Keeping that bound here prevents this shared revalidation boundary from
 * becoming an unbounded evidence scan.
 */
export const HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS =
  200;


export type HsppEvidenceAssemblyMembershipClassification =
  | "NEVER_ASSEMBLED"
  | "HISTORICAL_NOT_CURRENT"
  | "CURRENT_EFFECTIVE";


export type HsppReservoirEligibleEvidence = {
  evidenceId: string;

  operationalRead:
    ReadHsppEvidenceForOperationalUseResult;

  hasAssemblyMembership: boolean;

  membershipClassification:
    HsppEvidenceAssemblyMembershipClassification;

  reservoirDecision:
    HsppReservoirEligibilityDecision;
};


export type ReadHsppReservoirEligibleEvidenceByIdsInput = {
  supabase: SupabaseClient;

  organizationId: string;

  /**
   * Explicit evidence identities whose current operational and Reservoir
   * eligibility must be revalidated.
   *
   * Duplicate identities are collapsed while preserving first-seen order.
   */
  evidenceIds: string[];
};


type MembershipClassificationRow = {
  evidence_id: unknown;

  has_historical_membership:
    unknown;

  has_current_effective_membership:
    unknown;

  membership_classification:
    unknown;
};


type MembershipClassificationState = {
  hasCurrentEffectiveMembership:
    boolean;

  membershipClassification:
    HsppEvidenceAssemblyMembershipClassification;
};


function requireNonBlank(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return value.trim();
}


function normalizeEvidenceIds(
  evidenceIds: string[],
): string[] {
  if (!Array.isArray(evidenceIds)) {
    throw new Error(
      "evidenceIds must be an array.",
    );
  }

  const normalized =
    evidenceIds.map(
      (
        evidenceId,
        index,
      ) =>
        requireNonBlank(
          evidenceId,
          `evidenceIds[${index}]`,
        ),
    );

  const unique =
    Array.from(
      new Set(
        normalized,
      ),
    );

  if (
    unique.length >
    HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS
  ) {
    throw new Error(
      `Reservoir revalidation accepts at most ${HSPP_RESERVOIR_REVALIDATION_MAX_EVIDENCE_IDS} unique evidence ids per bounded read.`,
    );
  }

  return unique;
}


function validateAndStoreMembershipRow(
  row: MembershipClassificationRow,
  requestedChunk:
    Set<string>,
  membershipClassifications:
    Map<
      string,
      MembershipClassificationState
    >,
): void {
  if (
    typeof row.evidence_id !==
      "string" ||
    !row.evidence_id.trim()
  ) {
    throw new Error(
      "Reservoir membership classification lookup returned an invalid HSPP evidence id.",
    );
  }

  const evidenceId =
    row.evidence_id.trim();

  if (
    !requestedChunk.has(
      evidenceId,
    )
  ) {
    throw new Error(
      `Reservoir membership classification lookup returned unexpected evidence ${evidenceId}.`,
    );
  }

  if (
    membershipClassifications.has(
      evidenceId,
    )
  ) {
    throw new Error(
      `Reservoir membership classification lookup returned duplicate evidence ${evidenceId}.`,
    );
  }

  if (
    typeof row
      .has_historical_membership !==
      "boolean" ||
    typeof row
      .has_current_effective_membership !==
      "boolean"
  ) {
    throw new Error(
      `Reservoir membership classification lookup returned invalid membership flags for evidence ${evidenceId}.`,
    );
  }

  if (
    row
      .has_current_effective_membership &&
    !row
      .has_historical_membership
  ) {
    throw new Error(
      `Reservoir membership classification lookup returned impossible current-without-history state for evidence ${evidenceId}.`,
    );
  }

  if (
    row.membership_classification !==
      "NEVER_ASSEMBLED" &&
    row.membership_classification !==
      "HISTORICAL_NOT_CURRENT" &&
    row.membership_classification !==
      "CURRENT_EFFECTIVE"
  ) {
    throw new Error(
      `Reservoir membership classification lookup returned an invalid lifecycle classification for evidence ${evidenceId}.`,
    );
  }

  const expectedMembershipClassification:
    HsppEvidenceAssemblyMembershipClassification =
      row
        .has_current_effective_membership
        ? "CURRENT_EFFECTIVE"
        : row
            .has_historical_membership
          ? "HISTORICAL_NOT_CURRENT"
          : "NEVER_ASSEMBLED";

  if (
    row
      .membership_classification !==
    expectedMembershipClassification
  ) {
    throw new Error(
      `Reservoir membership classification lookup returned inconsistent lifecycle state for evidence ${evidenceId}.`,
    );
  }

  membershipClassifications.set(
    evidenceId,
    {
      hasCurrentEffectiveMembership:
        row
          .has_current_effective_membership,

      membershipClassification:
        row
          .membership_classification,
    },
  );
}


/**
 * Shared bounded Reservoir evidence revalidation boundary.
 *
 * This function deliberately centralizes the semantics previously embedded
 * in B06B so discovery and future explicit pair scheduling use the same
 * current-state authority:
 *
 * - persisted HSPP evidence is read and integrity-verified;
 * - existing HSPP operational-use policy is evaluated;
 * - Q14ag8 lifecycle membership classification is read;
 * - classification calls are chunked to the authoritative 100-id bound;
 * - hasAssemblyMembership derives ONLY from current-effective membership;
 * - B06A Reservoir eligibility remains authoritative.
 *
 * Historical membership remains immutable. HISTORICAL_NOT_CURRENT is
 * metadata for lifecycle routing; it does not bypass B06A.
 *
 * This server-side boundary requires a service-role-authorized Supabase
 * client because Q14ag8 is service-role-only.
 *
 * This boundary does NOT:
 *
 * - discover evidence;
 * - schedule pair work;
 * - advance a scheduling cursor;
 * - create or mutate an evidence assembly;
 * - evaluate pairwise B11A2 membership;
 * - persist reconstruction;
 * - establish physical-world truth;
 * - promote evidence trust;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility.
 */
export async function readHsppReservoirEligibleEvidenceByIds({
  supabase,
  organizationId,
  evidenceIds,
}: ReadHsppReservoirEligibleEvidenceByIdsInput): Promise<
  HsppReservoirEligibleEvidence[]
> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  const normalizedEvidenceIds =
    normalizeEvidenceIds(
      evidenceIds,
    );

  if (
    normalizedEvidenceIds.length ===
    0
  ) {
    return [];
  }

  const operationalResults =
    await readHsppEvidenceBatchForOperationalUse({
      supabase,

      organizationId:
        normalizedOrganizationId,

      evidenceIds:
        normalizedEvidenceIds,
    });


  const membershipClassifications =
    new Map<
      string,
      MembershipClassificationState
    >();


  for (
    let offset = 0;
    offset <
      normalizedEvidenceIds.length;
    offset +=
      HSPP_RESERVOIR_REVALIDATION_CLASSIFICATION_CHUNK_MAX
  ) {
    const evidenceIdChunk =
      normalizedEvidenceIds.slice(
        offset,
        offset +
          HSPP_RESERVOIR_REVALIDATION_CLASSIFICATION_CHUNK_MAX,
      );

    const requestedChunk =
      new Set(
        evidenceIdChunk,
      );

    const {
      data:
        membershipClassificationRows,
      error:
        membershipClassificationError,
    } =
      await supabase.rpc(
        "read_hspp_evidence_assembly_membership_classifications",
        {
          p_organization_id:
            normalizedOrganizationId,

          p_evidence_ids:
            evidenceIdChunk,
        },
      );

    if (
      membershipClassificationError
    ) {
      throw membershipClassificationError;
    }

    if (
      !Array.isArray(
        membershipClassificationRows,
      )
    ) {
      throw new Error(
        "Reservoir membership classification lookup returned an invalid row set.",
      );
    }

    for (
      const row of
        membershipClassificationRows as
          MembershipClassificationRow[]
    ) {
      validateAndStoreMembershipRow(
        row,
        requestedChunk,
        membershipClassifications,
      );
    }
  }


  const candidates:
    HsppReservoirEligibleEvidence[] =
      [];


  for (
    const evidenceId of
    normalizedEvidenceIds
  ) {
    const operationalRead =
      operationalResults.get(
        evidenceId,
      );

    if (!operationalRead) {
      throw new Error(
        `Operational HSPP read result missing for evidence ${evidenceId}.`,
      );
    }

    const membershipState =
      membershipClassifications.get(
        evidenceId,
      );

    if (!membershipState) {
      throw new Error(
        `Reservoir membership classification missing for evidence ${evidenceId}.`,
      );
    }

    const hasAssemblyMembership =
      membershipState
        .hasCurrentEffectiveMembership;

    const reservoirDecision =
      evaluateHsppReservoirEligibility({
        operationalUseDecision:
          operationalRead.decision,

        hasAssemblyMembership,
      });

    if (
      !reservoirDecision.eligible
    ) {
      continue;
    }

    candidates.push({
      evidenceId,

      operationalRead,

      hasAssemblyMembership,

      membershipClassification:
        membershipState
          .membershipClassification,

      reservoirDecision,
    });
  }

  return candidates;
}
