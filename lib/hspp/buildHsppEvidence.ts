import { createHash } from "crypto";

import {
  canonicalizeHsppEvidence,
  HSPP_CANONICALIZATION_VERSION,
} from "@/lib/hspp/canonicalizeHsppEvidence";

export const HSPP_PROTOCOL_VERSION = "0.1" as const;
export const HSPP_INTEGRITY_ALGORITHM = "sha256" as const;

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
  const sourceClass = requireNonBlank(
    input.sourceClass,
    "sourceClass"
  );

  const sourceProvider = requireNonBlank(
    input.sourceProvider,
    "sourceProvider"
  );

  const sourceStream = requireNonBlank(
    input.sourceStream,
    "sourceStream"
  );

  const sourceMessageId = requireNonBlank(
    input.sourceMessageId,
    "sourceMessageId"
  );

  const payloadSchemaVersion = requireNonBlank(
    input.payloadSchemaVersion,
    "payloadSchemaVersion"
  );

  const observedAt = requireTimestamp(
    input.observedAt,
    "observedAt"
  );

  const receivedAt = requireTimestamp(
    input.receivedAt ?? new Date().toISOString(),
    "receivedAt"
  );

  const canonicalInput = {
    protocol_version: HSPP_PROTOCOL_VERSION,
    canonicalization_version:
      HSPP_CANONICALIZATION_VERSION,
    source_class: sourceClass,
    source_provider: sourceProvider,
    source_stream: sourceStream,
    source_message_id: sourceMessageId,
    observed_at: observedAt,
    payload_schema_version:
      payloadSchemaVersion,
    normalized_payload:
      input.normalizedPayload,
  };

  const canonical =
    canonicalizeHsppEvidence(canonicalInput);

  const integrityFingerprint =
    createHash(HSPP_INTEGRITY_ALGORITHM)
      .update(canonical, "utf8")
      .digest("hex");

  return {
    protocolVersion: HSPP_PROTOCOL_VERSION,
    canonicalizationVersion:
      HSPP_CANONICALIZATION_VERSION,
    sourceClass,
    sourceProvider,
    sourceStream,
    sourceMessageId,
    observedAt,
    receivedAt,
    payloadSchemaVersion,
    normalizedPayload:
      input.normalizedPayload,
    integrityAlgorithm:
      HSPP_INTEGRITY_ALGORITHM,
    integrityFingerprint,
    integrityState: "INTEGRITY_SEALED",
    validationState: "VALIDATED",
    trustState: "UNASSESSED",
    operationalEligible: true,
    crowdEligible: false,
    trainingEligible: false,
    validationEligible: false,
  };
}
