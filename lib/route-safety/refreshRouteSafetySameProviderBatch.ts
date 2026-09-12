export const
  ROUTE_SAFETY_SAME_PROVIDER_BATCH_RPC =
    "refresh_route_safety_same_provider_batch" as const;

export type RouteSafetySameProviderRefreshInput = {
  inputIndex: number;
  alertId: string;
  expiresAt: string | null;
  roadName: string | null;
};

export type RouteSafetySameProviderRefreshResult = {
  inputIndex: number;
  alertId: string;
  providerSources: string[];
  providerLastSeen: Record<string, string>;
  providerConfirmationCount: number;
  providerConfidence: number;
};

type RouteSafetySameProviderBatchRpcRow = {
  input_index: unknown;
  alert_id: unknown;
  provider_sources: unknown;
  provider_last_seen: unknown;
  provider_confirmation_count: unknown;
  provider_confidence: unknown;
};

function requireNonBlankString(
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

function requireNonNegativeInteger(
  value: unknown,
  fieldName: string
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0
  ) {
    throw new Error(
      `${fieldName} must be a non-negative integer.`
    );
  }

  return value;
}

function requireBaseConfidence(
  value: unknown
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error(
      "baseConfidence must be a finite number between 0 and 100."
    );
  }

  return value;
}

function normalizeOptionalTimestamp(
  value: unknown,
  fieldName: string
): string | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      `${fieldName} must be a timestamp string or null.`
    );
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    throw new Error(
      `${fieldName} must be a valid timestamp or null.`
    );
  }

  return parsed.toISOString();
}

function normalizeOptionalRoadName(
  value: unknown,
  fieldName: string
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(
      `${fieldName} must be a string or null.`
    );
  }

  const normalized =
    value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function requireStringArray(
  value: unknown,
  fieldName: string
): string[] {
  if (
    !Array.isArray(value) ||
    value.some(
      (entry) =>
        typeof entry !== "string" ||
        entry.trim().length === 0
    )
  ) {
    throw new Error(
      `${fieldName} must be an array of non-empty strings.`
    );
  }

  return value.map(
    (entry) =>
      entry.trim()
  );
}

