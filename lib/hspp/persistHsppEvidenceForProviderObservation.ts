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

export type PrefetchedHsppEvidenceForProviderObservation = {
  id: string;
  integrityFingerprint: string;
};

type PrefetchedHsppEvidenceRow = {
  id: unknown;
  provider_observation_id: unknown;
  integrity_fingerprint: unknown;
};

export async function prefetchHsppEvidenceForProviderObservations({
  supabase,
  organizationId,
  providerObservationIds,
}: {
  supabase: any;
  organizationId: string;
  providerObservationIds: string[];
}): Promise<
  Map<
    string,
    PrefetchedHsppEvidenceForProviderObservation
  >
> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId"
    );

  const normalizedProviderObservationIds =
    Array.from(
      new Set(
        providerObservationIds
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );

  const result =
    new Map<
      string,
      PrefetchedHsppEvidenceForProviderObservation
    >();

  if (
    normalizedProviderObservationIds.length === 0
  ) {
    return result;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "hspp_evidence"
      )
      .select(
        "id, provider_observation_id, integrity_fingerprint"
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .in(
        "provider_observation_id",
        normalizedProviderObservationIds
      );

  if (error) {
    throw error;
  }

  for (
    const row of
      (data ?? []) as PrefetchedHsppEvidenceRow[]
  ) {

    if (
      typeof row.id !== "string" ||
      typeof row.provider_observation_id !==
        "string" ||
      typeof row.integrity_fingerprint !==
        "string"
    ) {
      throw new Error(
        "Prefetched HSPP evidence returned an invalid result."
      );
    }

    if (
      result.has(
        row.provider_observation_id
      )
    ) {
      throw new Error(
        "Prefetched HSPP evidence returned duplicate provider-observation identities."
      );
    }

    result.set(
      row.provider_observation_id,
      {
        id:
          row.id,
        integrityFingerprint:
          row.integrity_fingerprint,
      }
    );
  }

  return result;
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
