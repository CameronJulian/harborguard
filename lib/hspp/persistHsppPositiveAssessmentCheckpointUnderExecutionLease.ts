import type {
  AppliedHsppAssessmentDecision,
} from "./applyHsppAssessmentDecision";

export const HSPP_POSITIVE_ASSESSMENT_CHECKPOINT_UNDER_EXECUTION_LEASE_RPC =
  "persist_hspp_positive_assessment_checkpoint_under_lease" as const;

export type PersistHsppPositiveAssessmentCheckpointUnderExecutionLeaseInput = {
  supabase: any;

  organizationId: string;

  assemblyId: string;

  leaseToken: string;

  assemblyDecisionId: string;

  evidenceId: string;

  integrityFingerprint: string;

  assessedAt: string;
};

type PositiveCheckpointRow = {
  evidence_id: unknown;

  trust_state: unknown;

  operational_eligible: unknown;

  crowd_eligible: unknown;

  training_eligible: unknown;

  validation_eligible: unknown;

  assessment_policy_version: unknown;

  assessment_reason: unknown;

  assessed_at: unknown;

  checkpoint_id: unknown;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const FINGERPRINT_PATTERN =
  /^[a-f0-9]{64}$/;

function requireUuid(
  value: unknown,
  fieldName: string,
): string {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    !normalized ||
    !UUID_PATTERN.test(normalized)
  ) {
    throw new Error(
      `${fieldName} must be a UUID.`,
    );
  }

  return normalized;
}

function requireFingerprint(
  value: unknown,
): string {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  if (
    !FINGERPRINT_PATTERN.test(
      normalized,
    )
  ) {
    throw new Error(
      "integrityFingerprint must be an exact lowercase SHA-256 hexadecimal fingerprint.",
    );
  }

  return normalized;
}

function requireTimestamp(
  value: unknown,
): string {
  const normalized =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!normalized) {
    throw new Error(
      "assessedAt is required.",
    );
  }

  const parsed =
    new Date(normalized);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      "assessedAt must be a valid date-time string.",
    );
  }

  return parsed.toISOString();
}

/**
 * Q14r lease-only positive Q6 database boundary.
 *
 * PostgreSQL atomically composes the existing fenced evidence mutation
 * with the immutable Q14p positive-assessment checkpoint.
 *
 * This wrapper does not create a second client-side checkpoint INSERT.
 */
export async function persistHsppPositiveAssessmentCheckpointUnderExecutionLease({
  supabase,
  organizationId,
  assemblyId,
  leaseToken,
  assemblyDecisionId,
  evidenceId,
  integrityFingerprint,
  assessedAt,
}: PersistHsppPositiveAssessmentCheckpointUnderExecutionLeaseInput): Promise<AppliedHsppAssessmentDecision> {
  const normalizedOrganizationId =
    requireUuid(
      organizationId,
      "organizationId",
    );

  const normalizedAssemblyId =
    requireUuid(
      assemblyId,
      "assemblyId",
    );

  const normalizedLeaseToken =
    requireUuid(
      leaseToken,
      "leaseToken",
    );

  const normalizedAssemblyDecisionId =
    requireUuid(
      assemblyDecisionId,
      "assemblyDecisionId",
    );

  const normalizedEvidenceId =
    requireUuid(
      evidenceId,
      "evidenceId",
    );

  const normalizedFingerprint =
    requireFingerprint(
      integrityFingerprint,
    );

  const normalizedAssessedAt =
    requireTimestamp(
      assessedAt,
    );

  const { data, error } =
    await supabase
      .rpc(
        HSPP_POSITIVE_ASSESSMENT_CHECKPOINT_UNDER_EXECUTION_LEASE_RPC,
        {
          p_organization_id:
            normalizedOrganizationId,

          p_assembly_id:
            normalizedAssemblyId,

          p_lease_token:
            normalizedLeaseToken,

          p_assembly_decision_id:
            normalizedAssemblyDecisionId,

          p_evidence_id:
            normalizedEvidenceId,

          p_integrity_fingerprint:
            normalizedFingerprint,

          p_assessed_at:
            normalizedAssessedAt,
        },
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Atomic positive HSPP checkpoint RPC returned no persisted result.",
    );
  }

  const row =
    data as PositiveCheckpointRow;

  if (
    row.evidence_id !==
      normalizedEvidenceId ||
    row.trust_state !==
      "CORROBORATED" ||
    row.operational_eligible !==
      true ||
    row.crowd_eligible !==
      false ||
    row.training_eligible !==
      false ||
    row.validation_eligible !==
      false ||
    row.assessment_policy_version !==
      "hspp-corroborated-operational-assessment-v1" ||
    row.assessment_reason !==
      "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED" ||
    typeof row.assessed_at !==
      "string" ||
    typeof row.checkpoint_id !==
      "string"
  ) {
    throw new Error(
      "Atomic positive HSPP checkpoint RPC returned an invalid positive persistence result.",
    );
  }

  const returnedAssessedAt =
    requireTimestamp(
      row.assessed_at,
    );

  if (
    returnedAssessedAt !==
    normalizedAssessedAt
  ) {
    throw new Error(
      "Atomic positive HSPP checkpoint RPC returned a different assessedAt retry identity.",
    );
  }

  requireUuid(
    row.checkpoint_id,
    "checkpointId",
  );

  return {
    evidenceId:
      normalizedEvidenceId,

    trustState:
      "CORROBORATED",

    operationalEligible:
      true,

    policyVersion:
      "hspp-corroborated-operational-assessment-v1",

    reason:
      "CORROBORATED_OPERATIONAL_AUTHORITY_GRANTED",

    assessedAt:
      normalizedAssessedAt,
  };
}