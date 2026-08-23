import type { SupabaseClient } from "@supabase/supabase-js";

import {
  readHsppEvidenceBatchForOperationalUse,
  type ReadHsppEvidenceForOperationalUseResult,
} from "@/lib/hspp/readHsppEvidenceForOperationalUse";

import {
  evaluateHsppReservoirEligibility,
  type HsppReservoirEligibilityDecision,
} from "@/lib/hspp/evaluateHsppReservoirEligibility";

export const HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION =
  "hspp-reservoir-discovery-v1" as const;

export const HSPP_RESERVOIR_DISCOVERY_MAX_LIMIT = 100;

export type HsppEvidenceAssemblyMembershipClassification =
  | "NEVER_ASSEMBLED"
  | "HISTORICAL_NOT_CURRENT"
  | "CURRENT_EFFECTIVE";

export type ReadHsppReservoirCandidatesInput = {
  supabase: SupabaseClient;
  organizationId: string;
  limit?: number;
};

export type HsppReservoirCandidate = {
  evidenceId: string;

  operationalRead: ReadHsppEvidenceForOperationalUseResult;

  hasAssemblyMembership: boolean;

  membershipClassification: HsppEvidenceAssemblyMembershipClassification;

  reservoirDecision: HsppReservoirEligibilityDecision;
};

export type ReadHsppReservoirCandidatesResult = {
  policyVersion: typeof HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION;

  organizationId: string;

  requestedLimit: number;

  candidates: HsppReservoirCandidate[];
};

