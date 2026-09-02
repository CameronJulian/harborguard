import type { SupabaseClient } from "@supabase/supabase-js";

import {
  HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,
  evaluateHsppReservoirEligibility,
} from "./evaluateHsppReservoirEligibility";

import {
  readHsppEvidenceForOperationalUse,
  type ReadHsppEvidenceForOperationalUseResult,
} from "./readHsppEvidenceForOperationalUse";

import {
  HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,
  type HsppEvidenceAssemblyMembershipClassification,
  type HsppReservoirCandidate,
} from "./readHsppReservoirCandidates";


export const HSPP_RECONSTRUCTION_INTENT_REPLACEMENT_CANDIDATE_READER_VERSION =
  "hspp-reconstruction-intent-replacement-candidate-reader-v1" as const;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


type RawMembershipClassificationRow = {
  evidence_id: unknown;
  has_historical_membership: unknown;
  has_current_effective_membership: unknown;
  membership_classification: unknown;
};


export type ValidateHsppReconstructionIntentReplacementCandidateSnapshotInput = {
  organizationId: string;

  replacementEvidenceId: string;

  replacementEvidenceIntegrityFingerprint: string;

  discoveryPolicyVersion: string;

  operationalRead: ReadHsppEvidenceForOperationalUseResult;

  membershipClassificationRow: RawMembershipClassificationRow;
};


export type ReadHsppReconstructionIntentReplacementCandidateCoreInput = {
  supabase: SupabaseClient;

  organizationId: string;

  replacementEvidenceId: string;

  replacementEvidenceIntegrityFingerprint: string;

  reservoirEligibilityPolicyVersion: string;
};


export type ReadHsppReconstructionIntentReplacementCandidateCoreResult = {
  organizationId: string;

  replacementEvidenceId: string;

  reservoirEligibilityPolicyVersion:
    typeof HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION;

  candidate: HsppReservoirCandidate;
};

export type ReadHsppReconstructionIntentReplacementCandidateInput = {
  supabase: SupabaseClient;

  organizationId: string;

  replacementEvidenceId: string;

  replacementEvidenceIntegrityFingerprint: string;

  discoveryPolicyVersion: string;
};


export type ReadHsppReconstructionIntentReplacementCandidateResult = {
  readerVersion:
    typeof HSPP_RECONSTRUCTION_INTENT_REPLACEMENT_CANDIDATE_READER_VERSION;

  discoveryPolicyVersion:
    typeof HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION;

  organizationId: string;

  replacementEvidenceId: string;

  candidate: HsppReservoirCandidate;
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
      `${fieldName} must be a non-blank string.`,
    );
  }

  return value.trim();
}


function requireSha256(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName,
    );

  if (!SHA256_PATTERN.test(normalized)) {
    throw new Error(
      `${fieldName} must be a lowercase SHA-256 fingerprint.`,
    );
  }

  return normalized;
}


/**
 * Q14ag31H pure exact-snapshot validator.
 *
 * This validates one replacement identity already fixed by the durable
 * reconstruction execution intent. It does not perform Reservoir discovery
 * and does not select an alternative replacement.
 */
export type ValidateHsppReconstructionIntentReplacementCandidateCoreSnapshotInput = {
  organizationId: string;

  replacementEvidenceId: string;

  replacementEvidenceIntegrityFingerprint: string;

  reservoirEligibilityPolicyVersion: string;

  operationalRead: ReadHsppEvidenceForOperationalUseResult;

  membershipClassificationRow: RawMembershipClassificationRow;
};


/**
 * Q14ag33E1 producer-neutral exact replacement snapshot validator.
 *
 * This owns only invariants common to every durable reconstruction
 * selection producer:
 *
 * - exact replacement identity and integrity fingerprint;
 * - exact organization ownership;
 * - exact lifecycle classification;
 * - NEVER_ASSEMBLED replacement status;
 * - current B06A Reservoir eligibility;
 * - durable/current B06A policy-version agreement.
 *
 * It deliberately owns no B07B discovery policy validation and no
 * scheduled-pair provenance validation.
 */
