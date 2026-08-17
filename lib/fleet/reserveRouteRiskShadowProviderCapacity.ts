export const ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_VERSION =
  "harborguard-route-risk-shadow-provider-capacity-v1" as const;

export const ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_RESERVE_RPC =
  "reserve_route_risk_shadow_provider_capacity" as const;

export const ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_RELEASE_RPC =
  "release_route_risk_shadow_provider_capacity" as const;

export type RouteRiskShadowProviderCapacityDenialReason =
  | "invalid_configuration"
  | "global_capacity_exhausted"
  | "organization_capacity_exhausted"
  | "global_concurrency_exhausted"
  | "organization_concurrency_exhausted"
  | "duplicate_reservation";

export type RouteRiskShadowProviderCapacityReservation = {
  capacityVersion: typeof ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_VERSION;
  semantics: "DESCRIPTIVE_SHADOW_PROVIDER_CAPACITY_RESERVATION";
  authority: "NON_AUTHORITATIVE";
  reservationState: "RESERVED" | "DENIED" | "UNAVAILABLE";
  reason:
    | RouteRiskShadowProviderCapacityDenialReason
    | "persistence_unavailable"
    | null;
  reservationKey: string | null;
};

export type RouteRiskShadowProviderCapacityRelease = {
  capacityVersion: typeof ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_VERSION;
  semantics: "DESCRIPTIVE_SHADOW_PROVIDER_CAPACITY_RELEASE";
  authority: "NON_AUTHORITATIVE";
  releaseState: "RELEASED" | "NOT_FOUND" | "UNAVAILABLE";
};

export type RouteRiskShadowProviderCapacityRpc = (
  functionName: string,
  args: Record<string, unknown>
) => Promise<{ data: unknown; error: unknown }>;

export type ReserveRouteRiskShadowProviderCapacityInput = {
  rpc: RouteRiskShadowProviderCapacityRpc;
  reservationKey: unknown;
  organizationId: unknown;
  configuration: {
    windowSeconds: unknown;
    leaseSeconds: unknown;
    globalCallLimit: unknown;
    organizationCallLimit: unknown;
    globalConcurrencyLimit: unknown;
    organizationConcurrencyLimit: unknown;
  };
};

export type ReleaseRouteRiskShadowProviderCapacityInput = {
  rpc: RouteRiskShadowProviderCapacityRpc;
  reservationKey: unknown;
};

const denialReasons = new Set<string>([
  "invalid_configuration",
  "global_capacity_exhausted",
  "organization_capacity_exhausted",
  "global_concurrency_exhausted",
  "organization_concurrency_exhausted",
  "duplicate_reservation",
]);

function unavailableReservation(): RouteRiskShadowProviderCapacityReservation {
  return {
    capacityVersion: ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_PROVIDER_CAPACITY_RESERVATION",
    authority: "NON_AUTHORITATIVE",
    reservationState: "UNAVAILABLE",
    reason: "persistence_unavailable",
    reservationKey: null,
  };
}

function validPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function responseRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) {
    const first = data[0];
    return first && typeof first === "object"
      ? (first as Record<string, unknown>)
      : null;
  }

  return data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : null;
}

/** Atomically asks shared persistence to reserve one future provider call. */
export async function reserveRouteRiskShadowProviderCapacity({
  rpc,
  reservationKey,
  organizationId,
  configuration,
}: ReserveRouteRiskShadowProviderCapacityInput): Promise<RouteRiskShadowProviderCapacityReservation> {
  if (
    typeof reservationKey !== "string" ||
    reservationKey.length === 0 ||
    typeof organizationId !== "string" ||
    organizationId.length === 0 ||
    !validPositiveInteger(configuration.windowSeconds) ||
    !validPositiveInteger(configuration.leaseSeconds) ||
    !validPositiveInteger(configuration.globalCallLimit) ||
    !validPositiveInteger(configuration.organizationCallLimit) ||
    !validPositiveInteger(configuration.globalConcurrencyLimit) ||
    !validPositiveInteger(configuration.organizationConcurrencyLimit)
  ) {
    return {
      ...unavailableReservation(),
      reservationState: "DENIED",
      reason: "invalid_configuration",
    };
  }

  try {
    const { data, error } = await rpc(
      ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_RESERVE_RPC,
      {
        p_reservation_key: reservationKey,
        p_organization_id: organizationId,
        p_window_seconds: configuration.windowSeconds,
        p_lease_seconds: configuration.leaseSeconds,
        p_global_call_limit: configuration.globalCallLimit,
        p_organization_call_limit: configuration.organizationCallLimit,
        p_global_concurrency_limit: configuration.globalConcurrencyLimit,
        p_organization_concurrency_limit:
          configuration.organizationConcurrencyLimit,
      }
    );

    if (error) {
      return unavailableReservation();
    }

    const row = responseRow(data);
    const state = row?.reservation_state;
    const reason = row?.reason;

    if (
      state === "RESERVED" &&
      row?.returned_reservation_key === reservationKey
    ) {
      return {
        capacityVersion: ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_VERSION,
        semantics: "DESCRIPTIVE_SHADOW_PROVIDER_CAPACITY_RESERVATION",
        authority: "NON_AUTHORITATIVE",
        reservationState: "RESERVED",
        reason: null,
        reservationKey,
      };
    }

    if (
      state === "DENIED" &&
      typeof reason === "string" &&
      denialReasons.has(reason)
    ) {
      return {
        capacityVersion: ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_VERSION,
        semantics: "DESCRIPTIVE_SHADOW_PROVIDER_CAPACITY_RESERVATION",
        authority: "NON_AUTHORITATIVE",
        reservationState: "DENIED",
        reason: reason as RouteRiskShadowProviderCapacityDenialReason,
        reservationKey: null,
      };
    }

    return unavailableReservation();
  } catch {
    return unavailableReservation();
  }
}

/** Releases temporary in-flight capacity; usage remains counted in its window. */
export async function releaseRouteRiskShadowProviderCapacity({
  rpc,
  reservationKey,
}: ReleaseRouteRiskShadowProviderCapacityInput): Promise<RouteRiskShadowProviderCapacityRelease> {
  const unavailable: RouteRiskShadowProviderCapacityRelease = {
    capacityVersion: ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_PROVIDER_CAPACITY_RELEASE",
    authority: "NON_AUTHORITATIVE",
    releaseState: "UNAVAILABLE",
  };

  if (typeof reservationKey !== "string" || reservationKey.length === 0) {
    return unavailable;
  }

  try {
    const { data, error } = await rpc(
      ROUTE_RISK_SHADOW_PROVIDER_CAPACITY_RELEASE_RPC,
      { p_reservation_key: reservationKey }
    );

    if (error) {
      return unavailable;
    }

    const row = responseRow(data);
    if (row?.release_state === "RELEASED") {
      return { ...unavailable, releaseState: "RELEASED" };
    }

    if (row?.release_state === "NOT_FOUND") {
      return { ...unavailable, releaseState: "NOT_FOUND" };
    }

    return unavailable;
  } catch {
    return unavailable;
  }
}
