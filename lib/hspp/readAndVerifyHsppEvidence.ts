import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  HsppDerivationLineage,
} from "@/lib/hspp/createHsppIntegrityFingerprint";

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

  operationalEligible: boolean;

  assessmentPolicyVersion: string | null;
  assessmentReason: string | null;
  assessedAt: string | null;

  derivationLineage:
    HsppDerivationLineage | null;
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

  operational_eligible: unknown;

  assessment_policy_version: unknown;
  assessment_reason: unknown;
  assessed_at: unknown;

  parent_evidence_id: unknown;
  parent_integrity_fingerprint: unknown;
  derivation_type: unknown;
  derivation_version: unknown;
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
  "operational_eligible",
  "assessment_policy_version",
  "assessment_reason",
  "assessed_at",
  "parent_evidence_id",
  "parent_integrity_fingerprint",
  "derivation_type",
  "derivation_version",
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

function requireBoolean(
  value: unknown,
  fieldName: string
): boolean {
  if (typeof value !== "boolean") {
    throw new Error(
      `Persisted HSPP ${fieldName} must be boolean.`
    );
  }

  return value;
}

function optionalString(
  value: unknown,
  fieldName: string
): string | null {
  if (value === null) {
    return null;
  }

  return requireString(
    value,
    fieldName
  );
}

function mapAssessmentProvenance(
  row: HsppEvidenceRow
): {
  policyVersion: string | null;
  reason: string | null;
  assessedAt: string | null;
} {
  const values = [
    row.assessment_policy_version,
    row.assessment_reason,
    row.assessed_at,
  ];

  if (
    values.every(
      (value) => value === null
    )
  ) {
    return {
      policyVersion: null,
      reason: null,
      assessedAt: null,
    };
  }

  if (
    values.some(
      (value) =>
        value === null ||
        value === undefined
    )
  ) {
    throw new Error(
      "Persisted HSPP assessment provenance must be either entirely null or complete."
    );
  }

  return {
    policyVersion:
      optionalString(
        row.assessment_policy_version,
        "assessment_policy_version"
      ),

    reason:
      optionalString(
        row.assessment_reason,
        "assessment_reason"
      ),

    assessedAt:
      optionalString(
        row.assessed_at,
        "assessed_at"
      ),
  };
}
function mapDerivationLineage(
  row: HsppEvidenceRow
): HsppDerivationLineage | null {
  const values = [
    row.parent_evidence_id,
    row.parent_integrity_fingerprint,
    row.derivation_type,
    row.derivation_version,
  ];

  if (
    values.every(
      (value) => value === null
    )
  ) {
    return null;
  }

  if (
    values.some(
      (value) =>
        value === null ||
        value === undefined
    )
  ) {
    throw new Error(
      "Persisted HSPP derivation lineage must be either entirely null or complete."
    );
  }

  return {
    parentEvidenceId:
      requireString(
        row.parent_evidence_id,
        "parent_evidence_id"
      ),

    parentIntegrityFingerprint:
      requireString(
        row.parent_integrity_fingerprint,
        "parent_integrity_fingerprint"
      ),

    derivationType:
      requireString(
        row.derivation_type,
        "derivation_type"
      ),

    derivationVersion:
      requireString(
        row.derivation_version,
        "derivation_version"
      ),
  };
}

function mapPersistedHsppEvidence(
  row: HsppEvidenceRow,
  expectedOrganizationId: string,
  expectedEvidenceId: string
): PersistedHsppEvidenceRecord {
  const id =
    requireString(
      row.id,
      "id"
    );

  const organizationId =
    requireString(
      row.organization_id,
      "organization_id"
    );

  if (
    id !==
    expectedEvidenceId
  ) {
    throw new Error(
      "Persisted HSPP evidence id does not match the requested evidence."
    );
  }

  if (
    organizationId !==
    expectedOrganizationId
  ) {
    throw new Error(
      "Persisted HSPP evidence organization does not match the requested organization."
    );
  }

  const assessment =
    mapAssessmentProvenance(row);

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

    operationalEligible:
      requireBoolean(
        row.operational_eligible,
        "operational_eligible"
      ),

    assessmentPolicyVersion:
      assessment.policyVersion,

    assessmentReason:
      assessment.reason,

    assessedAt:
      assessment.assessedAt,

    derivationLineage:
      mapDerivationLineage(row),
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

      derivationLineage:
        evidence.derivationLineage,
    });

  return {
    found: true,
    evidence,
    verification,
  };
}
