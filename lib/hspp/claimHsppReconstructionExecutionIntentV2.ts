import type {
  SupabaseClient,
} from "@supabase/supabase-js";


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_WRAPPER_VERSION =
  "hspp-reconstruction-execution-intent-claim-v2-wrapper-v1" as const;

export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RPC =
  "claim_hspp_reconstruction_execution_intent_v2" as const;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


export type HsppReconstructionExecutionIntentClaimV2Selection =
  | {
      selectionSource:
        "B07B_DISCOVERY";

      discoveryPolicyVersion:
        string;

      pairSchedulingVersion:
        null;
    }
  | {
      selectionSource:
        "SCHEDULED_PAIR";

      discoveryPolicyVersion:
        null;

      pairSchedulingVersion:
        string;
    };


export type ClaimHsppReconstructionExecutionIntentV2Input = {
  /**
   * Trusted service-role Supabase client.
   *
   * The deployed successor RPC is service-role only.
   */
  supabase:
    SupabaseClient;

  organizationId:
    string;

  /**
   * Caller-proposed child UUID.
   *
   * The database remains authoritative for canonical child recovery.
   * This wrapper never generates a UUID.
   */
  proposedChildAssemblyId:
    string;

  selectedFirstEvidenceId:
    string;

  selectedSecondEvidenceId:
    string;

  historicalEvidenceId:
    string;

  historicalEvidenceIntegrityFingerprint:
    string;

  replacementEvidenceId:
    string;

  replacementEvidenceIntegrityFingerprint:
    string;

  /**
   * Producer-specific selection provenance.
   *
   * B07B_DISCOVERY:
   * - discoveryPolicyVersion is required;
   * - pairSchedulingVersion must be null.
   *
   * SCHEDULED_PAIR:
   * - discoveryPolicyVersion must be null;
   * - pairSchedulingVersion is required.
   */
  selection:
    HsppReconstructionExecutionIntentClaimV2Selection;

  /**
   * Producer-neutral B06A semantic provenance.
   */
  reservoirEligibilityPolicyVersion:
    string;

  reevaluationPolicyVersion:
    string;

  membershipPolicyVersion:
    string;

  reconstructionPolicyVersion:
    string;

  reconstructionReason:
    string;
};


export type ClaimedHsppReconstructionExecutionIntentV2 = {
  claimWrapperVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_WRAPPER_VERSION;

  intentId:
    string;

  organizationId:
    string;

  proposedChildAssemblyId:
    string;

  childAssemblyId:
    string;

  selectedFirstEvidenceId:
    string;

  selectedSecondEvidenceId:
    string;

  historicalEvidenceId:
    string;

  historicalEvidenceIntegrityFingerprint:
    string;

  replacementEvidenceId:
    string;

  replacementEvidenceIntegrityFingerprint:
    string;

  selectionSource:
    "B07B_DISCOVERY" |
    "SCHEDULED_PAIR";

  discoveryPolicyVersion:
    string | null;

  pairSchedulingVersion:
    string | null;

  reservoirEligibilityPolicyVersion:
    string;

  reevaluationPolicyVersion:
    string;

  membershipPolicyVersion:
    string;

  reconstructionPolicyVersion:
    string;

  reconstructionReason:
    string;

  intentVersion:
    string;

  createdAt:
    string;

  idempotentRecovery:
    boolean;
};


type ClaimV2RpcRow = {
  intent_id?:
    unknown;

  organization_id?:
    unknown;

  child_assembly_id?:
    unknown;

  selected_first_evidence_id?:
    unknown;

  selected_second_evidence_id?:
    unknown;

  historical_evidence_id?:
    unknown;

  historical_evidence_integrity_fingerprint?:
    unknown;

  replacement_evidence_id?:
    unknown;

  replacement_evidence_integrity_fingerprint?:
    unknown;

  selection_source?:
    unknown;

  discovery_policy_version?:
    unknown;

  pair_scheduling_version?:
    unknown;

  reservoir_eligibility_policy_version?:
    unknown;

  reevaluation_policy_version?:
    unknown;

  membership_policy_version?:
    unknown;

  reconstruction_policy_version?:
    unknown;

  reconstruction_reason?:
    unknown;

  intent_version?:
    unknown;

  created_at?:
    unknown;

  idempotent_recovery?:
    unknown;
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
      `${fieldName} must be a non-empty string.`,
    );
  }

  return value.trim();
}


function requireNullableString(
  value: unknown,
  fieldName: string,
): string | null {
  if (value === null) {
    return null;
  }

  return requireNonBlank(
    value,
    fieldName,
  );
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
      `${fieldName} must be lowercase SHA-256.`,
    );
  }

  return normalized;
}


