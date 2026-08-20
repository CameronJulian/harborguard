import {
  createHsppIntegrityFingerprint,
  HSPP_CANONICALIZATION_VERSION,
  HSPP_CANONICALIZATION_VERSION_V1,
  HSPP_CANONICALIZATION_VERSION_V2,
  HSPP_INTEGRITY_ALGORITHM,
  HSPP_PROTOCOL_VERSION,
  type HsppDerivationLineage,
} from "@/lib/hspp/createHsppIntegrityFingerprint";

export {
  HSPP_CANONICALIZATION_VERSION,
  HSPP_CANONICALIZATION_VERSION_V1,
  HSPP_CANONICALIZATION_VERSION_V2,
  HSPP_INTEGRITY_ALGORITHM,
  HSPP_PROTOCOL_VERSION,
};

export type {
  HsppDerivationLineage,
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
  derivationLineage?: HsppDerivationLineage | null;
};

export type BuiltHsppEvidence = {
  protocolVersion:
    typeof HSPP_PROTOCOL_VERSION;

  canonicalizationVersion:
    | typeof HSPP_CANONICALIZATION_VERSION_V1
    | typeof HSPP_CANONICALIZATION_VERSION_V2;

  sourceClass: string;
  sourceProvider: string;
  sourceStream: string;
  sourceMessageId: string;

  observedAt: string;
  receivedAt: string;

  payloadSchemaVersion: string;
  normalizedPayload: Record<string, unknown>;

  derivationLineage:
    HsppDerivationLineage | null;

  integrityAlgorithm:
    typeof HSPP_INTEGRITY_ALGORITHM;

  integrityFingerprint: string;

  integrityState:
    "INTEGRITY_SEALED";

  validationState:
    "VALIDATED";

  trustState:
    "UNASSESSED";

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
  const derivationLineage =
    input.derivationLineage ?? null;

  const canonicalizationVersion =
    derivationLineage
      ? HSPP_CANONICALIZATION_VERSION_V2
      : HSPP_CANONICALIZATION_VERSION_V1;

  const fingerprint =
    createHsppIntegrityFingerprint({
      protocolVersion:
        HSPP_PROTOCOL_VERSION,
      canonicalizationVersion,
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
      derivationLineage,
    });

  const receivedAt =
    requireTimestamp(
      input.receivedAt ??
        new Date().toISOString(),
      "receivedAt"
    );

  return {
    protocolVersion:
      HSPP_PROTOCOL_VERSION,

    canonicalizationVersion,

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

    derivationLineage:
      fingerprint.derivationLineage,

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
