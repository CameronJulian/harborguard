import {
  createHsppIntegrityFingerprint,
  HSPP_CANONICALIZATION_VERSION,
  HSPP_INTEGRITY_ALGORITHM,
  HSPP_PROTOCOL_VERSION,
} from "@/lib/hspp/createHsppIntegrityFingerprint";

export {
  HSPP_CANONICALIZATION_VERSION,
  HSPP_INTEGRITY_ALGORITHM,
  HSPP_PROTOCOL_VERSION,
};

export type HsppIntegrityState =
  | "RECEIVED"
  | "IDENTIFIED"
  | "VALIDATED"
  | "INTEGRITY_SEALED";

export type HsppValidationState =
  | "UNASSESSED"
  | "VALIDATED"
  | "REJECTED";

export type HsppTrustState =
  | "UNASSESSED"
  | "PLAUSIBLE"
  | "CORROBORATED"
  | "VERIFIED";

export type BuildHsppEvidenceInput = {
  sourceClass: string;
  sourceProvider: string;
  sourceStream: string;
  sourceMessageId: string;
  observedAt: string;
  receivedAt?: string;
  payloadSchemaVersion: string;
  normalizedPayload: Record<string, unknown>;
};

export type BuiltHsppEvidence = {
  protocolVersion: typeof HSPP_PROTOCOL_VERSION;
  canonicalizationVersion:
    typeof HSPP_CANONICALIZATION_VERSION;
  sourceClass: string;
  sourceProvider: string;
  sourceStream: string;
  sourceMessageId: string;
  observedAt: string;
  receivedAt: string;
  payloadSchemaVersion: string;
  normalizedPayload: Record<string, unknown>;
  integrityAlgorithm:
    typeof HSPP_INTEGRITY_ALGORITHM;
  integrityFingerprint: string;
  integrityState: "INTEGRITY_SEALED";
  validationState: "VALIDATED";
  trustState: "UNASSESSED";
  operationalEligible: true;
  crowdEligible: false;
  trainingEligible: false;
  validationEligible: false;
};

function requireTimestamp(
  value: string,
  fieldName: string
): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(
      `${fieldName} must be a valid date-time string.`
    );
  }

  return parsed.toISOString();
}

export function buildHsppEvidence(
  input: BuildHsppEvidenceInput
): BuiltHsppEvidence {
  const fingerprint =
    createHsppIntegrityFingerprint({
      protocolVersion:
        HSPP_PROTOCOL_VERSION,
      canonicalizationVersion:
        HSPP_CANONICALIZATION_VERSION,
      sourceClass:
        input.sourceClass,
      sourceProvider:
        input.sourceProvider,
      sourceStream:
        input.sourceStream,
      sourceMessageId:
        input.sourceMessageId,
      observedAt:
        input.observedAt,
      payloadSchemaVersion:
        input.payloadSchemaVersion,
      normalizedPayload:
        input.normalizedPayload,
    });

  const receivedAt = requireTimestamp(
    input.receivedAt ?? new Date().toISOString(),
    "receivedAt"
  );

  return {
    protocolVersion:
      HSPP_PROTOCOL_VERSION,
    canonicalizationVersion:
      HSPP_CANONICALIZATION_VERSION,
    sourceClass:
      fingerprint.sourceClass,
    sourceProvider:
      fingerprint.sourceProvider,
    sourceStream:
      fingerprint.sourceStream,
    sourceMessageId:
      fingerprint.sourceMessageId,
    observedAt:
      fingerprint.observedAt,
    receivedAt,
    payloadSchemaVersion:
      fingerprint.payloadSchemaVersion,
    normalizedPayload:
      fingerprint.normalizedPayload,
    integrityAlgorithm:
      HSPP_INTEGRITY_ALGORITHM,
    integrityFingerprint:
      fingerprint.integrityFingerprint,
    integrityState:
      "INTEGRITY_SEALED",
    validationState:
      "VALIDATED",
    trustState:
      "UNASSESSED",
    operationalEligible:
      true,
    crowdEligible:
      false,
    trainingEligible:
      false,
    validationEligible:
      false,
  };
}