export function validateHsppReconstructionIntentReplacementCandidateCoreSnapshot({
  organizationId: rawOrganizationId,
  replacementEvidenceId: rawReplacementEvidenceId,
  replacementEvidenceIntegrityFingerprint:
    rawReplacementEvidenceIntegrityFingerprint,
  reservoirEligibilityPolicyVersion:
    rawReservoirEligibilityPolicyVersion,
  operationalRead,
  membershipClassificationRow,
}: ValidateHsppReconstructionIntentReplacementCandidateCoreSnapshotInput): HsppReservoirCandidate {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );

  const replacementEvidenceId =
    requireNonBlank(
      rawReplacementEvidenceId,
      "replacementEvidenceId",
    );

  const authorizedFingerprint =
    requireSha256(
      rawReplacementEvidenceIntegrityFingerprint,
      "replacementEvidenceIntegrityFingerprint",
    );

  const reservoirEligibilityPolicyVersion =
    requireNonBlank(
      rawReservoirEligibilityPolicyVersion,
      "reservoirEligibilityPolicyVersion",
    );

  if (
    reservoirEligibilityPolicyVersion !==
      HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION
  ) {
    throw new Error(
      "Durable reconstruction intent Reservoir eligibility policy does not match the current B06A authority.",
    );
  }

  if (
    !membershipClassificationRow ||
    typeof membershipClassificationRow !== "object"
  ) {
    throw new Error(
      "Exact replacement membership classification row is required.",
    );
  }

  const classifiedEvidenceId =
    requireNonBlank(
      membershipClassificationRow.evidence_id,
      "membershipClassificationRow.evidence_id",
    );

  if (
    classifiedEvidenceId !==
    replacementEvidenceId
  ) {
    throw new Error(
      "Replacement membership classification returned a different evidence identity.",
    );
  }

  if (
    typeof membershipClassificationRow.has_historical_membership !==
      "boolean" ||
    typeof membershipClassificationRow.has_current_effective_membership !==
      "boolean"
  ) {
    throw new Error(
      "Replacement membership classification returned invalid lifecycle flags.",
    );
  }

  const hasHistoricalMembership =
    membershipClassificationRow.has_historical_membership;

  const hasCurrentEffectiveMembership =
    membershipClassificationRow.has_current_effective_membership;

  const expectedMembershipClassification:
    HsppEvidenceAssemblyMembershipClassification =
      hasCurrentEffectiveMembership
        ? "CURRENT_EFFECTIVE"
        : hasHistoricalMembership
          ? "HISTORICAL_NOT_CURRENT"
          : "NEVER_ASSEMBLED";

  if (
    membershipClassificationRow.membership_classification !==
    expectedMembershipClassification
  ) {
    throw new Error(
      "Replacement membership classification returned inconsistent lifecycle state.",
    );
  }

  if (
    hasHistoricalMembership ||
    hasCurrentEffectiveMembership ||
    expectedMembershipClassification !==
      "NEVER_ASSEMBLED"
  ) {
    throw new Error(
      "Durable reconstruction replacement must remain lifecycle-classified NEVER_ASSEMBLED.",
    );
  }

  const evidence =
    operationalRead?.evidence;

  if (!evidence) {
    throw new Error(
      `Replacement evidence ${replacementEvidenceId} has no persisted operational evidence.`,
    );
  }

  const persistedEvidenceId =
    requireNonBlank(
      evidence.id,
      "operationalRead.evidence.id",
    );

  if (
    persistedEvidenceId !==
    replacementEvidenceId
  ) {
    throw new Error(
      "Persisted replacement evidence identity does not match the durable reconstruction intent.",
    );
  }

  const persistedOrganizationId =
    requireNonBlank(
      evidence.organizationId,
      "operationalRead.evidence.organizationId",
    );

  if (
    persistedOrganizationId !==
    organizationId
  ) {
    throw new Error(
      "Persisted replacement evidence belongs to a different organization.",
    );
  }

  const persistedFingerprint =
    requireSha256(
      evidence.integrityFingerprint,
      "operationalRead.evidence.integrityFingerprint",
    );

  if (
    persistedFingerprint !==
    authorizedFingerprint
  ) {
    throw new Error(
      "Persisted replacement evidence fingerprint does not match the durable reconstruction intent.",
    );
  }

  const hasAssemblyMembership =
    hasCurrentEffectiveMembership;

  const reservoirDecision =
    evaluateHsppReservoirEligibility({
      operationalUseDecision:
        operationalRead.decision,

      hasAssemblyMembership,
    });

  if (
    reservoirDecision.policyVersion !==
      reservoirEligibilityPolicyVersion
  ) {
    throw new Error(
      "Revalidated replacement Reservoir eligibility policy does not match the durable reconstruction intent.",
    );
  }

  if (!reservoirDecision.eligible) {
    throw new Error(
      `Durable reconstruction replacement ${replacementEvidenceId} is no longer Reservoir eligible (${reservoirDecision.reason}).`,
    );
  }

  return {
    evidenceId:
      replacementEvidenceId,

    operationalRead,

    hasAssemblyMembership,

    membershipClassification:
      "NEVER_ASSEMBLED",

    reservoirDecision,
  };
}


