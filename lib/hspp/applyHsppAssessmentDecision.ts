import type {
  HsppAssessmentDecision,
} from "@/lib/hspp/hsppAssessmentDecision";

import type {
  HsppTrustState,
} from "@/lib/hspp/buildHsppEvidence";

export type ApplyHsppAssessmentDecisionInput = {
  supabase: any;
  organizationId: string;
  evidenceId: string;
  integrityFingerprint: string;
  assessment: HsppAssessmentDecision;
  assessedAt?: string;
};

export type AppliedHsppAssessmentDecision = {
  evidenceId: string;
  trustState: HsppTrustState;
  operationalEligible: boolean;
  policyVersion: string;
  reason: string;
  assessedAt: string;
};

function requireNonBlank(
  value: string,
  fieldName: string
): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeTimestamp(
  value: string
): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      "assessedAt must be a valid date-time string."
    );
  }

  return parsed.toISOString();
}

export async function applyHsppAssessmentDecision({
  supabase,
  organizationId,
  evidenceId,
  integrityFingerprint,
  assessment,
  assessedAt = new Date().toISOString(),
}: ApplyHsppAssessmentDecisionInput): Promise<AppliedHsppAssessmentDecision> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId"
    );

  const normalizedEvidenceId =
    requireNonBlank(
      evidenceId,
      "evidenceId"
    );

  const normalizedFingerprint =
    requireNonBlank(
      integrityFingerprint,
      "integrityFingerprint"
    );

  if (
    !/^[0-9a-f]{64}$/.test(
      normalizedFingerprint
    )
  ) {
    throw new Error(
      "integrityFingerprint must be a lowercase SHA-256 hexadecimal fingerprint."
    );
  }

  const normalizedAssessedAt =
    normalizeTimestamp(assessedAt);

  const { data, error } =
    await supabase
      .from("hspp_evidence")
      .update({
        trust_state:
          assessment.trustState,

        operational_eligible:
          assessment.operationalEligible,

        crowd_eligible:
          assessment.crowdEligible,

        training_eligible:
          assessment.trainingEligible,

        validation_eligible:
          assessment.validationEligible,

        assessment_policy_version:
          assessment.policyVersion,

        assessment_reason:
          assessment.reason,

        assessed_at:
          normalizedAssessedAt,
      })
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .eq(
        "id",
        normalizedEvidenceId
      )
      .eq(
        "integrity_fingerprint",
        normalizedFingerprint
      )
      .select(
        "id, trust_state, operational_eligible, assessment_policy_version, assessment_reason, assessed_at"
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "HSPP evidence assessment target was not found or no longer matched its integrity identity."
    );
  }

  if (
    typeof data.id !== "string" ||
    typeof data.trust_state !== "string" ||
    typeof data.operational_eligible !== "boolean" ||
    typeof data.assessment_policy_version !== "string" ||
    typeof data.assessment_reason !== "string" ||
    typeof data.assessed_at !== "string"
  ) {
    throw new Error(
      "Persisted HSPP assessment returned an invalid result."
    );
  }

  return {
    evidenceId:
      data.id,

    trustState:
      data.trust_state as HsppTrustState,

    operationalEligible:
      data.operational_eligible,

    policyVersion:
      data.assessment_policy_version,

    reason:
      data.assessment_reason,

    assessedAt:
      normalizeTimestamp(
        data.assessed_at
      ),
  };
}
