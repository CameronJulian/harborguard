import type {
  SupabaseClient,
} from "@supabase/supabase-js";


export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_WRAPPER_VERSION =
  "hspp-reconstruction-execution-intent-claim-wrapper-v1" as const;

export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION =
  "hspp-reconstruction-execution-intent-v1" as const;

export const HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RPC =
  "claim_hspp_reconstruction_execution_intent" as const;


const SHA256_PATTERN =
  /^[0-9a-f]{64}$/;


export type ClaimHsppReconstructionExecutionIntentInput = {
  /**
   * Trusted service-role Supabase client.
   *
   * Q14ag31A grants execution only to service_role.
   */
  supabase: SupabaseClient;

  organizationId: string;

  /**
   * Caller-proposed child UUID.
   *
   * The database may return a different canonical child UUID only when
   * the same immutable decision was already durably claimed.
   *
   * This wrapper deliberately generates no UUID.
   */
  proposedChildAssemblyId: string;

  /**
   * Exact original B07A pair orientation.
   */
  selectedFirstEvidenceId: string;

  selectedSecondEvidenceId: string;

  historicalEvidenceId: string;

  historicalEvidenceIntegrityFingerprint: string;

  replacementEvidenceId: string;

  replacementEvidenceIntegrityFingerprint: string;

  discoveryPolicyVersion: string;

  reevaluationPolicyVersion: string;

  membershipPolicyVersion: string;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;
};


export type ClaimedHsppReconstructionExecutionIntent = {
  claimWrapperVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_WRAPPER_VERSION;

  intentVersion:
    typeof HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION;

  intentId: string;

  organizationId: string;

  /**
   * The child UUID proposed by this caller.
   */
  proposedChildAssemblyId: string;

  /**
   * Durable canonical child UUID returned by Q14ag31A.
   *
   * On idempotent recovery this may intentionally differ from
   * proposedChildAssemblyId.
   */
  childAssemblyId: string;

  selectedFirstEvidenceId: string;

  selectedSecondEvidenceId: string;

  historicalEvidenceId: string;

  historicalEvidenceIntegrityFingerprint: string;

  replacementEvidenceId: string;

  replacementEvidenceIntegrityFingerprint: string;

  discoveryPolicyVersion: string;

  reevaluationPolicyVersion: string;

  membershipPolicyVersion: string;

  reconstructionPolicyVersion: string;

  reconstructionReason: string;

  createdAt: string;

  idempotentRecovery: boolean;
};


type ClaimRpcRow = {
  intent_id?: unknown;

  organization_id?: unknown;

  child_assembly_id?: unknown;

  selected_first_evidence_id?: unknown;

  selected_second_evidence_id?: unknown;

  historical_evidence_id?: unknown;

  historical_evidence_integrity_fingerprint?: unknown;

  replacement_evidence_id?: unknown;

  replacement_evidence_integrity_fingerprint?: unknown;

  discovery_policy_version?: unknown;

  reevaluation_policy_version?: unknown;

  membership_policy_version?: unknown;

  reconstruction_policy_version?: unknown;

  reconstruction_reason?: unknown;

  intent_version?: unknown;

  created_at?: unknown;

  idempotent_recovery?: unknown;
};


function requireObject(
  value: unknown,
  fieldName: string,
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${fieldName} must be an object.`,
    );
  }

  return value as Record<string, unknown>;
}


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


function requireBoundedPolicyVersion(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName,
    );

  if (normalized.length > 128) {
    throw new Error(
      `${fieldName} must contain at most 128 characters.`,
    );
  }

  return normalized;
}


function requireReconstructionReason(
  value: unknown,
): string {
  const normalized =
    requireNonBlank(
      value,
      "reconstructionReason",
    );

  if (normalized.length > 512) {
    throw new Error(
      "reconstructionReason must contain at most 512 characters.",
    );
  }

  return normalized;
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

  const parsed =
    Date.parse(
      normalized,
    );

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`,
    );
  }

  return new Date(
    parsed,
  ).toISOString();
}


function requireExactEcho(
  fieldName: string,
  actual: string,
  expected: string,
): void {
  if (actual !== expected) {
    throw new Error(
      `Q14ag31A returned mismatched ${fieldName}.`,
    );
  }
}


