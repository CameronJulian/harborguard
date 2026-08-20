import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  verifyHsppEvidenceIntegrity,
  type HsppIntegrityVerificationResult,
} from "@/lib/hspp/verifyHsppEvidenceIntegrity";

export type ReadAndVerifyHsppEvidenceInput = {
  supabase: SupabaseClient;
  organizationId: string;
  evidenceId: string;
};

export type PersistedHsppEvidenceRecord = {
  id: string;
  organizationId: string;
  protocolVersion: string;
  canonicalizationVersion: string;
  sourceClass: string;
  sourceProvider: string;
  sourceStream: string;
  sourceMessageId: string;
  observedAt: string;
  receivedAt: string;
  payloadSchemaVersion: string;
  normalizedPayload: Record<string, unknown>;
  integrityAlgorithm: string;
  integrityFingerprint: string;
  integrityState: string;
  validationState: string;
  trustState: string;
};

export type ReadAndVerifyHsppEvidenceResult =
  | {
      found: false;
      evidence: null;
      verification: null;
    }
  | {
      found: true;
      evidence: PersistedHsppEvidenceRecord;
      verification:
        HsppIntegrityVerificationResult;
    };

type HsppEvidenceRow = {
  id: unknown;
  organization_id: unknown;
  protocol_version: unknown;
  canonicalization_version: unknown;
  source_class: unknown;
  source_provider: unknown;
  source_stream: unknown;
  source_message_id: unknown;
  observed_at: unknown;
  received_at: unknown;
  payload_schema_version: unknown;
  normalized_payload: unknown;
  integrity_algorithm: unknown;
  integrity_fingerprint: unknown;
  integrity_state: unknown;
  validation_state: unknown;
  trust_state: unknown;
};

const HSPP_EVIDENCE_SELECT = [
  "id",
  "organization_id",
  "protocol_version",
  "canonicalization_version",
  "source_class",
  "source_provider",
  "source_stream",
  "source_message_id",
  "observed_at",
  "received_at",
  "payload_schema_version",
  "normalized_payload",
  "integrity_algorithm",
  "integrity_fingerprint",
  "integrity_state",
  "validation_state",
  "trust_state",
].join(", ");

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

function requireString(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `Persisted HSPP ${fieldName} must be a non-empty string.`
    );
  }

  return value;
}

function requirePayload(
  value: unknown
): Record<string, unknown> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Persisted HSPP normalized_payload must be an object."
    );
  }

  return value as Record<string, unknown>;
}

function mapPersistedHsppEvidence(
  row: HsppEvidenceRow,
  expectedOrganizationId: string,
  expectedEvidenceId: string
): PersistedHsppEvidenceRecord {
  const id = requireString(
    row.id,
    "id"
  );

  const organizationId = requireString(
    row.organization_id,
    "organization_id"
  );

  if (id !== expectedEvidenceId) {
    throw new Error(
      "Persisted HSPP evidence id does not match the requested evidence."
    );
  }

  if (organizationId !== expectedOrganizationId) {
    throw new Error(
      "Persisted HSPP evidence organization does not match the requested organization."
    );
  }

  return {
    id,
    organizationId,
    protocolVersion:
      requireString(
        row.protocol_version,
        "protocol_version"
      ),
    canonicalizationVersion:
      requireString(
        row.canonicalization_version,
        "canonicalization_version"
      ),
    sourceClass:
      requireString(
        row.source_class,
        "source_class"
      ),
    sourceProvider:
      requireString(
        row.source_provider,
        "source_provider"
      ),
    sourceStream:
      requireString(
        row.source_stream,
        "source_stream"
      ),
    sourceMessageId:
      requireString(
        row.source_message_id,
        "source_message_id"
      ),
    observedAt:
      requireString(
        row.observed_at,
        "observed_at"
      ),
    receivedAt:
      requireString(
        row.received_at,
        "received_at"
      ),
    payloadSchemaVersion:
      requireString(
        row.payload_schema_version,
        "payload_schema_version"
      ),
    normalizedPayload:
      requirePayload(
        row.normalized_payload
      ),
    integrityAlgorithm:
      requireString(
        row.integrity_algorithm,
        "integrity_algorithm"
      ),
    integrityFingerprint:
      requireString(
        row.integrity_fingerprint,
        "integrity_fingerprint"
      ),
    integrityState:
      requireString(
        row.integrity_state,
        "integrity_state"
      ),
    validationState:
      requireString(
        row.validation_state,
        "validation_state"
      ),
    trustState:
      requireString(
        row.trust_state,
        "trust_state"
      ),
  };
}

export async function readAndVerifyHsppEvidence({
  supabase,
  organizationId,
  evidenceId,
}: ReadAndVerifyHsppEvidenceInput): Promise<ReadAndVerifyHsppEvidenceResult> {
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

  const { data, error } =
    await supabase
      .from("hspp_evidence")
      .select(HSPP_EVIDENCE_SELECT)
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .eq(
        "id",
        normalizedEvidenceId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return {
      found: false,
      evidence: null,
      verification: null,
    };
  }

  const evidence =
    mapPersistedHsppEvidence(
      data as unknown as HsppEvidenceRow,
      normalizedOrganizationId,
      normalizedEvidenceId
    );

  const verification =
    verifyHsppEvidenceIntegrity({
      protocolVersion:
        evidence.protocolVersion,
      canonicalizationVersion:
        evidence.canonicalizationVersion,
      sourceClass:
        evidence.sourceClass,
      sourceProvider:
        evidence.sourceProvider,
      sourceStream:
        evidence.sourceStream,
      sourceMessageId:
        evidence.sourceMessageId,
      observedAt:
        evidence.observedAt,
      receivedAt:
        evidence.receivedAt,
      payloadSchemaVersion:
        evidence.payloadSchemaVersion,
      normalizedPayload:
        evidence.normalizedPayload,
      integrityAlgorithm:
        evidence.integrityAlgorithm,
      integrityFingerprint:
        evidence.integrityFingerprint,
      trustState:
        evidence.trustState,
    });

  return {
    found: true,
    evidence,
    verification,
  };
}
