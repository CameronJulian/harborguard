import {
  buildRouteRiskShadowGoogleAlternativeRouteRequest,
  type BuildRouteRiskShadowGoogleAlternativeRouteRequestInput,
  type RouteRiskShadowGoogleAlternativeRouteRequest,
} from "./buildRouteRiskShadowGoogleAlternativeRouteRequest.ts";
import {
  executeRouteRiskShadowGoogleAlternativeRouteRequest,
  type ExecuteRouteRiskShadowGoogleAlternativeRouteRequestInput,
  type RouteRiskShadowGoogleAlternativeRouteExecution,
} from "./executeRouteRiskShadowGoogleAlternativeRouteRequest.ts";
import {
  buildRouteRiskShadowProviderRouteCandidateAdapter,
  type RouteRiskShadowProviderRouteCandidateAdapter,
} from "./buildRouteRiskShadowProviderRouteCandidateAdapter.ts";
import type { RouteEvidenceScopeSource } from "./buildRouteRiskShadowRouteEvidenceScope.ts";

export const ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_ORCHESTRATION_VERSION =
  "harborguard-route-risk-shadow-google-alternative-route-orchestration-v1" as const;

export type RouteRiskShadowGoogleAlternativeRouteOrchestrationFailure =
  | "request_unavailable"
  | "provider_execution_failed"
  | "provider_routes_unavailable";

export type OrchestrateRouteRiskShadowGoogleAlternativeRoutesInput =
  BuildRouteRiskShadowGoogleAlternativeRouteRequestInput &
    Pick<
      ExecuteRouteRiskShadowGoogleAlternativeRouteRequestInput,
      "apiKey" | "fetcher" | "timeoutMs" | "signal"
    > & {
      scopeSource: RouteEvidenceScopeSource;
      predictionCreatedAt: unknown;
    };

export type RouteRiskShadowGoogleAlternativeRouteOrchestration = {
  orchestrationVersion:
    typeof ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_ORCHESTRATION_VERSION;
  semantics:
    "DESCRIPTIVE_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_ORCHESTRATION";
  authority: "NON_AUTHORITATIVE";
  orchestrationState: "SUCCEEDED" | "PARTIAL" | "UNAVAILABLE";
  failure: RouteRiskShadowGoogleAlternativeRouteOrchestrationFailure | null;
  request: RouteRiskShadowGoogleAlternativeRouteRequest;
  execution: RouteRiskShadowGoogleAlternativeRouteExecution | null;
  adapter: RouteRiskShadowProviderRouteCandidateAdapter | null;
};

function result({
  orchestrationState,
  failure,
  request,
  execution,
  adapter,
}: Pick<
  RouteRiskShadowGoogleAlternativeRouteOrchestration,
  "orchestrationState" | "failure" | "request" | "execution" | "adapter"
>): RouteRiskShadowGoogleAlternativeRouteOrchestration {
  return {
    orchestrationVersion:
      ROUTE_RISK_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_ORCHESTRATION_VERSION,
    semantics:
      "DESCRIPTIVE_SHADOW_GOOGLE_ALTERNATIVE_ROUTE_ORCHESTRATION",
    authority: "NON_AUTHORITATIVE",
    orchestrationState,
    failure,
    request,
    execution,
    adapter,
  };
}

/** Composes B12, B13, and B11 without production integration or persistence. */
export async function orchestrateRouteRiskShadowGoogleAlternativeRoutes({
  origin,
  destination,
  apiKey,
  fetcher,
  timeoutMs,
  signal,
  scopeSource,
  predictionCreatedAt,
}: OrchestrateRouteRiskShadowGoogleAlternativeRoutesInput): Promise<RouteRiskShadowGoogleAlternativeRouteOrchestration> {
  const request = buildRouteRiskShadowGoogleAlternativeRouteRequest({
    origin,
    destination,
  });

  if (request.requestState !== "AVAILABLE") {
    return result({
      orchestrationState: "UNAVAILABLE",
      failure: "request_unavailable",
      request,
      execution: null,
      adapter: null,
    });
  }

  const execution = await executeRouteRiskShadowGoogleAlternativeRouteRequest({
    request,
    apiKey,
    fetcher,
    timeoutMs,
    signal,
  });

  if (execution.executionState !== "SUCCEEDED") {
    return result({
      orchestrationState: "UNAVAILABLE",
      failure: "provider_execution_failed",
      request,
      execution,
      adapter: null,
    });
  }

  const adapter = buildRouteRiskShadowProviderRouteCandidateAdapter({
    providerResponse: execution.providerResponse as {
      routes?: readonly unknown[];
    } | null | undefined,
    scopeSource,
    predictionCreatedAt,
  });

  if (adapter.adapterState === "UNAVAILABLE") {
    return result({
      orchestrationState: "UNAVAILABLE",
      failure: "provider_routes_unavailable",
      request,
      execution,
      adapter,
    });
  }

  return result({
    orchestrationState:
      adapter.adapterState === "PARTIAL" ? "PARTIAL" : "SUCCEEDED",
    failure: null,
    request,
    execution,
    adapter,
  });
}
