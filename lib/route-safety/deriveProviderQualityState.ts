export type ProviderQualityState = {
  providerSources: string[];
  providerLastSeen: Record<string, string>;
  providerConfirmationCount: number;
  providerConfidence: number;
};

export type DeriveProviderQualityStateInput = {
  providerLastSeen: Record<string, unknown>;
  providerSources?: string[];
  primarySource: string;
  primarySourceBaseConfidence: number;
  staleBefore?: string;
};

function validTimestamp(
  value: unknown
): {
  iso: string;
  time: number;
} | null {
  const time =
    new Date(String(value)).getTime();

  if (!Number.isFinite(time)) {
    return null;
  }

  return {
    iso:
      new Date(time).toISOString(),
    time,
  };
}

function requireValidBaseConfidence(
  value: number
): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ) {
    throw new Error(
      "primarySourceBaseConfidence must be between 0 and 100."
    );
  }

  return value;
}

export function deriveProviderQualityState({
  providerLastSeen,
  providerSources: inputProviderSources,
  primarySource,
  primarySourceBaseConfidence,
  staleBefore,
}: DeriveProviderQualityStateInput): ProviderQualityState {
  const normalizedPrimarySource =
    primarySource.trim();

  if (!normalizedPrimarySource) {
    throw new Error(
      "primarySource is required."
    );
  }

  const baseConfidence =
    requireValidBaseConfidence(
      primarySourceBaseConfidence
    );

  const staleBoundary =
    staleBefore === undefined
      ? null
      : validTimestamp(staleBefore);

  if (
    staleBefore !== undefined &&
    staleBoundary === null
  ) {
    throw new Error(
      "staleBefore must be a valid timestamp."
    );
  }

  const retainedEntries =
    Object.entries(providerLastSeen)
      .map(([provider, value]) => {
        const normalizedProvider =
          provider.trim();

        const timestamp =
          validTimestamp(value);

        if (
          !normalizedProvider ||
          timestamp === null
        ) {
          return null;
        }

        if (
          staleBoundary !== null &&
          timestamp.time < staleBoundary.time
        ) {
          return null;
        }

        return [
          normalizedProvider,
          timestamp.iso,
        ] as const;
      })
      .filter(
        (
          entry
        ): entry is readonly [string, string] =>
          entry !== null
      );

  const validProviderLastSeen =
    Object.fromEntries(
      retainedEntries
    );

  const validLastSeenSources =
    new Set(
      retainedEntries.map(
        ([provider]) => provider
      )
    );

  const requestedProviderSources =
    inputProviderSources === undefined
      ? Array.from(validLastSeenSources)
      : Array.from(
          new Set(
            inputProviderSources
              .map((provider) =>
                provider.trim()
              )
              .filter(Boolean)
          )
        );

  const providerSources =
    staleBoundary === null
      ? requestedProviderSources
      : requestedProviderSources.filter(
          (provider) =>
            validLastSeenSources.has(provider)
        );

  const providerLastSeenResult =
    staleBoundary === null
      ? validProviderLastSeen
      : Object.fromEntries(
          retainedEntries.filter(
            ([provider]) =>
              providerSources.includes(provider)
          )
        );

  const providerConfirmationCount =
    providerSources.length;

  if (providerConfirmationCount === 0) {
    return {
      providerSources: [],
      providerLastSeen: {},
      providerConfirmationCount: 0,
      providerConfidence: 0,
    };
  }

  const providerConfidence =
    providerConfirmationCount === 1
      ? baseConfidence
      : Math.min(
          100,
          60 +
            Math.max(
              0,
              providerConfirmationCount - 1
            ) *
              20
        );

  return {
    providerSources,
    providerLastSeen:
      providerLastSeenResult,
    providerConfirmationCount,
    providerConfidence,
  };
}
