export type RouteSafetyProviderSnapshotRpcError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

export type RouteSafetyProviderSnapshotRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>
  ) => Promise<{
    data: unknown;
    error: RouteSafetyProviderSnapshotRpcError | null;
  }>;
};

export type RouteSafetyProviderSnapshotAssertionInput = {
  providerMessageId: string;
  payloadSchemaVersion: string;
  eventObservedAt: string | null;
  providerObservationId: string | null;
  normalizedPayload: Record<string, unknown>;
};

export type PersistRouteSafetyProviderSnapshotRetrievalInput = {
  supabase: RouteSafetyProviderSnapshotRpcClient;
  organizationId: string;
  provider: string;
  sourceStream: string;
  snapshotIdentityKind: string;
  snapshotIdentityValue: string;
  providerSourceUpdatedAt: string | null;
  retrievalId: string;
  responseOriginatedAt: string | null;
  receivedAt: string;
  providerRequestId: string | null;
  assertions: RouteSafetyProviderSnapshotAssertionInput[];
};

export type PersistRouteSafetyProviderSnapshotRetrievalResult = {
  snapshotId: string;
  retrievalId: string;
  assertionCount: number;
};

const RPC_NAME =
  "persist_route_safety_provider_snapshot_retrieval";

function isRecord(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireNonBlank(
  value: string,
  field: string
): void {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    throw new Error(`${field} is required`);
  }
}

function describeRpcError(
  error: RouteSafetyProviderSnapshotRpcError
): string {
  const code =
    typeof error.code === "string" &&
    error.code.trim().length > 0
      ? ` [${error.code}]`
      : "";

  const message =
    typeof error.message === "string" &&
    error.message.trim().length > 0
      ? error.message
      : "unknown RPC error";

  const details =
    typeof error.details === "string" &&
    error.details.trim().length > 0
      ? ` ${error.details}`
      : "";

  return `${code}: ${message}${details}`;
}

function parseRpcResult(
  data: unknown,
  expectedRetrievalId: string
): PersistRouteSafetyProviderSnapshotRetrievalResult {
  if (
    !Array.isArray(data) ||
    data.length !== 1
  ) {
    throw new Error(
      "Atomic provider snapshot persistence RPC must return exactly one row"
    );
  }

  const row =
    data[0];

  if (!isRecord(row)) {
    throw new Error(
      "Atomic provider snapshot persistence RPC returned an invalid row"
    );
  }

  const snapshotId =
    row.persisted_snapshot_id;

  const retrievalId =
    row.persisted_retrieval_id;

  const assertionCount =
    row.persisted_assertion_count;

  if (
    typeof snapshotId !== "string" ||
    snapshotId.trim().length === 0
  ) {
    throw new Error(
      "Atomic provider snapshot persistence RPC returned an invalid snapshot id"
    );
  }

  if (
    typeof retrievalId !== "string" ||
    retrievalId.trim().length === 0
  ) {
    throw new Error(
      "Atomic provider snapshot persistence RPC returned an invalid retrieval id"
    );
  }

  if (
    retrievalId !== expectedRetrievalId
  ) {
    throw new Error(
      "Atomic provider snapshot persistence RPC returned a different retrieval id"
    );
  }

  if (
    typeof assertionCount !== "number" ||
    !Number.isInteger(assertionCount) ||
    assertionCount < 0
  ) {
    throw new Error(
      "Atomic provider snapshot persistence RPC returned an invalid assertion count"
    );
  }

  return {
    snapshotId,
    retrievalId,
    assertionCount,
  };
}

export async function persistRouteSafetyProviderSnapshotRetrieval(
  input: PersistRouteSafetyProviderSnapshotRetrievalInput
): Promise<PersistRouteSafetyProviderSnapshotRetrievalResult> {
  requireNonBlank(
    input.organizationId,
    "organizationId"
  );

  requireNonBlank(
    input.provider,
    "provider"
  );

  requireNonBlank(
    input.sourceStream,
    "sourceStream"
  );

  requireNonBlank(
    input.snapshotIdentityKind,
    "snapshotIdentityKind"
  );

  requireNonBlank(
    input.snapshotIdentityValue,
    "snapshotIdentityValue"
  );

  requireNonBlank(
    input.retrievalId,
    "retrievalId"
  );

  requireNonBlank(
    input.receivedAt,
    "receivedAt"
  );

  if (!Array.isArray(input.assertions)) {
    throw new Error(
      "assertions must be an array"
    );
  }

  const {
    data,
    error,
  } =
    await input.supabase.rpc(
      RPC_NAME,
      {
        p_organization_id:
          input.organizationId,

        p_provider:
          input.provider,

        p_source_stream:
          input.sourceStream,

        p_snapshot_identity_kind:
          input.snapshotIdentityKind,

        p_snapshot_identity_value:
          input.snapshotIdentityValue,

        p_provider_source_updated_at:
          input.providerSourceUpdatedAt,

        p_retrieval_id:
          input.retrievalId,

        p_response_originated_at:
          input.responseOriginatedAt,

        p_received_at:
          input.receivedAt,

        p_provider_request_id:
          input.providerRequestId,

        p_assertions:
          input.assertions.map(
            (assertion) => ({
              providerMessageId:
                assertion.providerMessageId,

              payloadSchemaVersion:
                assertion.payloadSchemaVersion,

              eventObservedAt:
                assertion.eventObservedAt,

              providerObservationId:
                assertion.providerObservationId,

              normalizedPayload:
                assertion.normalizedPayload,
            })
          ),
      }
    );

  if (error) {
    throw new Error(
      "Atomic provider snapshot persistence RPC failed" +
        describeRpcError(error)
    );
  }

  return parseRpcResult(
    data,
    input.retrievalId
  );
}