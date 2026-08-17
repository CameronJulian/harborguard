import { createHash } from "crypto";

export const ROUTE_RISK_SHADOW_TELEMETRY_VERSION =
  "harborguard-route-risk-shadow-telemetry-v1" as const;

export type RouteRiskShadowTelemetryStage =
  | "eligibility"
  | "registration"
  | "reservation"
  | "orchestration"
  | "release";

export type RouteRiskShadowTelemetryEvent = {
  eventName: "route_risk_shadow";
  telemetryVersion: typeof ROUTE_RISK_SHADOW_TELEMETRY_VERSION;
  authority: "NON_AUTHORITATIVE";
  stage: RouteRiskShadowTelemetryStage;
  outcome: string;
  reason: string | null;
  environment: string;
  organizationToken: string | null;
  reservationToken: string | null;
  providerStatus: number | null;
  durationMs: number | null;
  observedAt: string;
};

export type RouteRiskShadowTelemetrySink = (
  event: RouteRiskShadowTelemetryEvent
) => void;

export type RecordRouteRiskShadowTelemetryInput = {
  stage: RouteRiskShadowTelemetryStage;
  outcome: unknown;
  reason?: unknown;
  environment?: unknown;
  organizationId?: unknown;
  reservationKey?: unknown;
  providerStatus?: unknown;
  durationMs?: unknown;
  clock?: () => number;
  sink?: RouteRiskShadowTelemetrySink;
};

export function routeRiskShadowTelemetryNow(clock?: () => number): number {
  try {
    return typeof clock === "function" ? clock() : Date.now();
  } catch {
    return Date.now();
  }
}

function safeCategory(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z0-9_:-]{1,64}$/i.test(value)) {
    return "unknown";
  }

  return value;
}

function safeEnvironment(value: unknown): string {
  if (
    value === "production" ||
    value === "preview" ||
    value === "development" ||
    value === "test"
  ) {
    return value;
  }

  return "unknown";
}

function token(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function safeStatus(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value)
    ? value
    : null;
}

function safeDuration(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : null;
}

/** Emits one safe, descriptive event. Telemetry failure is always swallowed. */
export function recordRouteRiskShadowTelemetry({
  stage,
  outcome,
  reason = null,
  environment = "unknown",
  organizationId,
  reservationKey,
  providerStatus = null,
  durationMs = null,
  clock = Date.now,
  sink = (event) => {
    console.info("[route-risk-shadow]", JSON.stringify(event));
  },
}: RecordRouteRiskShadowTelemetryInput): void {
  try {
    const observedAt = new Date(routeRiskShadowTelemetryNow(clock)).toISOString();
    sink({
      eventName: "route_risk_shadow",
      telemetryVersion: ROUTE_RISK_SHADOW_TELEMETRY_VERSION,
      authority: "NON_AUTHORITATIVE",
      stage,
      outcome: safeCategory(outcome),
      reason: reason === null ? null : safeCategory(reason),
      environment: safeEnvironment(environment),
      organizationToken: token(organizationId),
      reservationToken: token(reservationKey),
      providerStatus: safeStatus(providerStatus),
      durationMs: safeDuration(durationMs),
      observedAt,
    });
  } catch {
    // Logging must never affect shadow control flow or production responses.
  }
}
