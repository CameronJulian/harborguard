import {
  timingSafeEqual,
} from "crypto";

import {
  createHsppIntegrityFingerprint,
  HSPP_CANONICALIZATION_VERSION_V1,
  HSPP_CANONICALIZATION_VERSION_V2,
  HSPP_INTEGRITY_ALGORITHM,
  HSPP_PROTOCOL_VERSION,
  type HsppDerivationLineage,
} from "@/lib/hspp/createHsppIntegrityFingerprint";

export type VerifyHsppEvidenceIntegrityInput = {
  protocolVersion: string;
  canonicalizationVersion: string;
  sourceClass: string;
  sourceProvider: string;
  sourceStream: string;
  sourceMessageId: string;
  observedAt: string;
  receivedAt?: string;
  payloadSchemaVersion: string;
  normalizedPayload: Record<string, unknown>;
  integrityAlgorithm: string;
  integrityFingerprint: string;
  trustState?: string;
  derivationLineage?: HsppDerivationLineage | null;
};

export type HsppIntegrityVerificationResult =
  | {
      status: "MATCH";
      expectedFingerprint: string;
      actualFingerprint: string;
    }
  | {
      status: "MISMATCH";
      expectedFingerprint: string;
      actualFingerprint: string;
    }
  | {
      status: "UNSUPPORTED_PROTOCOL_VERSION";
      protocolVersion: string;
    }
  | {
      status: "UNSUPPORTED_CANONICALIZATION_VERSION";
      canonicalizationVersion: string;
    }
  | {
      status: "UNSUPPORTED_INTEGRITY_ALGORITHM";
      integrityAlgorithm: string;
    }
  | {
      status: "INVALID_DERIVATION_LINEAGE";
    };

function fingerprintsMatch(
  expected: string,
  actual: string
): boolean {
  if (
    !/^[0-9a-f]{64}$/.test(expected) ||
    !/^[0-9a-f]{64}$/.test(actual)
  ) {
    return false;
  }

  const expectedBuffer =
    Buffer.from(expected, "hex");

  const actualBuffer =
    Buffer.from(actual, "hex");

  if (
    expectedBuffer.length !==
    actualBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    expectedBuffer,
    actualBuffer
  );
}

export function verifyHsppEvidenceIntegrity(
  input: VerifyHsppEvidenceIntegrityInput
): HsppIntegrityVerificationResult {
  if (
    input.protocolVersion !==
    HSPP_PROTOCOL_VERSION
  ) {
    return {
      status:
        "UNSUPPORTED_PROTOCOL_VERSION",
      protocolVersion:
        input.protocolVersion,
    };
  }

  if (
    input.canonicalizationVersion !==
      HSPP_CANONICALIZATION_VERSION_V1 &&
    input.canonicalizationVersion !==
      HSPP_CANONICALIZATION_VERSION_V2
  ) {
    return {
      status:
        "UNSUPPORTED_CANONICALIZATION_VERSION",
      canonicalizationVersion:
        input.canonicalizationVersion,
    };
  }

  if (
    input.integrityAlgorithm !==
    HSPP_INTEGRITY_ALGORITHM
  ) {
    return {
      status:
        "UNSUPPORTED_INTEGRITY_ALGORITHM",
      integrityAlgorithm:
        input.integrityAlgorithm,
    };
  }

  const hasLineage =
    input.derivationLineage != null;

  if (
    input.canonicalizationVersion ===
      HSPP_CANONICALIZATION_VERSION_V1 &&
    hasLineage
  ) {
    return {
      status:
        "INVALID_DERIVATION_LINEAGE",
    };
  }

  if (
    input.canonicalizationVersion ===
      HSPP_CANONICALIZATION_VERSION_V2 &&
    !hasLineage
  ) {
    return {
      status:
        "INVALID_DERIVATION_LINEAGE",
    };
  }

  let actual;

  try {
    actual =
      createHsppIntegrityFingerprint({
        protocolVersion:
          input.protocolVersion,
        canonicalizationVersion:
          input.canonicalizationVersion,
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
        derivationLineage:
          input.derivationLineage ?? null,
      });
  }
  catch {
    return {
      status:
        "INVALID_DERIVATION_LINEAGE",
    };
  }

  const expectedFingerprint =
    input.integrityFingerprint;

  const actualFingerprint =
    actual.integrityFingerprint;

  if (
    fingerprintsMatch(
      expectedFingerprint,
      actualFingerprint
    )
  ) {
    return {
      status: "MATCH",
      expectedFingerprint,
      actualFingerprint,
    };
  }

  return {
    status: "MISMATCH",
    expectedFingerprint,
    actualFingerprint,
  };
}