/**
 * Q14ag31B typed application boundary for the already-deployed Q14ag31A
 * durable reconstruction execution-intent claim authority.
 *
 * Responsibility:
 *
 * - accept one already-decided reconstruction execution identity;
 * - preserve the exact original pair orientation;
 * - preserve historical/replacement evidence roles and fingerprints;
 * - preserve B07B + membership + reconstruction policy provenance;
 * - call Q14ag31A exactly once;
 * - validate exactly one returned immutable intent row;
 * - expose the database-selected canonical child UUID; and
 * - propagate idempotentRecovery exactly.
 *
 * A successful idempotent recovery may return a canonical child UUID that
 * differs from proposedChildAssemblyId. That is the core crash-recovery
 * authority created by Q14ag31A.
 *
 * This wrapper deliberately does NOT:
 *
 * - run B06B discovery;
 * - run B07A reevaluation;
 * - select a reconstruction pair;
 * - generate a UUID;
 * - read historical reconstruction context;
 * - read or persist H1/H2;
 * - invoke Q14h;
 * - plan reconstruction members;
 * - seal or assess an assembly;
 * - mutate trust or Reservoir state;
 * - activate the reconstruction bridge;
 * - create API, cron, queue, polling or scheduling behavior.
 */
export async function claimHsppReconstructionExecutionIntent({
  supabase,
  organizationId: rawOrganizationId,
  proposedChildAssemblyId: rawProposedChildAssemblyId,
  selectedFirstEvidenceId: rawSelectedFirstEvidenceId,
  selectedSecondEvidenceId: rawSelectedSecondEvidenceId,
  historicalEvidenceId: rawHistoricalEvidenceId,
  historicalEvidenceIntegrityFingerprint:
    rawHistoricalEvidenceIntegrityFingerprint,
  replacementEvidenceId: rawReplacementEvidenceId,
  replacementEvidenceIntegrityFingerprint:
    rawReplacementEvidenceIntegrityFingerprint,
  discoveryPolicyVersion: rawDiscoveryPolicyVersion,
  reevaluationPolicyVersion: rawReevaluationPolicyVersion,
  membershipPolicyVersion: rawMembershipPolicyVersion,
  reconstructionPolicyVersion: rawReconstructionPolicyVersion,
  reconstructionReason: rawReconstructionReason,
}: ClaimHsppReconstructionExecutionIntentInput): Promise<ClaimedHsppReconstructionExecutionIntent> {
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

  const historicalEvidenceIntegrityFingerprint =
    requireSha256(
      rawHistoricalEvidenceIntegrityFingerprint,
      "historicalEvidenceIntegrityFingerprint",
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
    requireBoundedPolicyVersion(
      rawDiscoveryPolicyVersion,
      "discoveryPolicyVersion",
    );

  const reevaluationPolicyVersion =
    requireBoundedPolicyVersion(
      rawReevaluationPolicyVersion,
      "reevaluationPolicyVersion",
    );

  const membershipPolicyVersion =
    requireBoundedPolicyVersion(
      rawMembershipPolicyVersion,
      "membershipPolicyVersion",
    );

  const reconstructionPolicyVersion =
    requireBoundedPolicyVersion(
      rawReconstructionPolicyVersion,
      "reconstructionPolicyVersion",
    );

  const reconstructionReason =
    requireReconstructionReason(
      rawReconstructionReason,
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


  const {
    data,
    error,
  } =
    await supabase.rpc(
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_RPC,
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

        p_discovery_policy_version:
          discoveryPolicyVersion,

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
      "Q14ag31A reconstruction execution-intent claim must return exactly one row.",
    );
  }


  const row =
    requireObject(
      data[0],
      "Q14ag31A claim row",
    ) as ClaimRpcRow;


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

  const returnedDiscoveryPolicyVersion =
    requireNonBlank(
      row.discovery_policy_version,
      "discovery_policy_version",
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
    "discovery_policy_version",
    returnedDiscoveryPolicyVersion,
    discoveryPolicyVersion,
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
    intentVersion !==
    HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION
  ) {
    throw new Error(
      "Q14ag31A returned an unsupported reconstruction execution-intent version.",
    );
  }


  if (
    !idempotentRecovery &&
    childAssemblyId !==
      proposedChildAssemblyId
  ) {
    throw new Error(
      "A newly claimed reconstruction intent must preserve the proposed childAssemblyId.",
    );
  }


  return {
    claimWrapperVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_CLAIM_WRAPPER_VERSION,

    intentVersion:
      HSPP_RECONSTRUCTION_EXECUTION_INTENT_VERSION,

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

    discoveryPolicyVersion:
      returnedDiscoveryPolicyVersion,

    reevaluationPolicyVersion:
      returnedReevaluationPolicyVersion,

    membershipPolicyVersion:
      returnedMembershipPolicyVersion,

    reconstructionPolicyVersion:
      returnedReconstructionPolicyVersion,

    reconstructionReason:
      returnedReconstructionReason,

    createdAt,

    idempotentRecovery,
  };
}
