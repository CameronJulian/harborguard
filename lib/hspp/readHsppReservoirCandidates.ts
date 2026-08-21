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

export type ReadHsppReservoirCandidatesInput = {
  supabase: SupabaseClient;
  organizationId: string;
  limit?: number;
};

export type HsppReservoirCandidate = {
  evidenceId: string;

  operationalRead: ReadHsppEvidenceForOperationalUseResult;

  hasAssemblyMembership: boolean;

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

  const { data: membershipRows, error: membershipError } = await supabase
    .from("hspp_evidence_assembly_members")
    .select("evidence_id")
    .eq("organization_id", normalizedOrganizationId)
    .in("evidence_id", evidenceIds);

  if (membershipError) {
    throw membershipError;
  }

  const assembledEvidenceIds = new Set(
    (
      (membershipRows || []) as Array<{
        evidence_id: unknown;
      }>
    ).map((row) => {
      if (typeof row.evidence_id !== "string" || !row.evidence_id.trim()) {
        throw new Error(
          "Reservoir membership lookup returned an invalid HSPP evidence id.",
        );
      }

      return row.evidence_id;
    }),
  );

  const candidates: HsppReservoirCandidate[] = [];

  for (const evidenceId of evidenceIds) {
    const operationalRead = operationalResults.get(evidenceId);

    if (!operationalRead) {
      throw new Error(
        `Operational HSPP read result missing for evidence ${evidenceId}.`,
      );
    }

    const hasAssemblyMembership = assembledEvidenceIds.has(evidenceId);

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
