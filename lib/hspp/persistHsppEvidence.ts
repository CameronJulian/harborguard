import type {
  BuiltHsppEvidence,
} from "@/lib/hspp/buildHsppEvidence";

export type PersistHsppEvidenceInput = {
  supabase: any;
  organizationId: string;
  evidence: BuiltHsppEvidence;
  providerObservationId?: string | null;
  telematicsReceiptId?: string | null;
  vehicleId?: string | null;
  tripId?: string | null;
};

export type PersistedHsppEvidence = {
  id: string;
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

export async function persistHsppEvidence({
  supabase,
  organizationId,
  evidence,
  providerObservationId = null,
  telematicsReceiptId = null,
  vehicleId = null,
  tripId = null,
}: PersistHsppEvidenceInput): Promise<PersistedHsppEvidence> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId"
    );

  const lineage =
    evidence.derivationLineage;

  const { data, error } =
    await supabase
      .from("hspp_evidence")
      .insert({
        organization_id:
          normalizedOrganizationId,

        protocol_version:
          evidence.protocolVersion,

        canonicalization_version:
          evidence.canonicalizationVersion,

        source_class:
          evidence.sourceClass,

        source_provider:
          evidence.sourceProvider,

        source_stream:
          evidence.sourceStream,

        source_message_id:
          evidence.sourceMessageId,

        observed_at:
          evidence.observedAt,

        received_at:
          evidence.receivedAt,

        payload_schema_version:
          evidence.payloadSchemaVersion,

        normalized_payload:
          evidence.normalizedPayload,

        integrity_algorithm:
          evidence.integrityAlgorithm,

        integrity_fingerprint:
          evidence.integrityFingerprint,

        integrity_state:
          evidence.integrityState,

        validation_state:
          evidence.validationState,

        trust_state:
          evidence.trustState,

        operational_eligible:
          evidence.operationalEligible,

        crowd_eligible:
          evidence.crowdEligible,

        training_eligible:
          evidence.trainingEligible,

        validation_eligible:
          evidence.validationEligible,

        parent_evidence_id:
          lineage?.parentEvidenceId ??
          null,

        parent_integrity_fingerprint:
          lineage?.parentIntegrityFingerprint ??
          null,

        derivation_type:
          lineage?.derivationType ??
          null,

        derivation_version:
          lineage?.derivationVersion ??
          null,

        provider_observation_id:
          providerObservationId,

        telematics_receipt_id:
          telematicsReceiptId,

        vehicle_id:
          vehicleId,

        trip_id:
          tripId,
      })
      .select(
        "id, integrity_fingerprint"
      )
      .single();

  if (error) {
    throw error;
  }

  if (
    !data ||
    typeof data.id !== "string" ||
    typeof data.integrity_fingerprint !==
      "string"
  ) {
    throw new Error(
      "Persisted HSPP evidence returned an invalid result."
    );
  }

  return {
    id:
      data.id,

    integrityFingerprint:
      data.integrity_fingerprint,
  };
}
