import type {
  HsppAssessmentDecision,
} from "@/lib/hspp/hsppAssessmentDecision";
import type {
  HsppIntegrityVerificationResult,
} from "@/lib/hspp/verifyHsppEvidenceIntegrity";

export const HSPP_TRACCAR_ASSESSMENT_POLICY_VERSION =
  "hspp-traccar-assessment-v1" as const;

export type HsppTraccarProcessingOutcome =
  | "accepted"
  | "jitter"
  | "gps_spike"
  | "failed";

export type AssessHsppTraccarEvidenceInput = {
  verification: HsppIntegrityVerificationResult;
  validationState: string;
  sourceClass: string;
  sourceProvider: string;
  payloadSchemaVersion: string;
  processingOutcome: HsppTraccarProcessingOutcome;
};

export type HsppTraccarAssessmentResult =
  HsppAssessmentDecision & {
    policyVersion:
      typeof HSPP_TRACCAR_ASSESSMENT_POLICY_VERSION;

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
      | "location_processing_failed"
      | "gps_spike_rejected"
      | "plausibility_passed";
  };

export function assessHsppTraccarEvidence(
  input: AssessHsppTraccarEvidenceInput
): HsppTraccarAssessmentResult {
  const base = {
    policyVersion:
      HSPP_TRACCAR_ASSESSMENT_POLICY_VERSION,

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

  if (
    input.sourceClass !== "telematics" ||
    input.sourceProvider !== "traccar"
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
    "normalized-telematics-position-v1"
  ) {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "unsupported_schema",
    };
  }

  if (input.processingOutcome === "failed") {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "location_processing_failed",
    };
  }

  if (input.processingOutcome === "gps_spike") {
    return {
      ...base,
      trustState: "UNASSESSED",
      operationalEligible: false,
      reason: "gps_spike_rejected",
    };
  }

  return {
    ...base,
    trustState: "PLAUSIBLE",
    operationalEligible: true,
    reason: "plausibility_passed",
  };
}