function requireBoolean(
  value: unknown,
  fieldName: string,
): boolean {
  if (typeof value !== "boolean") {
    throw new Error(
      `${fieldName} must be boolean.`,
    );
  }

  return value;
}


function requireTimestamp(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName,
    );

  if (
    Number.isNaN(
      Date.parse(normalized),
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`,
    );
  }

  return normalized;
}


function requireExactEcho(
  fieldName: string,
  actual: string | null,
  expected: string | null,
): void {
  if (actual !== expected) {
    throw new Error(
      `${fieldName} returned by the successor claim does not match the requested immutable decision.`,
    );
  }
}


/**
 * Atomic successor durable reconstruction-intent claim wrapper.
 *
 * Responsibility is intentionally narrow:
 *
 * - validate the immutable successor claim envelope;
 * - invoke claim_hspp_reconstruction_execution_intent_v2 once;
 * - validate exact producer provenance echoes;
 * - preserve the canonical child UUID returned by the database;
 * - surface idempotent recovery exactly.
 *
 * It does not perform Reservoir discovery, pair scheduling,
 * reevaluation, reconstruction, sealing, assessment, cursor CAS,
 * API/cron/worker activation or UUID generation.
 */
export async function claimHsppReconstructionExecutionIntentV2({
  supabase,
  organizationId:
    rawOrganizationId,
  proposedChildAssemblyId:
    rawProposedChildAssemblyId,
  selectedFirstEvidenceId:
    rawSelectedFirstEvidenceId,
  selectedSecondEvidenceId:
    rawSelectedSecondEvidenceId,
  historicalEvidenceId:
    rawHistoricalEvidenceId,
  historicalEvidenceIntegrityFingerprint:
    rawHistoricalFingerprint,
  replacementEvidenceId:
    rawReplacementEvidenceId,
  replacementEvidenceIntegrityFingerprint:
    rawReplacementFingerprint,
  selection,
  reservoirEligibilityPolicyVersion:
    rawReservoirEligibilityPolicyVersion,
  reevaluationPolicyVersion:
    rawReevaluationPolicyVersion,
  membershipPolicyVersion:
    rawMembershipPolicyVersion,
  reconstructionPolicyVersion:
    rawReconstructionPolicyVersion,
  reconstructionReason:
    rawReconstructionReason,
}: ClaimHsppReconstructionExecutionIntentV2Input): Promise<ClaimedHsppReconstructionExecutionIntentV2> {
  const organizationId =
    requireNonBlank(
      rawOrganizationId,
      "organizationId",
    );

  const proposedChildAssemblyId =
    requireNonBlank(
      rawProposedChildAssemblyId,
      "proposedChildAssemblyId",
    );

  const selectedFirstEvidenceId =
    requireNonBlank(
      rawSelectedFirstEvidenceId,
      "selectedFirstEvidenceId",
    );

  const selectedSecondEvidenceId =
    requireNonBlank(
      rawSelectedSecondEvidenceId,
      "selectedSecondEvidenceId",
    );

  const historicalEvidenceId =
    requireNonBlank(
      rawHistoricalEvidenceId,
      "historicalEvidenceId",
    );

  const replacementEvidenceId =
    requireNonBlank(
      rawReplacementEvidenceId,
      "replacementEvidenceId",
    );

  const historicalEvidenceIntegrityFingerprint =
    requireSha256(
      rawHistoricalFingerprint,
      "historicalEvidenceIntegrityFingerprint",
    );

  const replacementEvidenceIntegrityFingerprint =
    requireSha256(
      rawReplacementFingerprint,
      "replacementEvidenceIntegrityFingerprint",
    );

  const reservoirEligibilityPolicyVersion =
    requireNonBlank(
      rawReservoirEligibilityPolicyVersion,
      "reservoirEligibilityPolicyVersion",
    );

  const reevaluationPolicyVersion =
    requireNonBlank(
      rawReevaluationPolicyVersion,
      "reevaluationPolicyVersion",
    );

  const membershipPolicyVersion =
    requireNonBlank(
      rawMembershipPolicyVersion,
      "membershipPolicyVersion",
    );

  const reconstructionPolicyVersion =
    requireNonBlank(
      rawReconstructionPolicyVersion,
      "reconstructionPolicyVersion",
    );

  const reconstructionReason =
    requireNonBlank(
      rawReconstructionReason,
      "reconstructionReason",
    );

  if (
    selectedFirstEvidenceId ===
    selectedSecondEvidenceId
  ) {
    throw new Error(
      "selectedFirstEvidenceId and selectedSecondEvidenceId must be distinct.",
    );
  }

  if (
    historicalEvidenceId ===
    replacementEvidenceId
  ) {
    throw new Error(
      "historicalEvidenceId and replacementEvidenceId must be distinct.",
    );
  }

  const selectedPair =
    new Set<string>([
      selectedFirstEvidenceId,
      selectedSecondEvidenceId,
    ]);

  if (
    selectedPair.size !== 2 ||
    !selectedPair.has(
      historicalEvidenceId,
    ) ||
    !selectedPair.has(
      replacementEvidenceId,
    )
  ) {
    throw new Error(
      "The selected pair must contain exactly the historical and replacement evidence identities.",
    );
  }

  let selectionSource:
    "B07B_DISCOVERY" |
    "SCHEDULED_PAIR";

  let discoveryPolicyVersion:
    string | null;

  let pairSchedulingVersion:
    string | null;

  if (
    selection.selectionSource ===
    "B07B_DISCOVERY"
  ) {
    selectionSource =
      "B07B_DISCOVERY";

    discoveryPolicyVersion =
      requireNonBlank(
        selection.discoveryPolicyVersion,
        "selection.discoveryPolicyVersion",
      );

    pairSchedulingVersion =
      null;
  }
  else {
    selectionSource =
      "SCHEDULED_PAIR";

    discoveryPolicyVersion =
      null;

    pairSchedulingVersion =
      requireNonBlank(
        selection.pairSchedulingVersion,
        "selection.pairSchedulingVersion",
      );
  }

  const {
    data,
    error,
  } =
    await supabase.rpc(
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_RPC,
      {
        p_organization_id:
          organizationId,

        p_proposed_child_assembly_id:
          proposedChildAssemblyId,

        p_selected_first_evidence_id:
          selectedFirstEvidenceId,

        p_selected_second_evidence_id:
          selectedSecondEvidenceId,

        p_historical_evidence_id:
          historicalEvidenceId,

        p_historical_evidence_integrity_fingerprint:
          historicalEvidenceIntegrityFingerprint,

        p_replacement_evidence_id:
          replacementEvidenceId,

        p_replacement_evidence_integrity_fingerprint:
          replacementEvidenceIntegrityFingerprint,

        p_selection_source:
          selectionSource,

        p_discovery_policy_version:
          discoveryPolicyVersion,

        p_pair_scheduling_version:
          pairSchedulingVersion,

        p_reservoir_eligibility_policy_version:
          reservoirEligibilityPolicyVersion,

        p_reevaluation_policy_version:
          reevaluationPolicyVersion,

        p_membership_policy_version:
          membershipPolicyVersion,

        p_reconstruction_policy_version:
          reconstructionPolicyVersion,

        p_reconstruction_reason:
          reconstructionReason,
      },
    );

  if (error) {
    throw error;
  }

  if (
    !Array.isArray(data) ||
    data.length !== 1
  ) {
    throw new Error(
      "Successor reconstruction execution-intent claim must return exactly one row.",
    );
  }

  const row =
    data[0] as ClaimV2RpcRow;

  const intentId =
    requireNonBlank(
      row.intent_id,
      "intent_id",
    );

  const returnedOrganizationId =
    requireNonBlank(
      row.organization_id,
      "organization_id",
    );

  const childAssemblyId =
    requireNonBlank(
      row.child_assembly_id,
      "child_assembly_id",
    );

  const returnedSelectedFirstEvidenceId =
    requireNonBlank(
      row.selected_first_evidence_id,
      "selected_first_evidence_id",
    );

  const returnedSelectedSecondEvidenceId =
    requireNonBlank(
      row.selected_second_evidence_id,
      "selected_second_evidence_id",
    );

  const returnedHistoricalEvidenceId =
    requireNonBlank(
      row.historical_evidence_id,
      "historical_evidence_id",
    );

  const returnedHistoricalFingerprint =
    requireSha256(
      row.historical_evidence_integrity_fingerprint,
      "historical_evidence_integrity_fingerprint",
    );

  const returnedReplacementEvidenceId =
    requireNonBlank(
      row.replacement_evidence_id,
      "replacement_evidence_id",
    );

  const returnedReplacementFingerprint =
    requireSha256(
      row.replacement_evidence_integrity_fingerprint,
      "replacement_evidence_integrity_fingerprint",
    );

  const returnedSelectionSource =
    requireNonBlank(
      row.selection_source,
      "selection_source",
    );

  if (
    returnedSelectionSource !==
      "B07B_DISCOVERY" &&
    returnedSelectionSource !==
      "SCHEDULED_PAIR"
  ) {
    throw new Error(
      "selection_source returned by the successor claim is unsupported.",
    );
  }

  const returnedDiscoveryPolicyVersion =
    requireNullableString(
      row.discovery_policy_version,
      "discovery_policy_version",
    );

  const returnedPairSchedulingVersion =
    requireNullableString(
      row.pair_scheduling_version,
      "pair_scheduling_version",
    );

  const returnedReservoirEligibilityPolicyVersion =
    requireNonBlank(
      row.reservoir_eligibility_policy_version,
      "reservoir_eligibility_policy_version",
    );

  const returnedReevaluationPolicyVersion =
    requireNonBlank(
      row.reevaluation_policy_version,
      "reevaluation_policy_version",
    );

  const returnedMembershipPolicyVersion =
    requireNonBlank(
      row.membership_policy_version,
      "membership_policy_version",
    );

  const returnedReconstructionPolicyVersion =
    requireNonBlank(
      row.reconstruction_policy_version,
      "reconstruction_policy_version",
    );

  const returnedReconstructionReason =
    requireNonBlank(
      row.reconstruction_reason,
      "reconstruction_reason",
    );

  const intentVersion =
    requireNonBlank(
      row.intent_version,
      "intent_version",
    );

  const createdAt =
    requireTimestamp(
      row.created_at,
      "created_at",
    );

  const idempotentRecovery =
    requireBoolean(
      row.idempotent_recovery,
      "idempotent_recovery",
    );

  requireExactEcho(
    "organization_id",
    returnedOrganizationId,
    organizationId,
  );

  requireExactEcho(
    "selected_first_evidence_id",
    returnedSelectedFirstEvidenceId,
    selectedFirstEvidenceId,
  );

  requireExactEcho(
    "selected_second_evidence_id",
    returnedSelectedSecondEvidenceId,
    selectedSecondEvidenceId,
  );

  requireExactEcho(
    "historical_evidence_id",
    returnedHistoricalEvidenceId,
    historicalEvidenceId,
  );

  requireExactEcho(
    "historical_evidence_integrity_fingerprint",
    returnedHistoricalFingerprint,
    historicalEvidenceIntegrityFingerprint,
  );

  requireExactEcho(
    "replacement_evidence_id",
    returnedReplacementEvidenceId,
    replacementEvidenceId,
  );

  requireExactEcho(
    "replacement_evidence_integrity_fingerprint",
    returnedReplacementFingerprint,
    replacementEvidenceIntegrityFingerprint,
  );

  requireExactEcho(
    "selection_source",
    returnedSelectionSource,
    selectionSource,
  );

  requireExactEcho(
    "discovery_policy_version",
    returnedDiscoveryPolicyVersion,
    discoveryPolicyVersion,
  );

  requireExactEcho(
    "pair_scheduling_version",
    returnedPairSchedulingVersion,
    pairSchedulingVersion,
  );

  requireExactEcho(
    "reservoir_eligibility_policy_version",
    returnedReservoirEligibilityPolicyVersion,
    reservoirEligibilityPolicyVersion,
  );

  requireExactEcho(
    "reevaluation_policy_version",
    returnedReevaluationPolicyVersion,
    reevaluationPolicyVersion,
  );

  requireExactEcho(
    "membership_policy_version",
    returnedMembershipPolicyVersion,
    membershipPolicyVersion,
  );

  requireExactEcho(
    "reconstruction_policy_version",
    returnedReconstructionPolicyVersion,
    reconstructionPolicyVersion,
  );

  requireExactEcho(
    "reconstruction_reason",
    returnedReconstructionReason,
    reconstructionReason,
  );

  if (
    !idempotentRecovery &&
    childAssemblyId !==
      proposedChildAssemblyId
  ) {
    throw new Error(
      "A newly claimed successor reconstruction intent must preserve the proposed childAssemblyId.",
    );
  }

  return {
    claimWrapperVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_V2_WRAPPER_VERSION,

    intentId,

    organizationId:
      returnedOrganizationId,

    proposedChildAssemblyId,

    childAssemblyId,

    selectedFirstEvidenceId:
      returnedSelectedFirstEvidenceId,

    selectedSecondEvidenceId:
      returnedSelectedSecondEvidenceId,

    historicalEvidenceId:
      returnedHistoricalEvidenceId,

    historicalEvidenceIntegrityFingerprint:
      returnedHistoricalFingerprint,

    replacementEvidenceId:
      returnedReplacementEvidenceId,

    replacementEvidenceIntegrityFingerprint:
      returnedReplacementFingerprint,

    selectionSource:
      returnedSelectionSource,

    discoveryPolicyVersion:
      returnedDiscoveryPolicyVersion,

    pairSchedulingVersion:
      returnedPairSchedulingVersion,

    reservoirEligibilityPolicyVersion:
      returnedReservoirEligibilityPolicyVersion,

    reevaluationPolicyVersion:
      returnedReevaluationPolicyVersion,

    membershipPolicyVersion:
      returnedMembershipPolicyVersion,

    reconstructionPolicyVersion:
      returnedReconstructionPolicyVersion,

    reconstructionReason:
      returnedReconstructionReason,

    intentVersion,

    createdAt,

    idempotentRecovery,
  };
}
