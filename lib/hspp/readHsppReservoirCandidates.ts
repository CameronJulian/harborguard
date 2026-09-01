import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ReadHsppEvidenceForOperationalUseResult,
} from "@/lib/hspp/readHsppEvidenceForOperationalUse";

import type {
  HsppReservoirEligibilityDecision,
} from "@/lib/hspp/evaluateHsppReservoirEligibility";

import {
  readHsppReservoirEligibleEvidenceByIds,
} from "@/lib/hspp/readHsppReservoirEligibleEvidenceByIds";

import {
  HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION,
  readHsppReservoirDiscoveryPage,
  type HsppReservoirDiscoveryCursor,
} from "@/lib/hspp/readHsppReservoirDiscoveryPage";


export const HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION =
  "hspp-reservoir-discovery-v1" as const;


export const HSPP_RESERVOIR_DISCOVERY_MAX_LIMIT =
  100;


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

  operationalRead:
    ReadHsppEvidenceForOperationalUseResult;

  hasAssemblyMembership: boolean;

  membershipClassification:
    HsppEvidenceAssemblyMembershipClassification;

  reservoirDecision:
    HsppReservoirEligibilityDecision;
};


export type ReadHsppReservoirCandidatesResult = {
  policyVersion:
    typeof HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION;

  organizationId: string;

  requestedLimit: number;

  scheduling?: {
    version:
      typeof HSPP_RESERVOIR_DISCOVERY_SCHEDULING_VERSION;

    expectedCursor:
      HsppReservoirDiscoveryCursor | null;

    proposedCursor:
      HsppReservoirDiscoveryCursor | null;

    rawEvidenceCount:
      number;
  };

  candidates:
    HsppReservoirCandidate[];
};


function requireNonBlank(
  value: string,
  fieldName: string,
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return normalized;
}


function normalizeLimit(
  limit:
    number | undefined,
): number {
  const normalized =
    limit ??
    HSPP_RESERVOIR_DISCOVERY_MAX_LIMIT;

  if (
    !Number.isInteger(
      normalized,
    ) ||
    normalized <= 0 ||
    normalized >
      HSPP_RESERVOIR_DISCOVERY_MAX_LIMIT
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
 * It deliberately delegates current-state evidence revalidation to the
 * shared Reservoir evidence-id boundary. That shared boundary preserves:
 *
 * - existing HSPP persisted evidence verification;
 * - existing HSPP operational-use policy;
 * - Q14ag8 lifecycle membership classification;
 * - current-effective-only assembly exclusion;
 * - B7490-06A Reservoir eligibility.
 *
 * Q14ag8 remains service-role-only, so Reservoir discovery still requires
 * a service-role-authorized Supabase client.
 *
 * Historical assembly membership remains immutable.
 * HISTORICAL_NOT_CURRENT remains eligible only when B06A independently
 * permits Reservoir eligibility.
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
}: ReadHsppReservoirCandidatesInput): Promise<
  ReadHsppReservoirCandidatesResult
> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId",
    );

  const normalizedLimit =
    normalizeLimit(
      limit,
    );

  const discoveryPage =
    await readHsppReservoirDiscoveryPage({
      supabase,

      organizationId:
        normalizedOrganizationId,

      limit:
        normalizedLimit,
    });


  const evidenceIds =
    discoveryPage.items.map(
      (item) =>
        item.evidenceId,
    );


  if (
    evidenceIds.length ===
    0
  ) {
    return {
      policyVersion:
        HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,

      organizationId:
        normalizedOrganizationId,

      requestedLimit:
        normalizedLimit,

      scheduling: {
        version:
          discoveryPage
            .schedulingVersion,

        expectedCursor:
          discoveryPage
            .expectedCursor,

        proposedCursor:
          discoveryPage
            .proposedCursor,

        rawEvidenceCount:
          discoveryPage
            .items.length,
      },

      candidates: [],
    };
  }


  const candidates:
    HsppReservoirCandidate[] =
      await readHsppReservoirEligibleEvidenceByIds({
        supabase,

        organizationId:
          normalizedOrganizationId,

        evidenceIds,
      });


  return {
    policyVersion:
      HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,

    organizationId:
      normalizedOrganizationId,

    requestedLimit:
      normalizedLimit,

    scheduling: {
      version:
        discoveryPage
          .schedulingVersion,

      expectedCursor:
        discoveryPage
          .expectedCursor,

      proposedCursor:
        discoveryPage
          .proposedCursor,

      rawEvidenceCount:
        discoveryPage
          .items.length,
    },

    candidates,
  };
}
