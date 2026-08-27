export type PersistRouteSafetyProviderObservationInput = {
  supabase: any;

  organizationId: string;
  provider: string;
  sourceStream: string;
  providerMessageId: string;

  observedAt: string;
  receivedAt?: string;

  payloadSchemaVersion: string;
  normalizedPayload: Record<string, unknown>;
};

export type PersistedRouteSafetyProviderObservation = {
  id: string;

  organizationId: string;
  provider: string;
  sourceStream: string;
  providerMessageId: string;

  observedAt: string;
  receivedAt: string;

  payloadSchemaVersion: string;
  normalizedPayload: Record<string, unknown>;

  created: boolean;
};

type PersistedObservationRow = {
  id: unknown;

  organization_id: unknown;
  provider: unknown;
  source_stream: unknown;
  provider_message_id: unknown;

  observed_at: unknown;
  received_at: unknown;

  payload_schema_version: unknown;
  normalized_payload: unknown;
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

function requireTimestamp(
  value: string,
  fieldName: string
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName
    );

  const milliseconds =
    Date.parse(normalized);

  if (!Number.isFinite(milliseconds)) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`
    );
  }

  return new Date(
    milliseconds
  ).toISOString();
}

function requirePayload(
  payload: Record<string, unknown>
): Record<string, unknown> {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new Error(
      "normalizedPayload must be an object."
    );
  }

  return payload;
}

function canonicalizeJson(
  value: unknown
): unknown {
  if (Array.isArray(value)) {
    return value.map(
      canonicalizeJson
    );
  }

  if (
    value !== null &&
    typeof value === "object"
  ) {
    const input =
      value as Record<string, unknown>;

    const result:
      Record<string, unknown> = {};

    for (
      const key
      of Object.keys(input).sort()
    ) {
      result[key] =
        canonicalizeJson(
          input[key]
        );
    }

    return result;
  }

  return value;
}

function canonicalJsonString(
  value: unknown
): string {
  return JSON.stringify(
    canonicalizeJson(value)
  );
}

function mapPersistedObservation(
  row: PersistedObservationRow,
  created: boolean
): PersistedRouteSafetyProviderObservation {
  if (
    typeof row.id !== "string" ||
    typeof row.organization_id !== "string" ||
    typeof row.provider !== "string" ||
    typeof row.source_stream !== "string" ||
    typeof row.provider_message_id !== "string" ||
    typeof row.observed_at !== "string" ||
    typeof row.received_at !== "string" ||
    typeof row.payload_schema_version !== "string" ||
    !row.normalized_payload ||
    typeof row.normalized_payload !== "object" ||
    Array.isArray(row.normalized_payload)
  ) {
    throw new Error(
      "Persisted Route Safety provider observation returned an invalid result."
    );
  }

  return {
    id:
      row.id,

    organizationId:
      row.organization_id,

    provider:
      row.provider,

    sourceStream:
      row.source_stream,

    providerMessageId:
      row.provider_message_id,

    observedAt:
      row.observed_at,

    receivedAt:
      row.received_at,

    payloadSchemaVersion:
      row.payload_schema_version,

    normalizedPayload:
      row.normalized_payload as Record<string, unknown>,

    created,
  };
}

function assertExistingObservationMatches(
  existing: PersistedRouteSafetyProviderObservation,
  expected: {
    observedAt: string;
    payloadSchemaVersion: string;
    normalizedPayload: Record<string, unknown>;
  }
): void {
  const existingObservedAt =
    requireTimestamp(
      existing.observedAt,
      "existing observedAt"
    );

  if (
    existingObservedAt !==
    expected.observedAt
  ) {
    throw new Error(
      "Provider observation identity collision: observedAt does not match the existing immutable observation."
    );
  }

  if (
    existing.payloadSchemaVersion !==
    expected.payloadSchemaVersion
  ) {
    throw new Error(
      "Provider observation identity collision: payload schema does not match the existing immutable observation."
    );
  }

  if (
    canonicalJsonString(
      existing.normalizedPayload
    ) !==
    canonicalJsonString(
      expected.normalizedPayload
    )
  ) {
    throw new Error(
      "Provider observation identity collision: normalized payload does not match the existing immutable observation."
    );
  }
}

export async function persistRouteSafetyProviderObservation({
  supabase,
  organizationId,
  provider,
  sourceStream,
  providerMessageId,
  observedAt,
  receivedAt,
  payloadSchemaVersion,
  normalizedPayload,
}: PersistRouteSafetyProviderObservationInput): Promise<PersistedRouteSafetyProviderObservation> {
  const normalizedOrganizationId =
    requireNonBlank(
      organizationId,
      "organizationId"
    );

  const normalizedProvider =
    requireNonBlank(
      provider,
      "provider"
    );

  const normalizedSourceStream =
    requireNonBlank(
      sourceStream,
      "sourceStream"
    );

  const normalizedProviderMessageId =
    requireNonBlank(
      providerMessageId,
      "providerMessageId"
    );

  const normalizedObservedAt =
    requireTimestamp(
      observedAt,
      "observedAt"
    );

  const normalizedReceivedAt =
    receivedAt === undefined
      ? new Date().toISOString()
      : requireTimestamp(
          receivedAt,
          "receivedAt"
        );

  const normalizedPayloadSchemaVersion =
    requireNonBlank(
      payloadSchemaVersion,
      "payloadSchemaVersion"
    );

  const validatedPayload =
    requirePayload(
      normalizedPayload
    );

  const row = {
    organization_id:
      normalizedOrganizationId,

    provider:
      normalizedProvider,

    source_stream:
      normalizedSourceStream,

    provider_message_id:
      normalizedProviderMessageId,

    observed_at:
      normalizedObservedAt,

    received_at:
      normalizedReceivedAt,

    payload_schema_version:
      normalizedPayloadSchemaVersion,

    normalized_payload:
      validatedPayload,
  };

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "route_safety_provider_observations"
      )
      .insert(row)
      .select(
        [
          "id",
          "organization_id",
          "provider",
          "source_stream",
          "provider_message_id",
          "observed_at",
          "received_at",
          "payload_schema_version",
          "normalized_payload",
        ].join(",")
      )
      .single();

  if (!error) {
    if (!data) {
      throw new Error(
        "Persisted Route Safety provider observation returned no row."
      );
    }

    return mapPersistedObservation(
      data,
      true
    );
  }

  if (error.code !== "23505") {
    throw error;
  }

  const {
    data: existingData,
    error: existingError,
  } =
    await supabase
      .from(
        "route_safety_provider_observations"
      )
      .select(
        [
          "id",
          "organization_id",
          "provider",
          "source_stream",
          "provider_message_id",
          "observed_at",
          "received_at",
          "payload_schema_version",
          "normalized_payload",
        ].join(",")
      )
      .eq(
        "organization_id",
        normalizedOrganizationId
      )
      .eq(
        "provider",
        normalizedProvider
      )
      .eq(
        "source_stream",
        normalizedSourceStream
      )
      .eq(
        "provider_message_id",
        normalizedProviderMessageId
      )
      .eq(
        "payload_schema_version",
        normalizedPayloadSchemaVersion
      )
      .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existingData) {
    throw new Error(
      "Provider observation duplicate was reported but the existing row could not be found."
    );
  }

  const existing =
    mapPersistedObservation(
      existingData,
      false
    );

  assertExistingObservationMatches(
    existing,
    {
      observedAt:
        normalizedObservedAt,

      payloadSchemaVersion:
        normalizedPayloadSchemaVersion,

      normalizedPayload:
        validatedPayload,
    }
  );

  return existing;
}