/**
 * Q14ag31H legacy B07B exact-snapshot validator.
 *
 * B07B discovery provenance remains mandatory and current.
 * Common evidence, lifecycle and B06A validation is delegated to
 * the Q14ag33E1 producer-neutral core.
 */
export function validateHsppReconstructionIntentReplacementCandidateSnapshot({
  organizationId: rawOrganizationId,
  replacementEvidenceId: rawReplacementEvidenceId,
  replacementEvidenceIntegrityFingerprint:
    rawReplacementEvidenceIntegrityFingerprint,
  discoveryPolicyVersion: rawDiscoveryPolicyVersion,
  operationalRead,
  membershipClassificationRow,
}: ValidateHsppReconstructionIntentReplacementCandidateSnapshotInput): HsppReservoirCandidate {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );

  const replacementEvidenceId =
    requireNonBlank(
      rawReplacementEvidenceId,
      "replacementEvidenceId",
    );

  const authorizedFingerprint =
    requireSha256(
      rawReplacementEvidenceIntegrityFingerprint,
      "replacementEvidenceIntegrityFingerprint",
    );

  const discoveryPolicyVersion =
    requireNonBlank(
      rawDiscoveryPolicyVersion,
      "discoveryPolicyVersion",
    );

  if (
    discoveryPolicyVersion !==
      HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION
  ) {
    throw new Error(
      "Durable reconstruction intent discovery policy does not match the current Reservoir discovery authority.",
    );
  }

  return validateHsppReconstructionIntentReplacementCandidateCoreSnapshot({
    organizationId,

    replacementEvidenceId,

    replacementEvidenceIntegrityFingerprint:
      authorizedFingerprint,

    reservoirEligibilityPolicyVersion:
      HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,

    operationalRead,

    membershipClassificationRow,
  });
}

/**
 * Q14ag33E2A producer-neutral exact replacement hydration IO.
 *
 * This boundary owns only the exact persisted evidence read,
 * exact membership-classification read and Q14ag33E1 shared
 * evidence/lifecycle/B06A validation.
 *
 * It owns no B07B discovery provenance, PAIR scheduling provenance,
 * replacement discovery, pair reevaluation, reconstruction, sealing,
 * assessment, scheduling or authority transition.
 */
