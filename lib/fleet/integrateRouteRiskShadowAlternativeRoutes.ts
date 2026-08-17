import {
  buildRouteRiskShadowAlternativeRouteEligibility,
  type BuildRouteRiskShadowAlternativeRouteEligibilityInput,
  type RouteRiskShadowAlternativeRouteEligibility,
} from "./buildRouteRiskShadowAlternativeRouteEligibility.ts";
import {
  orchestrateRouteRiskShadowGoogleAlternativeRoutes,
  type OrchestrateRouteRiskShadowGoogleAlternativeRoutesInput,
  type RouteRiskShadowGoogleAlternativeRouteOrchestration,
} from "./orchestrateRouteRiskShadowGoogleAlternativeRoutes.ts";
import {
  registerRouteRiskShadowPostResponse,
  type RouteRiskShadowPostResponseScheduler,
  type RouteRiskShadowPostResponseRegistration,
} from "./registerRouteRiskShadowPostResponse.ts";
import {
  releaseRouteRiskShadowProviderCapacity,
  reserveRouteRiskShadowProviderCapacity,
  type ReleaseRouteRiskShadowProviderCapacityInput,
  type ReserveRouteRiskShadowProviderCapacityInput,
  type RouteRiskShadowProviderCapacityRelease,
  type RouteRiskShadowProviderCapacityReservation,
} from "./reserveRouteRiskShadowProviderCapacity.ts";
import {
  recordRouteRiskShadowTelemetry,
  routeRiskShadowTelemetryNow,
  type RouteRiskShadowTelemetrySink,
} from "./recordRouteRiskShadowTelemetry.ts";

export const ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_INTEGRATION_VERSION =
  "harborguard-route-risk-shadow-alternative-route-integration-v1" as const;

export type RouteRiskShadowAlternativeRouteIntegrationState =
  | "NOT_ELIGIBLE"
  | "REGISTERED"
  | "UNAVAILABLE";

export type RouteRiskShadowAlternativeRouteIntegration = {
  integrationVersion:
    typeof ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_INTEGRATION_VERSION;
  semantics: "DESCRIPTIVE_SHADOW_ALTERNATIVE_ROUTE_INTEGRATION";
  authority: "NON_AUTHORITATIVE";
  integrationState: RouteRiskShadowAlternativeRouteIntegrationState;
  eligibility: RouteRiskShadowAlternativeRouteEligibility;
  registration: RouteRiskShadowPostResponseRegistration | null;
};

export type RouteRiskShadowAlternativeRouteIntegrationInput =
  BuildRouteRiskShadowAlternativeRouteEligibilityInput & {
    reservation: Omit<ReserveRouteRiskShadowProviderCapacityInput, "rpc">;
    release: Omit<ReleaseRouteRiskShadowProviderCapacityInput, "rpc">;
    rpc: ReserveRouteRiskShadowProviderCapacityInput["rpc"];
    orchestration: OrchestrateRouteRiskShadowGoogleAlternativeRoutesInput;
    scheduler?: RouteRiskShadowPostResponseScheduler;
    telemetrySink?: RouteRiskShadowTelemetrySink;
    telemetryEnvironment?: unknown;
    telemetryClock?: () => number;
    orchestrate?: (
      input: OrchestrateRouteRiskShadowGoogleAlternativeRoutesInput
    ) => Promise<RouteRiskShadowGoogleAlternativeRouteOrchestration>;
  };

function unavailable(
  eligibility: RouteRiskShadowAlternativeRouteEligibility,
  registration: RouteRiskShadowPostResponseRegistration | null
): RouteRiskShadowAlternativeRouteIntegration {
  return {
    integrationVersion:
      ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_INTEGRATION_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_ALTERNATIVE_ROUTE_INTEGRATION",
    authority: "NON_AUTHORITATIVE",
    integrationState: "UNAVAILABLE",
    eligibility,
    registration,
  };
}

