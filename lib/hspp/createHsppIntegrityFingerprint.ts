import { createHash } from "crypto";

import {
  canonicalizeHsppEvidence,
} from "@/lib/hspp/canonicalizeHsppEvidence";

export const HSPP_PROTOCOL_VERSION =
  "0.1" as const;

export const HSPP_INTEGRITY_ALGORITHM =
  "sha256" as const;

export const HSPP_CANONICALIZATION_VERSION_V1 =
  "hspp-canonical-json-v1" as const;

export const HSPP_CANONICALIZATION_VERSION_V2 =
  "hspp-canonical-json-lineage-v2" as const;

/*
 * Backward-compatible alias.
 *
 * Existing/root HSPP evidence continues to use v1.
 */
export const HSPP_CANONICALIZATION_VERSION =
  HSPP_CANONICALIZATION_VERSION_V1;

export type HsppDerivationLineage = {
  parentEvidenceId: string;
  parentIntegrityFingerprint: string;
  derivationType: string;
  derivationVersion: string;
};

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
  derivationLineage?: HsppDerivationLineage | null;
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
  derivationLineage: HsppDerivationLineage | null;
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

function requireSha256(
  value: string,
  fieldName: string
): string {
  const normalized =
    requireNonBlank(value, fieldName);

  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error(
      `${fieldName} must be a lowercase SHA-256 hexadecimal fingerprint.`
    );
  }

  return normalized;
}

function normalizeLineage(
  lineage: HsppDerivationLineage
): HsppDerivationLineage {
  return {
    parentEvidenceId:
      requireNonBlank(
        lineage.parentEvidenceId,
        "derivationLineage.parentEvidenceId"
      ),
    parentIntegrityFingerprint:
      requireSha256(
        lineage.parentIntegrityFingerprint,
        "derivationLineage.parentIntegrityFingerprint"
      ),
    derivationType:
      requireNonBlank(
        lineage.derivationType,
        "derivationLineage.derivationType"
      ),
    derivationVersion:
      requireNonBlank(
        lineage.derivationVersion,
        "derivationLineage.derivationVersion"
      ),
  };
}

export function createHsppIntegrityFingerprint(
  input: HsppFingerprintInput
): HsppFingerprintResult {
  const protocolVersion =
    requireNonBlank(
      input.protocolVersion,
      "protocolVersion"
    );

  const canonicalizationVersion =
    requireNonBlank(
      input.canonicalizationVersion,
      "canonicalizationVersion"
    );

  const sourceClass =
    requireNonBlank(
      input.sourceClass,
      "sourceClass"
    );

  const sourceProvider =
    requireNonBlank(
      input.sourceProvider,
      "sourceProvider"
    );

  const sourceStream =
    requireNonBlank(
      input.sourceStream,
      "sourceStream"
    );

  const sourceMessageId =
    requireNonBlank(
      input.sourceMessageId,
      "sourceMessageId"
    );

  const payloadSchemaVersion =
    requireNonBlank(
      input.payloadSchemaVersion,
      "payloadSchemaVersion"
    );

  const observedAt =
    requireTimestamp(
      input.observedAt,
      "observedAt"
    );

  let derivationLineage:
    HsppDerivationLineage | null = null;

  let canonicalInput:
    Record<string, unknown>;

  if (
    canonicalizationVersion ===
    HSPP_CANONICALIZATION_VERSION_V1
  ) {
    if (input.derivationLineage) {
      throw new Error(
        "HSPP canonical JSON v1 does not support derivation lineage."
      );
    }

    /*
     * Preserve the original HSPP v0.1 canonical representation
     * byte-for-byte for previously sealed/root evidence.
     */
    canonicalInput = {
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
  }
  else if (
    canonicalizationVersion ===
    HSPP_CANONICALIZATION_VERSION_V2
  ) {
    if (!input.derivationLineage) {
      throw new Error(
        "HSPP lineage canonicalization requires complete derivation lineage."
      );
    }

    derivationLineage =
      normalizeLineage(
        input.derivationLineage
      );

    canonicalInput = {
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
      derivation_lineage: {
        parent_evidence_id:
          derivationLineage.parentEvidenceId,
        parent_integrity_fingerprint:
          derivationLineage.parentIntegrityFingerprint,
        derivation_type:
          derivationLineage.derivationType,
        derivation_version:
          derivationLineage.derivationVersion,
      },
    };
  }
  else {
    throw new Error(
      `Unsupported HSPP canonicalization version: ${canonicalizationVersion}`
    );
  }

  const canonicalEvidence =
    canonicalizeHsppEvidence(
      canonicalInput
    );

  const integrityFingerprint =
    createHash(
      HSPP_INTEGRITY_ALGORITHM
    )
      .update(
        canonicalEvidence,
        "utf8"
      )
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
    derivationLineage,
    canonicalEvidence,
    integrityFingerprint,
  };
}