export async function readHsppReconstructionIntentReplacementCandidateCore({
  supabase,
  organizationId: rawOrganizationId,
  replacementEvidenceId: rawReplacementEvidenceId,
  replacementEvidenceIntegrityFingerprint:
    rawReplacementEvidenceIntegrityFingerprint,
  reservoirEligibilityPolicyVersion:
    rawReservoirEligibilityPolicyVersion,
}: ReadHsppReconstructionIntentReplacementCandidateCoreInput): Promise<ReadHsppReconstructionIntentReplacementCandidateCoreResult> {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );

  const replacementEvidenceId =
    requireNonBlank(
      rawReplacementEvidenceId,
      "replacementEvidenceId",
    );

  const replacementEvidenceIntegrityFingerprint =
    requireSha256(
      rawReplacementEvidenceIntegrityFingerprint,
      "replacementEvidenceIntegrityFingerprint",
    );

  const reservoirEligibilityPolicyVersion =
    requireNonBlank(
      rawReservoirEligibilityPolicyVersion,
      "reservoirEligibilityPolicyVersion",
    );

  if (
    !supabase ||
    typeof (
      supabase as unknown as {
        rpc?: unknown;
      }
    ).rpc !== "function"
  ) {
    throw new Error(
      "A trusted service-role Supabase client is required.",
    );
  }

  const operationalRead =
    await readHsppEvidenceForOperationalUse({
      supabase,
      organizationId,
      evidenceId:
        replacementEvidenceId,
    });

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
          organizationId,

        p_evidence_ids: [
          replacementEvidenceId,
        ],
      },
    );

  if (membershipClassificationError) {
    throw membershipClassificationError;
  }

  if (
    !Array.isArray(
      membershipClassificationRows,
    )
  ) {
    throw new Error(
      "Exact replacement membership classification did not return an array.",
    );
  }

  if (
    membershipClassificationRows.length !==
    1
  ) {
    throw new Error(
      "Exact durable reconstruction replacement must resolve to exactly one lifecycle-classification row.",
    );
  }

  const candidate =
    validateHsppReconstructionIntentReplacementCandidateCoreSnapshot({
      organizationId,

      replacementEvidenceId,

      replacementEvidenceIntegrityFingerprint,

      reservoirEligibilityPolicyVersion,
      operationalRead,

      membershipClassificationRow:
        membershipClassificationRows[0] as
          RawMembershipClassificationRow,
    });

  return {
    organizationId,

    replacementEvidenceId,

    reservoirEligibilityPolicyVersion:
      HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,

    candidate,
  };
}

/**
 * Q14ag31H exact durable replacement-candidate hydration boundary.
 *
 * It performs only:
 *
 * - exact persisted operational-evidence read;
 * - exact Q14ag8 lifecycle classification;
 * - B06A Reservoir eligibility evaluation;
 * - immutable replacement identity/fingerprint validation.
 *
 * It performs no Reservoir discovery, pair reevaluation, reconstruction,
 * sealing, assessment or scheduling.
 */
export async function readHsppReconstructionIntentReplacementCandidate({
  supabase,
  organizationId: rawOrganizationId,
  replacementEvidenceId: rawReplacementEvidenceId,
  replacementEvidenceIntegrityFingerprint:
    rawReplacementEvidenceIntegrityFingerprint,
  discoveryPolicyVersion: rawDiscoveryPolicyVersion,
}: ReadHsppReconstructionIntentReplacementCandidateInput): Promise<ReadHsppReconstructionIntentReplacementCandidateResult> {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );

  const replacementEvidenceId =
    requireNonBlank(
      rawReplacementEvidenceId,
      "replacementEvidenceId",
    );

  const replacementEvidenceIntegrityFingerprint =
    requireSha256(
      rawReplacementEvidenceIntegrityFingerprint,
      "replacementEvidenceIntegrityFingerprint",
    );

  const discoveryPolicyVersion =
    requireNonBlank(
      rawDiscoveryPolicyVersion,
      "discoveryPolicyVersion",
    );

  if (
    discoveryPolicyVersion !==
    HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION
  ) {
    throw new Error(
      "Durable reconstruction intent discovery policy does not match the current Reservoir discovery authority.",
    );
  }
  const coreRead =
    await readHsppReconstructionIntentReplacementCandidateCore({
      supabase,

      organizationId,

      replacementEvidenceId,

      replacementEvidenceIntegrityFingerprint,

      reservoirEligibilityPolicyVersion:
        HSPP_RESERVOIR_ELIGIBILITY_POLICY_VERSION,
    });

  return {
    readerVersion:
      HSPP_RECONSTRUCTION_INTENT_REPLACEMENT_CANDIDATE_READER_VERSION,

    discoveryPolicyVersion:
      HSPP_RESERVOIR_DISCOVERY_POLICY_VERSION,

    organizationId:
      coreRead.organizationId,

    replacementEvidenceId:
      coreRead.replacementEvidenceId,

    candidate:
      coreRead.candidate,
  };
}
