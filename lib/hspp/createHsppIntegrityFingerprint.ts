import { createHash } from "crypto";

import {
  canonicalizeHsppEvidence,
  HSPP_CANONICALIZATION_VERSION,
} from "@/lib/hspp/canonicalizeHsppEvidence";

export const HSPP_PROTOCOL_VERSION = "0.1" as const;
export const HSPP_INTEGRITY_ALGORITHM = "sha256" as const;

export type HsppFingerprintInput = {
  protocolVersion: string;
  canonicalizationVersion: string;
  sourceClass: string;
  sourceProvider: string;
  sourceStream: string;
  sourceMessageId: string;
  observedAt: string;
  payloadSchemaVersion: string;
  normalizedPayload: Record<string, unknown>;
};

export type HsppFingerprintResult = {
  protocolVersion: string;
  canonicalizationVersion: string;
  sourceClass: string;
  sourceProvider: string;
  sourceStream: string;
  sourceMessageId: string;
  observedAt: string;
  payloadSchemaVersion: string;
  normalizedPayload: Record<string, unknown>;
  canonicalEvidence: string;
  integrityFingerprint: string;
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

export function createHsppIntegrityFingerprint(
  input: HsppFingerprintInput
): HsppFingerprintResult {
  const protocolVersion = requireNonBlank(
    input.protocolVersion,
    "protocolVersion"
  );

  const canonicalizationVersion = requireNonBlank(
    input.canonicalizationVersion,
    "canonicalizationVersion"
  );

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

  const canonicalInput = {
    protocol_version:
      protocolVersion,
    canonicalization_version:
      canonicalizationVersion,
    source_class:
      sourceClass,
    source_provider:
      sourceProvider,
    source_stream:
      sourceStream,
    source_message_id:
      sourceMessageId,
    observed_at:
      observedAt,
    payload_schema_version:
      payloadSchemaVersion,
    normalized_payload:
      input.normalizedPayload,
  };

  const canonicalEvidence =
    canonicalizeHsppEvidence(canonicalInput);

  const integrityFingerprint =
    createHash(HSPP_INTEGRITY_ALGORITHM)
      .update(canonicalEvidence, "utf8")
      .digest("hex");

  return {
    protocolVersion,
    canonicalizationVersion,
    sourceClass,
    sourceProvider,
    sourceStream,
    sourceMessageId,
    observedAt,
    payloadSchemaVersion,
    normalizedPayload:
      input.normalizedPayload,
    canonicalEvidence,
    integrityFingerprint,
  };
}

export { HSPP_CANONICALIZATION_VERSION };
