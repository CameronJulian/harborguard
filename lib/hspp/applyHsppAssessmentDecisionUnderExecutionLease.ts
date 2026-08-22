import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  HsppAssessmentDecision,
} from "@/lib/hspp/hsppAssessmentDecision";

import type {
  HsppTrustState,
} from "@/lib/hspp/buildHsppEvidence";

export const HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_VERSION =
  "hspp-assessment-decision-under-execution-lease-v1" as const;

export const HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_RPC =
  "apply_hspp_assessment_decision_under_execution_lease" as const;

const HSPP_TRUST_STATES =
  new Set<HsppTrustState>([
    "UNASSESSED",
    "PLAUSIBLE",
    "CORROBORATED",
    "VERIFIED",
  ]);

type FencedAssessmentRow = {
  evidence_id: unknown;
  trust_state: unknown;
  operational_eligible: unknown;
  crowd_eligible: unknown;
  training_eligible: unknown;
  validation_eligible: unknown;
  assessment_policy_version: unknown;
  assessment_reason: unknown;
  assessed_at: unknown;
};

export type ApplyHsppAssessmentDecisionUnderExecutionLeaseInput = {
  supabase: SupabaseClient;

  organizationId: string;

  assemblyId: string;

  leaseToken: string;

  evidenceId: string;

  integrityFingerprint: string;

  assessment: HsppAssessmentDecision;

  /**
   * Caller-owned canonical Q13d2 retry identity.
   *
   * This boundary never invents assessedAt.
   */
  assessedAt: string;
};

export type AppliedHsppAssessmentDecisionUnderExecutionLease = {
  writerVersion:
    typeof HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_VERSION;

  organizationId: string;

  assemblyId: string;

  evidenceId: string;

  trustState: HsppTrustState;

  operationalEligible: boolean;

  crowdEligible: boolean;

  trainingEligible: boolean;

  validationEligible: boolean;

  policyVersion: string;

  reason: string;

  assessedAt: string;
};

function requireNonBlank(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

function requireUuid(
  value: unknown,
  fieldName: string
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName
    );

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      normalized
    )
  ) {
    throw new Error(
      `${fieldName} must be a UUID.`
    );
  }

  return normalized.toLowerCase();
}

function requireFingerprint(
  value: unknown
): string {
  const normalized =
    requireNonBlank(
      value,
      "integrityFingerprint"
    );

  if (
    !/^[0-9a-f]{64}$/.test(
      normalized
    )
  ) {
    throw new Error(
      "integrityFingerprint must be a lowercase SHA-256 hexadecimal fingerprint."
    );
  }

  return normalized;
}

function normalizeTimestamp(
  value: unknown
): string {
  const timestamp =
    requireNonBlank(
      value,
      "assessedAt"
    );

  const parsed =
    new Date(timestamp);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      "assessedAt must be a valid date-time string."
    );
  }

  return parsed.toISOString();
}

function requireAssessment(
  value: unknown
): HsppAssessmentDecision {
  if (
    !value ||
    typeof value !== "object"
  ) {
    throw new Error(
      "assessment is required."
    );
  }

  const assessment =
    value as HsppAssessmentDecision;

  if (
    !HSPP_TRUST_STATES.has(
      assessment.trustState
    )
  ) {
    throw new Error(
      "assessment.trustState is invalid."
    );
  }

  if (
    typeof assessment.operationalEligible !== "boolean" ||
    typeof assessment.crowdEligible !== "boolean" ||
    typeof assessment.trainingEligible !== "boolean" ||
    typeof assessment.validationEligible !== "boolean"
  ) {
    throw new Error(
      "assessment eligibility values must be boolean."
    );
  }

  const policyVersion =
    requireNonBlank(
      assessment.policyVersion,
      "assessment.policyVersion"
    );

  const reason =
    requireNonBlank(
      assessment.reason,
      "assessment.reason"
    );

  return {
    ...assessment,
    policyVersion,
    reason,
  };
}

function isHsppTrustState(
  value: unknown
): value is HsppTrustState {
  return (
    typeof value === "string" &&
    HSPP_TRUST_STATES.has(
      value as HsppTrustState
    )
  );
}

