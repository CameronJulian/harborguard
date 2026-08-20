import type {
  HsppAssessmentDecision,
} from "@/lib/hspp/hsppAssessmentDecision";
import type {
  HsppIntegrityVerificationResult,
} from "@/lib/hspp/verifyHsppEvidenceIntegrity";

export const HSPP_EXTERNAL_INTELLIGENCE_ASSESSMENT_POLICY_VERSION =
  "hspp-external-intelligence-assessment-v1" as const;

export const HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION =
  "normalized-route-safety-alert-v1" as const;

export type HsppExternalIntelligenceProvider =
  | "here"
  | "tomtom";

export type AssessHsppExternalIntelligenceEvidenceInput = {
  verification: HsppIntegrityVerificationResult;
  validationState: string;

  sourceClass: string;
  sourceProvider: string;
  sourceKey: string;
  payloadSchemaVersion: string;

  sourceEnabled: boolean;
  sourceApprovedForIngestion: boolean;

  alertStatus: string;

  providerSources: string[];
  providerConfirmationCount: number;
  providerConfidence: number;

  providerObservationFresh: boolean;
  providerLastSeenValid: boolean;
};

export type HsppExternalIntelligenceAssessmentResult =
  HsppAssessmentDecision & {
    policyVersion:
      typeof HSPP_EXTERNAL_INTELLIGENCE_ASSESSMENT_POLICY_VERSION;

    trustState:
      | "UNASSESSED"
      | "PLAUSIBLE";

    crowdEligible: false;
    trainingEligible: false;
    validationEligible: false;

    reason:
      | "integrity_not_verified"
      | "validation_not_validated"
      | "unsupported_source"
      | "unsupported_schema"
      | "source_not_enabled"
      | "source_not_approved"
      | "alert_not_active"
      | "provider_confirmation_missing"
      | "provider_source_missing"
      | "provider_last_seen_invalid"
      | "provider_observation_stale"
      | "provider_confidence_invalid"
      | "plausibility_passed";
  };

function expectedSourceKey(
  provider: string
): string | null {
  if (provider === "here") {
    return "here_traffic";
  }

  if (provider === "tomtom") {
    return "tomtom";
  }

  return null;
}

export function assessHsppExternalIntelligenceEvidence(
  input: AssessHsppExternalIntelligenceEvidenceInput
): HsppExternalIntelligenceAssessmentResult {
  const base = {
    policyVersion:
      HSPP_EXTERNAL_INTELLIGENCE_ASSESSMENT_POLICY_VERSION,

    crowdEligible: false as const,
    trainingEligible: false as const,
    validationEligible: false as const,
  };

  if (input.verification.status !== "MATCH") {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "integrity_not_verified",
    };
  }

  if (input.validationState !== "VALIDATED") {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "validation_not_validated",
    };
  }

  const requiredSourceKey =
    expectedSourceKey(input.sourceProvider);

  if (
    input.sourceClass !== "external_intelligence" ||
    requiredSourceKey === null ||
    input.sourceKey !== requiredSourceKey
  ) {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "unsupported_source",
    };
  }

  if (
    input.payloadSchemaVersion !==
    HSPP_EXTERNAL_INTELLIGENCE_PAYLOAD_SCHEMA_VERSION
  ) {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "unsupported_schema",
    };
  }

  if (!input.sourceEnabled) {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "source_not_enabled",
    };
  }

  if (!input.sourceApprovedForIngestion) {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "source_not_approved",
    };
  }

  if (input.alertStatus !== "active") {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "alert_not_active",
    };
  }

  if (
    !Number.isInteger(input.providerConfirmationCount) ||
    input.providerConfirmationCount < 1
  ) {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "provider_confirmation_missing",
    };
  }

  if (!input.providerSources.includes(requiredSourceKey)) {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "provider_source_missing",
    };
  }

  if (!input.providerLastSeenValid) {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "provider_last_seen_invalid",
    };
  }

  if (!input.providerObservationFresh) {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "provider_observation_stale",
    };
  }

  if (
    !Number.isFinite(input.providerConfidence) ||
    input.providerConfidence < 0 ||
    input.providerConfidence > 100
  ) {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "provider_confidence_invalid",
    };
  }

  return {
    ...base,
    trustState: "PLAUSIBLE",
    operationalEligible: true,
    reason: "plausibility_passed",
  };
}