/**
 * Connects eligibility, deferred lifecycle registration, capacity reservation,
 * and shadow orchestration. The production response never awaits the task.
 */
export function integrateRouteRiskShadowAlternativeRoutes({
  policy,
  context,
  reservation,
  release,
  rpc,
  orchestration,
  scheduler,
  telemetrySink,
  telemetryEnvironment,
  telemetryClock,
  orchestrate = orchestrateRouteRiskShadowGoogleAlternativeRoutes,
}: RouteRiskShadowAlternativeRouteIntegrationInput): RouteRiskShadowAlternativeRouteIntegration {
  const eligibility = buildRouteRiskShadowAlternativeRouteEligibility({
    policy,
    context,
  });

  const emit = (event: {
    stage: "eligibility" | "registration" | "reservation" | "orchestration" | "release";
    outcome: string;
    reason?: string | null;
    providerStatus?: number | null;
    durationMs?: number | null;
  }) =>
    recordRouteRiskShadowTelemetry({
      ...event,
      environment: telemetryEnvironment,
      organizationId: context.organizationId,
      reservationKey: reservation.reservationKey,
      clock: telemetryClock,
      sink: telemetrySink,
    });

  const now = () => {
    return routeRiskShadowTelemetryNow(telemetryClock);
  };

  if (eligibility.eligibilityState !== "ELIGIBLE") {
    emit({
      stage: "eligibility",
      outcome: eligibility.eligibilityState,
      reason: eligibility.reason,
    });
    return {
      integrationVersion:
        ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_INTEGRATION_VERSION,
      semantics: "DESCRIPTIVE_SHADOW_ALTERNATIVE_ROUTE_INTEGRATION",
      authority: "NON_AUTHORITATIVE",
      integrationState: "NOT_ELIGIBLE",
      eligibility,
      registration: null,
    };
  }

  emit({ stage: "eligibility", outcome: eligibility.eligibilityState });

  const registration = registerRouteRiskShadowPostResponse({
    scheduler,
    task: async () => {
      const startedAt = now();
      const reservationResult: RouteRiskShadowProviderCapacityReservation =
        await reserveRouteRiskShadowProviderCapacity({ rpc, ...reservation });

      emit({
        stage: "reservation",
        outcome: reservationResult.reservationState,
        reason: reservationResult.reason,
        durationMs: now() - startedAt,
      });

      if (reservationResult.reservationState !== "RESERVED") {
        return;
      }

      emit({ stage: "orchestration", outcome: "ATTEMPTED" });
      const orchestrationStartedAt = now();
      try {
        const orchestrationResult = await orchestrate(orchestration);
        emit({
          stage: "orchestration",
          outcome: orchestrationResult.orchestrationState,
          reason: orchestrationResult.failure,
          providerStatus: orchestrationResult.execution?.status,
          durationMs: now() - orchestrationStartedAt,
        });
      } catch {
        emit({
          stage: "orchestration",
          outcome: "THREW",
          reason: "unexpected_error",
          durationMs: now() - orchestrationStartedAt,
        });
        throw new Error("shadow orchestration failed");
      } finally {
        const releaseResult: RouteRiskShadowProviderCapacityRelease =
          await releaseRouteRiskShadowProviderCapacity({ rpc, ...release });
        emit({
          stage: "release",
          outcome: releaseResult.releaseState,
        });
        void releaseResult;
      }
    },
  });

  emit({
    stage: "registration",
    outcome: registration.registrationState,
    reason: registration.failure,
  });

  if (registration.registrationState !== "REGISTERED") {
    return unavailable(eligibility, registration);
  }

  return {
    integrationVersion:
      ROUTE_RISK_SHADOW_ALTERNATIVE_ROUTE_INTEGRATION_VERSION,
    semantics: "DESCRIPTIVE_SHADOW_ALTERNATIVE_ROUTE_INTEGRATION",
    authority: "NON_AUTHORITATIVE",
    integrationState: "REGISTERED",
    eligibility,
    registration,
  };
}
