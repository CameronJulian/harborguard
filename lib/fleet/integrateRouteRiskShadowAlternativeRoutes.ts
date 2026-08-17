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
  orchestrate = orchestrateRouteRiskShadowGoogleAlternativeRoutes,
}: RouteRiskShadowAlternativeRouteIntegrationInput): RouteRiskShadowAlternativeRouteIntegration {
  const eligibility = buildRouteRiskShadowAlternativeRouteEligibility({
    policy,
    context,
  });

  if (eligibility.eligibilityState !== "ELIGIBLE") {
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

  const registration = registerRouteRiskShadowPostResponse({
    scheduler,
    task: async () => {
      const reservationResult: RouteRiskShadowProviderCapacityReservation =
        await reserveRouteRiskShadowProviderCapacity({ rpc, ...reservation });

      if (reservationResult.reservationState !== "RESERVED") {
        return;
      }

      try {
        await orchestrate(orchestration);
      } finally {
        const releaseResult: RouteRiskShadowProviderCapacityRelease =
          await releaseRouteRiskShadowProviderCapacity({ rpc, ...release });
        void releaseResult;
      }
    },
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