function requireNonBlank(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeLimit(limit: number | undefined): number {
  const normalized = limit ?? HSPP_RESERVOIR_DISCOVERY_MAX_LIMIT;

  if (
    !Number.isInteger(normalized) ||
    normalized <= 0 ||
    normalized > HSPP_RESERVOIR_DISCOVERY_MAX_LIMIT
  ) {
    throw new Error(
      `limit must be an integer between 1 and ${HSPP_RESERVOIR_DISCOVERY_MAX_LIMIT}.`,
    );
  }

  return normalized;
}

/**
 * B7490-06B bounded Reservoir discovery/read boundary.
 *
 * This reader discovers persisted HSPP evidence that may remain
 * available outside an assembly for later consideration.
 *
 * It deliberately reuses:
 *
 * - existing HSPP persisted evidence verification;
 * - existing HSPP operational-use policy;
 * - existing assembly membership persistence;
 * - B7490-06A Reservoir eligibility.
 *
 * B06B does NOT:
 *
 * - create or mutate an evidence assembly;
 * - evaluate pairwise assembly membership;
 * - establish physical-world truth;
 * - promote evidence trust;
 * - grant Route Safety authority;
 * - grant Crowd Intelligence eligibility;
 * - grant ML training or validation eligibility;
 * - schedule retry or background processing.
 */
export async function readHsppReservoirCandidates({
  supabase,
  organizationId,
  limit,
}: ReadHsppReservoirCandidatesInput): Promise<ReadHsppReservoirCandidatesResult> {
  const normalizedOrganizationId = requireNonBlank(
    organizationId,
    "organizationId",
  );

  const normalizedLimit = normalizeLimit(limit);

  const { data: evidenceRows, error: evidenceError } = await supabase
    .from("hspp_evidence")
    .select("id")
    .eq("organization_id", normalizedOrganizationId)
    .order("observed_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(normalizedLimit);

  if (evidenceError) {
    throw evidenceError;
  }

  const evidenceIds = (
    (evidenceRows || []) as Array<{
      id: unknown;
    }>
  ).map((row) => {
    if (typeof row.id !== "string" || !row.id.trim()) {
      throw new Error(
        "Reservoir discovery returned an invalid HSPP evidence id.",
      );
    }

    return row.id;
  });

  if (evidenceIds.length === 0) {
    return {
      policyVersion: HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,

      organizationId: normalizedOrganizationId,

      requestedLimit: normalizedLimit,

      candidates: [],
    };
  }

  const operationalResults = await readHsppEvidenceBatchForOperationalUse({
    supabase,
    organizationId: normalizedOrganizationId,
    evidenceIds,
  });

  // Q14ag8 is a service-role-only read authority. This server-side
  // boundary therefore requires a service-role-authorized Supabase client
  // whenever Reservoir discovery is executed.
  //
  // Historical assembly membership remains immutable.
  //
  // Reservoir exclusion continues to depend ONLY on current-effective
  // membership, preserving the exact boolean supplied to B06A.
  //
  // The same single database statement snapshot additionally classifies
  // the immutable membership lifecycle as NEVER_ASSEMBLED,
  // HISTORICAL_NOT_CURRENT or CURRENT_EFFECTIVE. That classification is
  // metadata only here: it grants no assembly, reconstruction, trust or
  // downstream authority.
  const {
    data: membershipClassificationRows,
    error: membershipClassificationError,
  } = await supabase.rpc(
    "read_hspp_evidence_assembly_membership_classifications",
    {
      p_organization_id: normalizedOrganizationId,
      p_evidence_ids: evidenceIds,
    },
  );

  if (membershipClassificationError) {
    throw membershipClassificationError;
  }

  const membershipClassifications = new Map<
    string,
    {
      hasCurrentEffectiveMembership: boolean;
      membershipClassification: HsppEvidenceAssemblyMembershipClassification;
    }
  >();

  for (
    const row of
      (membershipClassificationRows || []) as Array<{
        evidence_id: unknown;
        has_historical_membership: unknown;
        has_current_effective_membership: unknown;
        membership_classification: unknown;
      }>
  ) {
    if (
      typeof row.evidence_id !== "string" ||
      !row.evidence_id.trim()
    ) {
      throw new Error(
        "Reservoir membership classification lookup returned an invalid HSPP evidence id.",
      );
    }

    if (
      typeof row.has_historical_membership !== "boolean" ||
      typeof row.has_current_effective_membership !== "boolean"
    ) {
      throw new Error(
        `Reservoir membership classification lookup returned invalid membership flags for evidence ${row.evidence_id}.`,
      );
    }

    if (
      row.has_current_effective_membership &&
      !row.has_historical_membership
    ) {
      throw new Error(
        `Reservoir membership classification lookup returned impossible current-without-history state for evidence ${row.evidence_id}.`,
      );
    }

    if (
      row.membership_classification !== "NEVER_ASSEMBLED" &&
      row.membership_classification !== "HISTORICAL_NOT_CURRENT" &&
      row.membership_classification !== "CURRENT_EFFECTIVE"
    ) {
      throw new Error(
        `Reservoir membership classification lookup returned an invalid lifecycle classification for evidence ${row.evidence_id}.`,
      );
    }

    const evidenceId =
      row.evidence_id.trim();

    if (!evidenceIds.includes(evidenceId)) {
      throw new Error(
        `Reservoir membership classification lookup returned unexpected evidence ${evidenceId}.`,
      );
    }

    if (membershipClassifications.has(evidenceId)) {
      throw new Error(
        `Reservoir membership classification lookup returned duplicate evidence ${evidenceId}.`,
      );
    }

    const expectedMembershipClassification:
      HsppEvidenceAssemblyMembershipClassification =
        row.has_current_effective_membership
          ? "CURRENT_EFFECTIVE"
          : row.has_historical_membership
            ? "HISTORICAL_NOT_CURRENT"
            : "NEVER_ASSEMBLED";

    if (
      row.membership_classification !==
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
          row.has_current_effective_membership,

        membershipClassification:
          row.membership_classification,
      },
    );
  }

  const candidates: HsppReservoirCandidate[] = [];

  for (const evidenceId of evidenceIds) {
    const operationalRead = operationalResults.get(evidenceId);

    if (!operationalRead) {
      throw new Error(
        `Operational HSPP read result missing for evidence ${evidenceId}.`,
      );
    }

    const membershipState =
      membershipClassifications.get(evidenceId);

    if (!membershipState) {
      throw new Error(
        `Reservoir membership classification missing for evidence ${evidenceId}.`,
      );
    }

    const hasAssemblyMembership =
      membershipState.hasCurrentEffectiveMembership;

    const reservoirDecision = evaluateHsppReservoirEligibility({
      operationalUseDecision: operationalRead.decision,

      hasAssemblyMembership,
    });

    if (!reservoirDecision.eligible) {
      continue;
    }

    candidates.push({
      evidenceId,

      operationalRead,

      hasAssemblyMembership,

      membershipClassification:
        membershipState.membershipClassification,

      reservoirDecision,
    });
  }

  return {
    policyVersion: HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,

    organizationId: normalizedOrganizationId,

    requestedLimit: normalizedLimit,

    candidates,
  };
}
