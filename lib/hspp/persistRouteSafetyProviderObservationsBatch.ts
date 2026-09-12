import type {
  PersistedRouteSafetyProviderObservation,
} from "@/lib/hspp/persistRouteSafetyProviderObservation";

export const
  ROUTE_SAFETY_PROVIDER_OBSERVATIONS_BATCH_RPC =
    "persist_route_safety_provider_observations_batch" as const;

export type PersistRouteSafetyProviderObservationBatchItem = {
  providerMessageId: string;
  observedAt: string;
  receivedAt: string;
  normalizedPayload: Record<string, unknown>;
};

type PersistedBatchRow = {
  id: unknown;
  organization_id: unknown;
  provider: unknown;
  source_stream: unknown;
  provider_message_id: unknown;
  observed_at: unknown;
  received_at: unknown;
  payload_schema_version: unknown;
  normalized_payload: unknown;
  created: unknown;
};

function requireNonBlank(
  value: unknown,
  fieldName: string
): string {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(
      `${fieldName} is required.`
    );
  }

  return value.trim();
}

function requireTimestamp(
  value: unknown,
  fieldName: string
): string {
  const normalized =
    requireNonBlank(
      value,
      fieldName
    );

  const parsed =
    new Date(normalized);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid timestamp.`
    );
  }

  return parsed.toISOString();
}

function requirePayload(
  value: unknown,
  fieldName: string
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${fieldName} must be an object.`
    );
  }

  return value as Record<string, unknown>;
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
    value &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(
        value as Record<string, unknown>
      )
        .sort(
          ([left], [right]) =>
            left.localeCompare(right)
        )
        .map(
          ([key, child]) => [
            key,
            canonicalizeJson(child),
          ]
        )
    );
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

export async function
persistRouteSafetyProviderObservationsBatch({
  supabase,
  organizationId,
  provider,
  sourceStream,
  payloadSchemaVersion,
  observations,
}: {
  supabase: any;
  organizationId: string;
  provider: string;
  sourceStream: string;
  payloadSchemaVersion: string;
  observations:
    readonly PersistRouteSafetyProviderObservationBatchItem[];
}): Promise<
  Map<
    string,
    PersistedRouteSafetyProviderObservation
  >
> {
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

  const normalizedPayloadSchemaVersion =
    requireNonBlank(
      payloadSchemaVersion,
      "payloadSchemaVersion"
    );

  if (!Array.isArray(observations)) {
    throw new Error(
      "observations must be an array."
    );
  }

  if (observations.length === 0) {
    return new Map();
  }

  const seenProviderMessageIds =
    new Set<string>();

  const expectedByProviderMessageId =
    new Map<
      string,
      {
        observedAt: string;
        receivedAt: string;
        normalizedPayload:
          Record<string, unknown>;
      }
    >();

  const payload =
    observations.map(
      (
        observation,
        index
      ) => {
        const providerMessageId =
          requireNonBlank(
            observation.providerMessageId,
            `observations[${index}].providerMessageId`
          );

        if (
          seenProviderMessageIds.has(
            providerMessageId
          )
        ) {
          throw new Error(
            "Provider observation batch cannot contain duplicate provider message identities."
          );
        }

        seenProviderMessageIds.add(
          providerMessageId
        );

        const observedAt =
          requireTimestamp(
            observation.observedAt,
            `observations[${index}].observedAt`
          );

        const receivedAt =
          requireTimestamp(
            observation.receivedAt,
            `observations[${index}].receivedAt`
          );

        const normalizedPayload =
          requirePayload(
            observation.normalizedPayload,
            `observations[${index}].normalizedPayload`
          );

        expectedByProviderMessageId.set(
          providerMessageId,
          {
            observedAt,
            receivedAt,
            normalizedPayload,
          }
        );

        return {
          providerMessageId,
          observedAt,
          receivedAt,
          normalizedPayload,
        };
      }
    );

  const {
    data,
    error,
  } =
    await supabase.rpc(
      ROUTE_SAFETY_PROVIDER_OBSERVATIONS_BATCH_RPC,
      {
        p_organization_id:
          normalizedOrganizationId,
        p_provider:
          normalizedProvider,
        p_source_stream:
          normalizedSourceStream,
        p_payload_schema_version:
          normalizedPayloadSchemaVersion,
        p_observations:
          payload,
      }
    );

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "Provider observation batch RPC returned an invalid result."
    );
  }

  if (
    data.length !==
    payload.length
  ) {
    throw new Error(
      "Provider observation batch RPC returned an unexpected persisted row count."
    );
  }

  const result =
    new Map<
      string,
      PersistedRouteSafetyProviderObservation
    >();

  for (
    let index = 0;
    index < data.length;
    index += 1
  ) {
    const row =
      data[index] as PersistedBatchRow;

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
      Array.isArray(
        row.normalized_payload
      ) ||
      typeof row.created !== "boolean"
    ) {
      throw new Error(
        "Provider observation batch RPC returned an invalid persisted row."
      );
    }

    const expected =
      expectedByProviderMessageId.get(
        row.provider_message_id
      );

    if (!expected) {
      throw new Error(
        "Provider observation batch RPC returned an unexpected provider identity."
      );
    }

    const persistedObservedAt =
      requireTimestamp(
        row.observed_at,
        "persisted observedAt"
      );

    const persistedReceivedAt =
      requireTimestamp(
        row.received_at,
        "persisted receivedAt"
      );

    if (
      row.organization_id !==
        normalizedOrganizationId ||
      row.provider !==
        normalizedProvider ||
      row.source_stream !==
        normalizedSourceStream ||
      row.payload_schema_version !==
        normalizedPayloadSchemaVersion ||
      persistedObservedAt !==
        expected.observedAt ||
      canonicalJsonString(
        row.normalized_payload
      ) !==
        canonicalJsonString(
          expected.normalizedPayload
        )
    ) {
      throw new Error(
        "Provider observation batch persisted result does not match the requested immutable observation."
      );
    }

    if (
      row.created &&
      persistedReceivedAt !==
        expected.receivedAt
    ) {
      throw new Error(
        "New provider observation batch receipt time does not match the caller-owned receipt time."
      );
    }

    if (
      result.has(
        row.provider_message_id
      )
    ) {
      throw new Error(
        "Provider observation batch RPC returned duplicate provider identities."
      );
    }

    result.set(
      row.provider_message_id,
      {
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
          persistedObservedAt,

        receivedAt:
          persistedReceivedAt,

        payloadSchemaVersion:
          row.payload_schema_version,

        normalizedPayload:
          row.normalized_payload as
            Record<string, unknown>,

        created:
          row.created,
      }
    );
  }

  return result;
}