function requireStringRecord(
  value: unknown,
  fieldName: string
): Record<string, string> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${fieldName} must be an object.`
    );
  }

  const record =
    value as Record<string, unknown>;

  for (
    const [key, entry]
    of Object.entries(record)
  ) {
    if (
      typeof entry !== "string"
    ) {
      throw new Error(
        `${fieldName}.${key} must be a string.`
      );
    }
  }

  return record as Record<string, string>;
}

function requireNumber(
  value: unknown,
  fieldName: string
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `${fieldName} must be a finite number.`
    );
  }

  return value;
}

export async function
refreshRouteSafetySameProviderBatch({
  supabase,
  organizationId,
  source,
  baseConfidence,
  refreshes,
}: {
  supabase: any;
  organizationId: string;
  source: string;
  baseConfidence: number;
  refreshes:
    readonly RouteSafetySameProviderRefreshInput[];
}): Promise<RouteSafetySameProviderRefreshResult[]> {
  const normalizedOrganizationId =
    requireNonBlankString(
      organizationId,
      "organizationId"
    );

  const normalizedSource =
    requireNonBlankString(
      source,
      "source"
    );

  const normalizedBaseConfidence =
    requireBaseConfidence(
      baseConfidence
    );

  if (!Array.isArray(refreshes)) {
    throw new Error(
      "refreshes must be an array."
    );
  }

  if (refreshes.length === 0) {
    return [];
  }

  const seenInputIndexes =
    new Set<number>();

  const expectedByInputIndex =
    new Map<
      number,
      {
        alertId: string;
      }
    >();

  const payload =
    refreshes.map(
      (
        refresh,
        index
      ) => {
        const inputIndex =
          requireNonNegativeInteger(
            refresh.inputIndex,
            `refreshes[${index}].inputIndex`
          );

        if (
          seenInputIndexes.has(
            inputIndex
          )
        ) {
          throw new Error(
            "Same-provider refresh batch cannot contain duplicate inputIndex values."
          );
        }

        seenInputIndexes.add(
          inputIndex
        );

        const alertId =
          requireNonBlankString(
            refresh.alertId,
            `refreshes[${index}].alertId`
          );

        const expiresAt =
          normalizeOptionalTimestamp(
            refresh.expiresAt,
            `refreshes[${index}].expiresAt`
          );

        const roadName =
          normalizeOptionalRoadName(
            refresh.roadName,
            `refreshes[${index}].roadName`
          );

        expectedByInputIndex.set(
          inputIndex,
          {
            alertId,
          }
        );

        return {
          inputIndex,
          alertId,
          expiresAt,
          roadName,
        };
      }
    );

  const {
    data,
    error,
  } =
    await supabase.rpc(
      ROUTE_SAFETY_SAME_PROVIDER_BATCH_RPC,
      {
        p_organization_id:
          normalizedOrganizationId,

        p_source:
          normalizedSource,

        p_base_confidence:
          normalizedBaseConfidence,

        p_refreshes:
          payload,
      }
    );

  if (error) {
    throw error;
  }

  if (!Array.isArray(data)) {
    throw new Error(
      "Same-provider refresh batch RPC returned an invalid result."
    );
  }

  if (
    data.length !==
    payload.length
  ) {
    throw new Error(
      "Same-provider refresh batch RPC returned an unexpected row count."
    );
  }

  const results: RouteSafetySameProviderRefreshResult[] =
    [];

  const returnedInputIndexes =
    new Set<number>();

  for (
    let rowIndex = 0;
    rowIndex < data.length;
    rowIndex += 1
  ) {
    const row =
      data[rowIndex] as
        RouteSafetySameProviderBatchRpcRow;

    const inputIndex =
      requireNonNegativeInteger(
        row.input_index,
        `data[${rowIndex}].input_index`
      );

    if (
      returnedInputIndexes.has(
        inputIndex
      )
    ) {
      throw new Error(
        "Same-provider refresh batch RPC returned duplicate inputIndex values."
      );
    }

    returnedInputIndexes.add(
      inputIndex
    );

    const expected =
      expectedByInputIndex.get(
        inputIndex
      );

    if (!expected) {
      throw new Error(
        "Same-provider refresh batch RPC returned an unexpected inputIndex."
      );
    }

    const alertId =
      requireNonBlankString(
        row.alert_id,
        `data[${rowIndex}].alert_id`
      );

    if (
      alertId !==
      expected.alertId
    ) {
      throw new Error(
        "Same-provider refresh batch RPC returned an unexpected alertId."
      );
    }

    const providerSources =
      requireStringArray(
        row.provider_sources,
        `data[${rowIndex}].provider_sources`
      );

    if (
      providerSources.length !== 1 ||
      providerSources[0] !==
        normalizedSource
    ) {
      throw new Error(
        "Same-provider refresh batch RPC returned unexpected provider sources."
      );
    }

    const providerLastSeen =
      requireStringRecord(
        row.provider_last_seen,
        `data[${rowIndex}].provider_last_seen`
      );

    if (
      typeof providerLastSeen[
        normalizedSource
      ] !== "string"
    ) {
      throw new Error(
        "Same-provider refresh batch RPC result is missing the source last-seen timestamp."
      );
    }

    const providerConfirmationCount =
      requireNumber(
        row.provider_confirmation_count,
        `data[${rowIndex}].provider_confirmation_count`
      );

    if (
      providerConfirmationCount !== 1
    ) {
      throw new Error(
        "Same-provider refresh batch RPC returned an unexpected provider confirmation count."
      );
    }

    const providerConfidence =
      requireNumber(
        row.provider_confidence,
        `data[${rowIndex}].provider_confidence`
      );

    results.push({
      inputIndex,
      alertId,
      providerSources,
      providerLastSeen,
      providerConfirmationCount,
      providerConfidence,
    });
  }

  results.sort(
    (left, right) =>
      left.inputIndex -
      right.inputIndex
  );

  return results;
}