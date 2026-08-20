import type {
  BuiltHsppEvidence,
} from "@/lib/hspp/buildHsppEvidence";

import {
  persistHsppEvidence,
  type PersistedHsppEvidence,
} from "@/lib/hspp/persistHsppEvidence";

export type PersistHsppEvidenceForProviderObservationInput = {
  supabase: any;
  organizationId: string;
  providerObservationId: string;
  evidence: BuiltHsppEvidence;
};

export type PersistedHsppEvidenceForProviderObservation =
  PersistedHsppEvidence & {
    created: boolean;
  };

type ExistingHsppEvidenceRow = {
  id: unknown;
  integrity_fingerprint: unknown;
};

function requireNonBlank(
  value: string,
  fieldName: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return normalized;
}

function mapExistingHsppEvidence(
  row: ExistingHsppEvidenceRow
): PersistedHsppEvidence {
  if (
    typeof row.id !== "string" ||
    typeof row.integrity_fingerprint !== "string"
  ) {
    throw new Error(
      "Existing HSPP evidence returned an invalid result."
    );
  }

  return {
    id:
      row.id,

    integrityFingerprint:
      row.integrity_fingerprint,
  };
}

export async function persistHsppEvidenceForProviderObservation({
  supabase,
  organizationId,
  providerObservationId,
  evidence,
}: PersistHsppEvidenceForProviderObservationInput): Promise<PersistedHsppEvidenceForProviderObservation> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId"
    );

  const normalizedProviderObservationId =
    requireNonBlank(
      providerObservationId,
      "providerObservationId"
    );

  try {
    const persisted =
      await persistHsppEvidence({
        supabase,
        organizationId:
          normalizedOrganizationId,
        evidence,
        providerObservationId:
          normalizedProviderObservationId,
      });

    return {
      ...persisted,
      created:
        true,
    };
  } catch (error: any) {
    if (error?.code !== "23505") {
      throw error;
    }
  }

  const {
    data,
    error:
      existingError,
  } =
    await supabase
      .from(
        "hspp_evidence"
      )
      .select(
        "id, integrity_fingerprint"
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .eq(
        "provider_observation_id",
        normalizedProviderObservationId
      )
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!data) {
    throw new Error(
      "HSPP evidence duplicate was reported but the provider-observation evidence row could not be found."
    );
  }

  const existing =
    mapExistingHsppEvidence(
      data as ExistingHsppEvidenceRow
    );

  if (
    existing.integrityFingerprint !==
    evidence.integrityFingerprint
  ) {
    throw new Error(
      "Existing HSPP evidence does not match the provider observation evidence being persisted."
    );
  }

  return {
    ...existing,
    created:
      false,
  };
}
