import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  HsppAssessmentDecision,
} from "@/lib/hspp/hsppAssessmentDecision";

import type {
  HsppTrustState,
} from "@/lib/hspp/buildHsppEvidence";

export const HSPP_ASSESSMENT_DECISIONS_BATCH_RPC =
  "apply_hspp_assessment_decisions_batch" as const;

export type ApplyHsppAssessmentDecisionBatchItem = {
  evidenceId: string;
  integrityFingerprint: string;
  assessment: HsppAssessmentDecision;
  assessedAt: string;
};

export type AppliedHsppAssessmentDecisionBatchItem = {
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

type PersistedBatchRow = {
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

const TRUST_STATES =
  new Set<HsppTrustState>([
    "UNASSESSED",
    "PLAUSIBLE",
    "CORROBORATED",
    "VERIFIED",
  ]);

function requireNonBlank(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${fieldName} is required.`
    );
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

function requireTimestamp(
  value: unknown
): string {
  const normalized =
    requireNonBlank(
      value,
      "assessedAt"
    );

  const parsed =
    new Date(normalized);

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

function isTrustState(
  value: unknown
): value is HsppTrustState {
  return (
    typeof value === "string" &&
    TRUST_STATES.has(
      value as HsppTrustState
    )
  );
}

export async function applyHsppAssessmentDecisionsBatch({
  supabase,
  organizationId,
  decisions,
}: {
  supabase: SupabaseClient;
  organizationId: string;
  decisions: readonly ApplyHsppAssessmentDecisionBatchItem[];
}): Promise<AppliedHsppAssessmentDecisionBatchItem[]> {

  const normalizedOrganizationId =
    requireUuid(
      organizationId,
      "organizationId"
    );

  if (!Array.isArray(decisions)) {
    throw new Error(
      "decisions must be an array."
    );
  }

  if (decisions.length === 0) {
    return [];
  }

  const seenEvidenceIds =
    new Set<string>();

  const payload =
    decisions.map(
      (
        input,
        index
      ) => {

        const evidenceId =
          requireUuid(
            input.evidenceId,
            `decisions[${index}].evidenceId`
          );

        if (
          seenEvidenceIds.has(
            evidenceId
          )
        ) {
          throw new Error(
            "HSPP assessment batch cannot contain duplicate evidence identities."
          );
        }

        seenEvidenceIds.add(
          evidenceId
        );

        const fingerprint =
          requireFingerprint(
            input.integrityFingerprint
          );

        if (
          !TRUST_STATES.has(
            input.assessment.trustState
          )
        ) {
          throw new Error(
            `decisions[${index}].assessment.trustState is invalid.`
          );
        }

        const policyVersion =
          requireNonBlank(
            input.assessment.policyVersion,
            `decisions[${index}].assessment.policyVersion`
          );

        const reason =
          requireNonBlank(
            input.assessment.reason,
            `decisions[${index}].assessment.reason`
          );

        const assessedAt =
          requireTimestamp(
            input.assessedAt
          );

        return {
          evidenceId,
          integrityFingerprint:
            fingerprint,
          trustState:
            input.assessment.trustState,
          operationalEligible:
            input.assessment.operationalEligible,
          crowdEligible:
            input.assessment.crowdEligible,
          trainingEligible:
            input.assessment.trainingEligible,
          validationEligible:
            input.assessment.validationEligible,
          policyVersion,
          reason,
          assessedAt,
        };
      }
    );

  const { data, error } =
    await supabase.rpc(
      HSPP_ASSESSMENT_DECISIONS_BATCH_RPC,
      {
        p_organization_id:
          normalizedOrganizationId,
        p_decisions:
          payload,
      }
    );

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "HSPP assessment batch RPC returned an invalid result."
    );
  }

  if (
    data.length !==
    payload.length
  ) {
    throw new Error(
      "HSPP assessment batch RPC returned an unexpected persisted row count."
    );
  }

  return data.map(
    (
      raw,
      index
    ) => {

      const row =
        raw as PersistedBatchRow;

      if (
        typeof row.evidence_id !== "string" ||
        !isTrustState(
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
          "HSPP assessment batch RPC returned an invalid persisted row."
        );
      }

      const expected =
        payload[index];

      const assessedAt =
        requireTimestamp(
          row.assessed_at
        );

      if (
        row.evidence_id !==
          expected.evidenceId ||
        row.trust_state !==
          expected.trustState ||
        row.operational_eligible !==
          expected.operationalEligible ||
        row.crowd_eligible !==
          expected.crowdEligible ||
        row.training_eligible !==
          expected.trainingEligible ||
        row.validation_eligible !==
          expected.validationEligible ||
        row.assessment_policy_version !==
          expected.policyVersion ||
        row.assessment_reason !==
          expected.reason ||
        assessedAt !==
          expected.assessedAt
      ) {
        throw new Error(
          "HSPP assessment batch persisted result does not match the requested decision."
        );
      }

      return {
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
        assessedAt,
      };
    }
  );
}