export async function applyHsppAssessmentDecisionUnderExecutionLease({
  supabase,
  organizationId,
  assemblyId,
  leaseToken,
  evidenceId,
  integrityFingerprint,
  assessment,
  assessedAt,
}: ApplyHsppAssessmentDecisionUnderExecutionLeaseInput): Promise<AppliedHsppAssessmentDecisionUnderExecutionLease> {
  const normalizedOrganizationId =
    requireUuid(
      organizationId,
      "organizationId"
    );

  const normalizedAssemblyId =
    requireUuid(
      assemblyId,
      "assemblyId"
    );

  const normalizedLeaseToken =
    requireUuid(
      leaseToken,
      "leaseToken"
    );

  const normalizedEvidenceId =
    requireUuid(
      evidenceId,
      "evidenceId"
    );

  const normalizedFingerprint =
    requireFingerprint(
      integrityFingerprint
    );

  const normalizedAssessment =
    requireAssessment(
      assessment
    );

  const normalizedAssessedAt =
    normalizeTimestamp(
      assessedAt
    );

  const { data, error } =
    await supabase
      .rpc(
        HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_RPC,
        {
          p_organization_id:
            normalizedOrganizationId,

          p_assembly_id:
            normalizedAssemblyId,

          p_lease_token:
            normalizedLeaseToken,

          p_evidence_id:
            normalizedEvidenceId,

          p_integrity_fingerprint:
            normalizedFingerprint,

          p_trust_state:
            normalizedAssessment.trustState,

          p_operational_eligible:
            normalizedAssessment.operationalEligible,

          p_crowd_eligible:
            normalizedAssessment.crowdEligible,

          p_training_eligible:
            normalizedAssessment.trainingEligible,

          p_validation_eligible:
            normalizedAssessment.validationEligible,

          p_assessment_policy_version:
            normalizedAssessment.policyVersion,

          p_assessment_reason:
            normalizedAssessment.reason,

          p_assessed_at:
            normalizedAssessedAt,
        }
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "Fenced HSPP assessment RPC returned no persisted assessment."
    );
  }

  const row =
    data as FencedAssessmentRow;

  if (
    typeof row.evidence_id !== "string" ||
    !isHsppTrustState(
      row.trust_state
    ) ||
    typeof row.operational_eligible !== "boolean" ||
    typeof row.crowd_eligible !== "boolean" ||
    typeof row.training_eligible !== "boolean" ||
    typeof row.validation_eligible !== "boolean" ||
    typeof row.assessment_policy_version !== "string" ||
    typeof row.assessment_reason !== "string" ||
    typeof row.assessed_at !== "string"
  ) {
    throw new Error(
      "Fenced HSPP assessment RPC returned an invalid result."
    );
  }

  const returnedAssessedAt =
    normalizeTimestamp(
      row.assessed_at
    );

  if (
    row.evidence_id !==
      normalizedEvidenceId ||
    row.trust_state !==
      normalizedAssessment.trustState ||
    row.operational_eligible !==
      normalizedAssessment.operationalEligible ||
    row.crowd_eligible !==
      normalizedAssessment.crowdEligible ||
    row.training_eligible !==
      normalizedAssessment.trainingEligible ||
    row.validation_eligible !==
      normalizedAssessment.validationEligible ||
    row.assessment_policy_version !==
      normalizedAssessment.policyVersion ||
    row.assessment_reason !==
      normalizedAssessment.reason ||
    returnedAssessedAt !==
      normalizedAssessedAt
  ) {
    throw new Error(
      "Fenced HSPP assessment persisted result does not match the requested assessment decision."
    );
  }

  return {
    writerVersion:
      HSPP_ASSESSMENT_DECISION_UNDER_EXECUTION_LEASE_VERSION,

    organizationId:
      normalizedOrganizationId,

    assemblyId:
      normalizedAssemblyId,

    evidenceId:
      row.evidence_id,

    trustState:
      row.trust_state,

    operationalEligible:
      row.operational_eligible,

    crowdEligible:
      row.crowd_eligible,

    trainingEligible:
      row.training_eligible,

    validationEligible:
      row.validation_eligible,

    policyVersion:
      row.assessment_policy_version,

    reason:
      row.assessment_reason,

    assessedAt:
      normalizedAssessedAt,
  };
}
